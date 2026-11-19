import { useEffect, useRef, useState } from 'react';
import { nativeAvailable } from './ipc';
import { loadSyntheticRecord, saveSyntheticRecord, simulateSaveFailure } from './storage-ipc';
import type { StoredRecord } from './storage-ipc';

export default function SyntheticStorage() {
  const native = nativeAvailable();
  const [text, setText] = useState('합성 SQLite 검증');
  const [saved, setSaved] = useState<StoredRecord | null>();
  const [busy, setBusy] = useState(native);
  const pending = useRef(native);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!native) return;
    let cancelled = false;
    void loadSyntheticRecord().then(result => {
      if (cancelled) return;
      if (result.ok) setSaved(result.value);
      else setError(`${result.message} (${result.code})`);
      pending.current = false; setBusy(false);
    });
    return () => { cancelled = true; };
  }, [native]);

  async function perform(action: 'save' | 'load' | 'fail') {
    if (pending.current || !native) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (action === 'fail') {
        const result = await simulateSaveFailure(text);
        setError(`${result.message} (${result.code})`);
        if (result.code === 'SIMULATED_SAVE_FAILURE') {
          const reloaded = await loadSyntheticRecord();
          if (!reloaded.ok) setError(`${reloaded.message} (${reloaded.code})`);
          else if (saved !== undefined && (saved === null ? reloaded.value === null : saved.id === reloaded.value?.id && saved.text === reloaded.value.text)) {
            setSaved(reloaded.value); setMessage('의도된 실패 후 저장본 보존을 확인했습니다.');
          } else setError('실패 전후 저장본이 일치하는지 확인하지 못했습니다. 저장본을 다시 읽어 주세요.');
        }
      } else {
        const result = action === 'save' ? await saveSyntheticRecord(text) : await loadSyntheticRecord();
        if (result.ok) {
          setSaved(result.value);
          setMessage(action === 'save' ? '로컬 저장 완료 · 분석되지 않았습니다.' : '저장본을 다시 읽었습니다.');
        } else setError(`${result.message} (${result.code})`);
      }
    } finally { pending.current = false; setBusy(false); }
  }

  return <section className="validation" aria-labelledby="storage-title" aria-busy={busy}>
    <h2 id="storage-title">합성 로컬 저장</h2>
    <p className="muted">합성 데이터만 사용해 주세요. 이 기기에 저장하며 외부로 전송하지 않습니다.</p>
    {!native && <p>로컬 저장은 Tauri 앱에서만 사용할 수 있습니다.</p>}
    <form onSubmit={event => { event.preventDefault(); void perform('save'); }}>
      <label htmlFor="storage-text">저장할 합성 텍스트</label>
      <textarea id="storage-text" value={text} disabled={busy || !native} onChange={event => { setText(event.target.value); setMessage(''); }} />
      <div><button type="submit" disabled={busy || !native}>로컬에 저장</button>{' '}
        <button type="button" disabled={busy || !native} onClick={() => { void perform('load'); }}>저장본 다시 읽기</button></div>
    </form>
    <div role="region" aria-label="마지막 확인 저장본">
      <h3>마지막 확인 저장본</h3>
      {saved === undefined ? <p>저장본을 아직 확인하지 못했습니다.</p> : saved === null ? <p>저장된 합성 레코드가 없습니다.</p> : <p className="saved-text">{saved.text}</p>}
    </div>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
    <details><summary>개발용 저장 실패 검증</summary>
      <p className="muted">합성 변경을 쓴 뒤 commit 전에 되돌립니다. 마지막 확인 저장본과 비교합니다.</p>
      <button type="button" disabled={busy || !native || saved === undefined} onClick={() => { void perform('fail'); }}>저장 실패·보존 검사</button>
    </details>
  </section>;
}
