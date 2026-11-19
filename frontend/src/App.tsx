import SyntheticValidation from './SyntheticValidation';
import SyntheticStorage from './SyntheticStorage';
import SyntheticMock from './SyntheticMock';

// Handwritten synthetic display data. This is not a parser or a ranking result.
const example = {
  id: 'synthetic-m0-a-001',
  company: '가상 스튜디오 A',
  title: '게임 클라이언트 개발자',
  summary: '기본 화면 실행을 확인하기 위한 합성 공고입니다.',
};

export default function App() {
  return (
    <main className="workspace">
      <header className="app-header">
        <span className="app-mark" aria-hidden="true">J</span>
        <div><p className="eyebrow">JOB APPLICATION AGENT</p><p className="header-caption">개발 환경 확인</p></div>
        <span className="badge">M0-D</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">첫 실행</p>
        <h1 id="page-title">공고 검토를 위한<br />첫 화면을 준비했어요.</h1>
        <p className="description">지금은 개발 환경을 확인하는 단계입니다.<br />아래 예시는 실제 채용 정보나 개인 자료를 사용하지 않습니다.</p>
      </section>

      <section className="sample-section" aria-labelledby="sample-title">
        <div className="section-heading"><h2 id="sample-title">합성 공고 예시</h2><span className="muted">1건</span></div>
        <article className="sample-card" aria-labelledby="job-title">
          <div className="card-heading"><p className="company">{example.company}</p><span className="sample-label">합성 데이터</span></div>
          <h3 id="job-title">{example.title}</h3>
          <p className="muted">{example.summary}</p>
          <dl className="sample-details"><div><dt>식별자</dt><dd>{example.id}</dd></div><div><dt>분석 결과</dt><dd>분석하지 않음</dd></div></dl>
        </article>
      </section>

      <SyntheticValidation />
      <SyntheticStorage />
      <SyntheticMock />

      <aside className="notice" aria-labelledby="notice-title">
        <h2 id="notice-title">아직 연결되지 않은 기능</h2>
        <p>메일 가져오기, JD 분석과 AI 연결은 다음 개발 단계에서 추가됩니다. 합성 로컬 저장 외의 제품 데이터 저장은 아직 구현되지 않았으며 외부 서비스에 전송하지 않습니다.</p>
      </aside>
      <footer>개발 확인용 화면 · 최종 제품 디자인은 추후 검토합니다.</footer>
    </main>
  );
}
