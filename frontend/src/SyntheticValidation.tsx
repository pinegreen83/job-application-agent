import { useState } from 'react';
import { checkNativeBoundaries, nativeAvailable, syntheticId, validateSyntheticRecord } from './ipc';
import type { BoundaryCheck, ValidationResult } from './ipc';

export default function SyntheticValidation() {
  const [text, setText] = useState('합성 IPC 검증');
  const [result, setResult] = useState<ValidationResult>();
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<BoundaryCheck[]>();
  const native = nativeAvailable();
  return (
    <section className="validation" aria-labelledby="validation-title">
      <h2 id="validation-title">합성 입력 검증</h2>
      <p className="muted">입력 형식만 확인합니다. 저장하거나 분석하지 않습니다.</p>
      <p className="muted">식별자: {syntheticId}</p>
      {!native && <p role="status">브라우저에서는 Rust 검증을 실행할 수 없습니다. Tauri 앱에서 확인해 주세요.</p>}
      <form onSubmit={async event => {
        event.preventDefault(); setBusy(true); setResult(undefined);
        try { setResult(await validateSyntheticRecord(text)); } finally { setBusy(false); }
      }}>
        <label htmlFor="synthetic-text">합성 텍스트 (1~256자, 공백만 입력·제어 문자 제외)</label>
        <textarea id="synthetic-text" value={text} disabled={busy} onChange={event => { setText(event.target.value); setResult(undefined); }} />
        <button type="submit" disabled={!native || busy}>{busy ? '검증 중…' : 'Rust로 검증'}</button>
      </form>
      {result && (result.ok
        ? <p role="status">입력 검증 완료 · 저장·분석되지 않았습니다.</p>
        : <p role="alert">{result.message} ({result.code})</p>)}
      <details>
        <summary>개발용 IPC 경계 검사</summary>
        <p className="muted">고정된 합성 입력으로 허용·거부 동작을 확인합니다.</p>
        <button type="button" disabled={!native || busy} onClick={async () => {
          setBusy(true); setChecks(undefined);
          try { setChecks(await checkNativeBoundaries()); } finally { setBusy(false); }
        }}>경계 검사 실행</button>
        {checks && <div role="status" aria-label="경계 검사 결과">
          <p>{checks.filter(check => check.passed).length}/{checks.length} 통과</p>
          <ul>{checks.map(check => <li key={check.name}>{check.passed ? '통과' : '실패'} · {check.name}</li>)}</ul>
        </div>}
      </details>
    </section>
  );
}
