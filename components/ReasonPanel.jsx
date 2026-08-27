/** 패스 사유 칩 — 선택 사항이며 시간 제한 없이 열려 있다가, 칩 클릭이나 "건너뛰기"로만 닫힌다. */
export default function ReasonPanel({ candidateName, reasons, reasonDetails, onPick, onSkip }) {
  return (
    <div className="reason">
      <div className="row spread g12">
        <span className="label">
          {candidateName} 패스 사유 <span className="muted">(선택)</span>
        </span>
        <button className="btn-text" type="button" onClick={onSkip}>건너뛰기</button>
      </div>
      <div className="chips">
        {reasons.map((r) => (
          <button type="button" key={r} title={reasonDetails?.[r]} onClick={() => onPick(r)}>{r}</button>
        ))}
      </div>
    </div>
  );
}
