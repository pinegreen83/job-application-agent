import { invoke } from '@tauri-apps/api/core';
import { nativeAvailable, syntheticId } from './ipc';
import { loadSyntheticRecord } from './storage-ipc';
import type { BoundaryCheck } from './ipc';

export const operations = ['analyze', 'evaluate', 'generate', 'review'] as const;
export type Operation = typeof operations[number];
export const scenarios = ['success', 'connection_error', 'network_error', 'quota_exceeded', 'incomplete_response', 'wait_for_cancel'] as const;
export type Scenario = typeof scenarios[number];
export type Model = 'mock-synthetic-v1' | 'mock-unsupported';
export interface MockInput { operation: Operation; modelId: Model; scenario: Scenario }
export interface Ticket { requestId: string; operation: Operation }
const messages = {
  NATIVE_UNAVAILABLE: '합성 Mock은 Tauri 앱에서만 실행할 수 있습니다.',
  INVALID_MOCK_REQUEST: '합성 Mock 요청의 형식과 선택값을 확인해 주세요.',
  MOCK_BUSY: '진행 중인 합성 요청을 먼저 완료하거나 취소해 주세요.',
  UNKNOWN_REQUEST: '현재 합성 요청을 찾을 수 없습니다.',
  NOT_RUNNING: '이미 종료된 합성 요청은 취소할 수 없습니다.',
  MOCK_UNAVAILABLE: '합성 Mock 상태를 확인할 수 없습니다.',
  CONNECTION_ERROR: '합성 공급자 연결 오류입니다.',
  NETWORK_ERROR: '합성 네트워크 오류입니다.',
  QUOTA_EXCEEDED: '합성 요청 한도 오류입니다.',
  UNSUPPORTED_MODEL: '지원하지 않는 가상 모델입니다.',
  INCOMPLETE_RESPONSE: '합성 응답이 불완전하여 완료 결과로 처리하지 않았습니다.',
  CANCELLED: '합성 요청을 취소했습니다. 기존 저장본은 변경하지 않았습니다.',
  IPC_FAILED: '합성 Mock 결과를 확인하지 못했습니다. 앱에서 다시 확인해 주세요.',
};
export type MockCode = keyof typeof messages;
export interface MockError { code: MockCode; message: string }
type ApiResult<T> = { ok: true; value: T } | { ok: false; error: MockError };
export type Outcome = Ticket & (
  { status: 'succeeded'; summary: string }
  | { status: 'failed' | 'cancelled'; error: MockError }
);
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function errorFrom(value: unknown): MockError {
  const code = object(value) && typeof value.code === 'string' && Object.hasOwn(messages, value.code) ? value.code as MockCode : 'IPC_FAILED';
  return { code, message: messages[code] }; // Never display/log raw native details.
}
const failed = (error: unknown) => ({ ok: false as const, error: errorFrom(error) });

export async function startMock(input: MockInput): Promise<ApiResult<Ticket>> {
  if (!nativeAvailable()) return failed({ code: 'NATIVE_UNAVAILABLE' });
  try {
    const value: unknown = await invoke('m0_start_mock', { request: { sourceId: syntheticId, ...input } });
    if (!object(value) || !uuid(value.requestId) || value.operation !== input.operation) return failed(null);
    return { ok: true, value: { requestId: value.requestId, operation: input.operation } };
  } catch (error: unknown) { return failed(error); }
}
export async function readMock(ticket: Ticket): Promise<ApiResult<Outcome>> {
  if (!nativeAvailable()) return failed({ code: 'NATIVE_UNAVAILABLE' });
  try {
    const value: unknown = await invoke('m0_mock_result', { requestId: ticket.requestId });
    if (!object(value) || value.requestId !== ticket.requestId || value.operation !== ticket.operation) return failed(null);
    if (value.status === 'succeeded') {
      const result = value.result;
      if (!object(result) || result.synthetic !== true || result.modelId !== 'mock-synthetic-v1' || result.promptVersion !== 'm0-mock-v1'
        || !object(result.output) || result.output.kind !== ticket.operation || result.output.sourceId !== syntheticId
        || typeof result.output.summary !== 'string' || !result.output.summary.trim() || [...result.output.summary].length > 256) return failed(null);
      return { ok: true, value: { ...ticket, status: 'succeeded', summary: result.output.summary } };
    }
    if (value.status !== 'failed' && value.status !== 'cancelled') return failed(null);
    const error = errorFrom(value.error);
    const allowed = value.status === 'cancelled' ? error.code === 'CANCELLED'
      : ['CONNECTION_ERROR', 'NETWORK_ERROR', 'QUOTA_EXCEEDED', 'UNSUPPORTED_MODEL', 'INCOMPLETE_RESPONSE'].includes(error.code);
    if (!allowed || 'result' in value) return failed(null);
    return { ok: true, value: { ...ticket, status: value.status, error } };
  } catch (error: unknown) { return failed(error); }
}
export async function cancelMock(ticket: Ticket): Promise<ApiResult<Ticket>> {
  if (!nativeAvailable()) return failed({ code: 'NATIVE_UNAVAILABLE' });
  try {
    const value: unknown = await invoke('m0_cancel_mock', { requestId: ticket.requestId });
    if (!object(value) || value.requestId !== ticket.requestId || value.operation !== ticket.operation) return failed(null);
    return { ok: true, value: ticket };
  } catch (error: unknown) { return failed(error); }
}

/** Fixed native probes; only reads the existing DB, never saves a Mock result. */
export async function checkMockContract(): Promise<BoundaryCheck[]> {
  const before = await loadSyntheticRecord();
  if (!before.ok) return [{ name: '기존 저장본 읽기', passed: false }];
  const unchanged = async () => {
    const after = await loadSyntheticRecord();
    return after.ok && JSON.stringify(after.value) === JSON.stringify(before.value);
  };
  const checks: BoundaryCheck[] = [];
  let previous: Ticket | undefined;
  for (const operation of operations) {
    const started = await startMock({ operation, modelId: 'mock-synthetic-v1', scenario: 'success' });
    if (!started.ok) { checks.push({ name: `${operation} 정상·저장본 보존`, passed: false }); continue; }
    const current = started.value;
    const result = await readMock(current);
    const cancelled = await cancelMock(current);
    const old = previous ? await readMock(previous) : undefined;
    checks.push({ name: `${operation} 정상·저장본 보존`, passed: result.ok && result.value.status === 'succeeded'
      && !cancelled.ok && cancelled.error.code === 'NOT_RUNNING' && (!old || (!old.ok && old.error.code === 'UNKNOWN_REQUEST')) && await unchanged() });
    previous = current;
  }
  for (const [scenario, modelId, code] of [
    ['connection_error', 'mock-synthetic-v1', 'CONNECTION_ERROR'], ['network_error', 'mock-synthetic-v1', 'NETWORK_ERROR'],
    ['quota_exceeded', 'mock-synthetic-v1', 'QUOTA_EXCEEDED'], ['success', 'mock-unsupported', 'UNSUPPORTED_MODEL'],
    ['incomplete_response', 'mock-synthetic-v1', 'INCOMPLETE_RESPONSE'],
  ] as const) {
    const started = await startMock({ operation: 'generate', modelId, scenario });
    const result = started.ok ? await readMock(started.value) : undefined;
    checks.push({ name: `${code}·저장본 보존`, passed: !!result?.ok && result.value.status === 'failed' && result.value.error.code === code && await unchanged() });
  }
  const started = await startMock({ operation: 'review', modelId: 'mock-synthetic-v1', scenario: 'wait_for_cancel' });
  if (!started.ok) return [...checks, { name: '실제 취소·중복 시작 거부·저장본 보존', passed: false }];
  const pending = readMock(started.value);
  const duplicate = await startMock({ operation: 'analyze', modelId: 'mock-synthetic-v1', scenario: 'success' });
  const cancelled = await cancelMock(started.value);
  if (!cancelled.ok) return [...checks, { name: '실제 취소·중복 시작 거부·저장본 보존', passed: false }];
  const result = await pending;
  const unknown = await readMock({ requestId: '00000000-0000-0000-0000-000000000000', operation: 'review' });
  checks.push({ name: '실제 취소·중복 시작 거부·저장본 보존', passed: !duplicate.ok && duplicate.error.code === 'MOCK_BUSY'
    && result.ok && result.value.status === 'cancelled' && result.value.error.code === 'CANCELLED'
    && !unknown.ok && unknown.error.code === 'UNKNOWN_REQUEST' && await unchanged() });
  return checks;
}
