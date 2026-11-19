import { invoke, isTauri } from '@tauri-apps/api/core';

export const syntheticId = 'synthetic-m0-001';
export const nativeAvailable = () => isTauri();
export interface ValidatedRecord { id: typeof syntheticId; text: string; status: 'validated' }
type FailureCode = 'NATIVE_UNAVAILABLE' | 'INVALID_RECORD' | 'IPC_FAILED';
export type ValidationResult = { ok: true; record: ValidatedRecord } | { ok: false; code: FailureCode; message: string };
const messages: Record<FailureCode, string> = {
  NATIVE_UNAVAILABLE: '브라우저에서는 Rust 검증을 실행할 수 없습니다. Tauri 앱에서 확인해 주세요.',
  INVALID_RECORD: '합성 레코드의 형식과 입력 범위를 확인해 주세요.',
  IPC_FAILED: 'Rust 검증을 완료하지 못했습니다. 앱에서 다시 시도해 주세요.',
};

async function boundedInvoke(command: string, args: Record<string, unknown>): Promise<unknown> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      invoke<unknown>(command, args),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('IPC timeout')), 5000); }),
    ]);
  } finally { clearTimeout(timeout); }
}

export async function validateSyntheticRecord(text: string): Promise<ValidationResult> {
  if (!nativeAvailable()) return { ok: false, code: 'NATIVE_UNAVAILABLE', message: messages.NATIVE_UNAVAILABLE };
  try {
    const response = await boundedInvoke('m0_validate_record', { record: { id: syntheticId, text } });
    if (typeof response !== 'object' || response === null || !('id' in response) || response.id !== syntheticId
      || !('text' in response) || response.text !== text || !('status' in response) || response.status !== 'validated') {
      throw new Error('Invalid IPC response');
    }
    return { ok: true, record: { id: syntheticId, text, status: 'validated' } };
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error && error.code === 'INVALID_RECORD' ? 'INVALID_RECORD' : 'IPC_FAILED';
    // Never display/log native exception text, unknown field names, or payloads.
    return { ok: false, code, message: messages[code] };
  }
}

export interface BoundaryCheck { name: string; passed: boolean }
/** Fixed synthetic probes only. No paths, environment values, or real user data. */
export async function checkNativeBoundaries(): Promise<BoundaryCheck[]> {
  if (!nativeAvailable()) return [{ name: 'Tauri 앱 실행', passed: false }];
  const checks: BoundaryCheck[] = [];
  const valid = await validateSyntheticRecord('합성 IPC 🦀');
  checks.push({ name: '허용 명령 성공', passed: valid.ok });
  const invalidBodies: [string, Record<string, unknown>][] = [
    ['필수 필드 누락 거부', {}],
    ['잘못된 타입 거부', { record: { id: syntheticId, text: 42 } }],
    ['빈 입력 거부', { record: { id: syntheticId, text: '' } }],
    ['초과 길이 거부', { record: { id: syntheticId, text: '🦀'.repeat(257) } }],
    ['제어 문자 거부', { record: { id: syntheticId, text: 'test\n' } }],
    ['허용하지 않은 ID 거부', { record: { id: 'other', text: '합성' } }],
    ['추가 필드·합성 비밀 반사 거부', { record: { id: syntheticId, text: '합성', extra: 'synthetic-secret-never-reflect' } }],
  ];
  for (const [name, body] of invalidBodies) {
    let passed = false;
    try { await boundedInvoke('m0_validate_record', body); }
    catch (error: unknown) {
      passed = typeof error === 'object' && error !== null && 'code' in error && error.code === 'INVALID_RECORD'
        && 'message' in error && error.message === messages.INVALID_RECORD
        && Object.keys(error).sort().join(',') === 'code,message';
    }
    checks.push({ name, passed });
  }
  for (const [name, command] of [
    ['등록된 core 명령 권한 거부', 'plugin:app|version'],
    ['파일 명령 거부', 'plugin:fs|read_text_file'],
    ['셸 명령 거부', 'plugin:shell|execute'],
    ['미등록 명령 거부', 'm0_unregistered'],
  ]) {
    let passed = false;
    try { await boundedInvoke(command, {}); }
    catch (error: unknown) { passed = typeof error === 'string' && error.includes('not allowed'); }
    checks.push({ name, passed });
  }
  return checks;
}
