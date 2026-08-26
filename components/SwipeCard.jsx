import CareerList from './CareerList';

/**
 * 지원자 한 명의 이력서를 카드 하나로 압축한 뷰. depth 0 = 맨 앞(조작 가능한) 카드,
 * depth 1~2 = 뒤에 살짝 보이는 장식용 카드 (.behind → pointer-events:none).
 *
 * 여기 보이는 건 오로지 이력서에 실제로 있는 내용(헤드라인·한 줄 소개·경력 타임라인·주요 프로젝트·
 * 보유 기술·자격증·학력)뿐이다. 정량 지표, 평가 축 점수·종합 적합도 같은 회사 자체 재가공 수치는
 * 실무진 스와이프 화면엔 절대 노출하지 않고, HR 화면(CandidateDetail)에서만 보여준다.
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

      <div className="cwrap">
        <div className="cbody">
          <div>
            <span className="sec">경력 · 주요 프로젝트</span>
            <CareerList career={cand.career} />
          </div>
          <div>
            <span className="sec">보유 기술</span>
            <div className="row wrapr g6">
              {cand.skills.map((s) => <span className="pill" key={s}>{s}</span>)}
            </div>
          </div>
          {cand.certifications.length > 0 && (
            <div>
              <span className="sec">자격증</span>
              <div className="row wrapr g6">
                {cand.certifications.map((c) => <span className="pill line" key={c}>{c}</span>)}
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
