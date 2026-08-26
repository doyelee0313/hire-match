/** 후보의 평가 축 점수(0~100)를 직무 특화/공통으로 묶어 막대바로 보여준다. */
export default function AxisScoreBoard({ axisScores }) {
  const specific = axisScores.filter((a) => a.scope === 'persona');
  const common = axisScores.filter((a) => a.scope === 'common');

  return (
    <div className="stack g16">
      <AxisGroup title="직무 특화 역량" axes={specific} />
      <AxisGroup title="공통 역량" axes={common} />
    </div>
  );
}

function AxisGroup({ title, axes }) {
  return (
    <div>
      <span className="sec">{title}</span>
      <div className="stack g10">
        {axes.map((a) => (
          <div className="axisrow" key={a.id}>
            <div className="row spread">
              <span className="label">
                {a.label}
                <span className={`pill xs ${a.weight === 'high' ? 'solid' : 'grey'}`} style={{ marginLeft: 6 }}>
                  {a.weight === 'high' ? 'HIGH' : 'MED'}
                </span>
              </span>
              <span className="num axisrow-score">{a.score}</span>
            </div>
            <div className="pbar-track">
              <div className="pbar-fill" style={{ width: `${a.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
