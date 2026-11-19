import { useRef, useState } from 'react';
import { nativeAvailable } from './ipc';
import { cancelMock, checkMockContract, operations, readMock, scenarios, startMock } from './provider-ipc';
import type { Model, Operation, Outcome, Scenario, Ticket } from './provider-ipc';
import type { BoundaryCheck } from './ipc';

export default function SyntheticMock() {
  const [operation, setOperation] = useState<Operation>('analyze');
  const [modelId, setModel] = useState<Model>('mock-synthetic-v1');
  const [scenario, setScenario] = useState<Scenario>('success');
  const [ticket, setTicket] = useState<Ticket>();
  const [outcome, setOutcome] = useState<Outcome>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [checks, setChecks] = useState<BoundaryCheck[]>();
  const pending = useRef(false);
  const native = nativeAvailable();
  return <section className="validation" aria-labelledby="mock-title">
    <h2 id="mock-title">합성 Provider Mock</h2>
    <p className="muted">고정된 합성 결과입니다. 실제 AI 호출·과금·자동 저장은 없습니다.</p>
    {!native && <p>합성 Mock은 Tauri 앱에서만 실행할 수 있습니다.</p>}
    <form onSubmit={async event => {
      event.preventDefault(); if (pending.current || !native) return;
      pending.current = true; setBusy(true); setOutcome(undefined); setTicket(undefined); setError('');
      try {
        const started = await startMock({ operation, modelId, scenario });
        if (!started.ok) { setError(`${started.error.message} (${started.error.code})`); return; }
        setTicket(started.value);
        const result = await readMock(started.value);
        if (result.ok) setOutcome(result.value);
        else setError(`${result.error.message} (${result.error.code})`);
      } finally { pending.current = false; setBusy(false); setCancelling(false); }
    }}>
      <label htmlFor="mock-operation">Mock 작업</label>
      <select id="mock-operation" disabled={busy} value={operation} onChange={event => { setOperation(event.target.value as Operation); setOutcome(undefined); }}>
        {operations.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
      <label htmlFor="mock-model">가상 모델</label>
      <select id="mock-model" disabled={busy} value={modelId} onChange={event => { setModel(event.target.value as Model); setOutcome(undefined); }}>
        <option value="mock-synthetic-v1">mock-synthetic-v1</option><option value="mock-unsupported">mock-unsupported</option>
      </select>
      <label htmlFor="mock-scenario">합성 시나리오</label>
      <select id="mock-scenario" disabled={busy} value={scenario} onChange={event => { setScenario(event.target.value as Scenario); setOutcome(undefined); }}>
        {scenarios.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
      <div><button type="submit" disabled={!native || busy}>Mock 시작</button>{' '}
        <button type="button" disabled={!native || !busy || !ticket || cancelling} onClick={async () => {
          if (!ticket || cancelling) return; setCancelling(true);
          const result = await cancelMock(ticket);
          if (!result.ok) { setError(`${result.error.message} (${result.error.code})`); setCancelling(false); }
        }}>Mock 취소</button></div>
    </form>
    {busy && ticket && <p role="status">처리 중 · {ticket.requestId}</p>}
    {outcome?.status === 'succeeded' && <p role="status">합성 처리 완료 · {outcome.operation} · {outcome.requestId}<br />{outcome.summary}</p>}
    {outcome && outcome.status !== 'succeeded' && <p role="alert">{outcome.error.message} ({outcome.error.code}) · {outcome.requestId}</p>}
    {error && <p role="alert">{error}</p>}
    <details><summary>개발용 Mock 계약 검사</summary>
      <p className="muted">4종 정상·5종 오류·실제 취소와 기존 저장본 보존을 확인합니다. DB에 쓰지 않습니다.</p>
      <button type="button" disabled={!native || busy} onClick={async () => {
        if (pending.current) return; pending.current = true; setBusy(true); setTicket(undefined); setChecks(undefined);
        try { setChecks(await checkMockContract()); } finally { pending.current = false; setBusy(false); }
      }}>Mock 계약 검사 실행</button>
      {checks && <div role="status" aria-label="Mock 계약 검사 결과"><p>{checks.filter(check => check.passed).length}/{checks.length} 통과</p>
        <ul>{checks.map(check => <li key={check.name}>{check.passed ? '통과' : '실패'} · {check.name}</li>)}</ul></div>}
    </details>
  </section>;
}
