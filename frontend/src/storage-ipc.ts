import { invoke } from '@tauri-apps/api/core';
import { nativeAvailable, syntheticId } from './ipc';

export interface StoredRecord { id: typeof syntheticId; text: string }
const messages = {
  NATIVE_UNAVAILABLE: '로컬 저장은 Tauri 앱에서만 사용할 수 있습니다.',
  INVALID_RECORD: '합성 레코드의 형식과 입력 범위를 확인해 주세요.',
  STORAGE_UNAVAILABLE: '로컬 저장소를 열 수 없습니다. 기존 데이터는 초기화하지 않습니다.',
  UNSUPPORTED_SCHEMA: '지원하지 않는 저장소 버전입니다. 기존 데이터는 초기화하지 않습니다.',
  SAVE_FAILED: '저장하지 못했습니다. 마지막 확인 저장본을 유지합니다.',
  LOAD_FAILED: '저장본을 읽지 못했습니다. 마지막 확인 저장본을 유지합니다.',
  SIMULATED_SAVE_FAILURE: '개발용 저장 실패를 발생시켜 변경을 되돌렸습니다.',
  IPC_FAILED: '저장소 작업 결과를 확인하지 못했습니다. 저장본을 다시 읽어 확인해 주세요.',
};
type StorageCode = keyof typeof messages;
type Failure = { ok: false; code: StorageCode; message: string };
export type StorageResult<T> = { ok: true; value: T } | Failure;

function failure(error: unknown): Failure {
  const code = typeof error === 'object' && error !== null && 'code' in error
    && typeof error.code === 'string' && Object.hasOwn(messages, error.code) ? error.code as StorageCode : 'IPC_FAILED';
  return { ok: false, code, message: messages[code] };
}

function isRecord(value: unknown): value is StoredRecord {
  return typeof value === 'object' && value !== null && 'id' in value && value.id === syntheticId
    && 'text' in value && typeof value.text === 'string' && value.text.trim().length > 0
    && [...value.text].length <= 256 && !/[\u0000-\u001f\u007f-\u009f]/.test(value.text);
}

export async function loadSyntheticRecord(): Promise<StorageResult<StoredRecord | null>> {
  if (!nativeAvailable()) return failure({ code: 'NATIVE_UNAVAILABLE' });
  try {
    const value: unknown = await invoke('m0_load_record', {});
    if (value === null) return { ok: true, value: null };
    if (!isRecord(value)) return failure(null);
    return { ok: true, value: { id: syntheticId, text: value.text } };
  } catch (error: unknown) { return failure(error); }
}

export async function saveSyntheticRecord(text: string): Promise<StorageResult<StoredRecord>> {
  if (!nativeAvailable()) return failure({ code: 'NATIVE_UNAVAILABLE' });
  try {
    // A UI timeout cannot cancel commit. Await the native result instead of
    // reporting a timed-out write as rolled back. Native SQLite busy wait is 2s.
    const value: unknown = await invoke('m0_save_record', { record: { id: syntheticId, text } });
    if (!isRecord(value) || value.text !== text || !('status' in value) || value.status !== 'saved') return failure(null);
    return { ok: true, value: { id: syntheticId, text } };
  } catch (error: unknown) { return failure(error); }
}

export async function simulateSaveFailure(text: string): Promise<Failure> {
  if (!nativeAvailable()) return failure({ code: 'NATIVE_UNAVAILABLE' });
  try {
    await invoke('m0_simulate_save_failure', { record: { id: syntheticId, text } });
    return failure(null); // Resolving would violate the intentional-failure contract.
  } catch (error: unknown) { return failure(error); }
}
