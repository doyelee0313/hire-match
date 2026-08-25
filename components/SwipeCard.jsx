import CareerList from './CareerList';

/**
 * 지원자 한 명의 이력서를 카드 하나로 압축한 뷰. depth 0 = 맨 앞(조작 가능한) 카드,
 * depth 1~2 = 뒤에 살짝 보이는 장식용 카드 (.behind → pointer-events:none).
 */
export default function SwipeCard({ candidate: cand, depth, personaShort, cardRef }) {
  const behind = depth > 0;
  return (
    <article
      ref={cardRef}
      className={`scard${behind ? ' behind' : ''}`}
      data-cand={cand.id}
      style={{
        transform: `translateY(${depth * 18}px) scale(${1 - depth * 0.02})`,
        zIndex: 10 - depth,
        opacity: behind ? 0.5 : undefined,
      }}
    >
      <div className="stamp like" aria-hidden="true">LIKE</div>
      <div className="stamp pass" aria-hidden="true">PASS</div>
      <div className="stamp super" aria-hidden="true">SUPER</div>

      <div className="chead">
        <div className="row spread g8">
          <span className="code num">{cand.name}</span>
          <span className="pill xs">{personaShort}</span>
        </div>
        <span className="name">{cand.headline}</span>
        <p className="liner">“{cand.oneLiner}”</p>
      </div>

      <div className="metrics">
        {cand.metrics.map(([v, l], i) => (
          <div key={i}>
            <b>{v}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>

      <div className="cwrap">
        <div className="cbody">
          <div>
            <span className="sec">경력</span>
            <CareerList career={cand.career} />
          </div>
          <div>
            <span className="sec">스킬</span>
            <div className="row wrapr g6">
              {cand.tags.map((t) => (
                <span className="pill" key={t}>{t}</span>
              ))}
            </div>
          </div>
          {cand.signalTags.length > 0 && (
            <div>
              <span className="sec">강점 신호</span>
              <div className="row wrapr g6">
                {cand.signalTags.map((t) => (
                  <span className="pill line" key={t}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="foot">
        <span className="cap">{cand.education}</span>
        {cand.portfolioUrl && <span className="cap">{cand.portfolioUrl}</span>}
      </div>
    </article>
  );
}
