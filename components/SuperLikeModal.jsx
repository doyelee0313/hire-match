'use client';
import { useEffect, useRef, useState } from 'react';

export default function SuperLikeModal({ candidate, isLead, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="smt">
        <div className="stack g8">
          <span className={`pill ${isLead ? 'gold' : ''}`} style={{ alignSelf: 'flex-start' }}>
            {isLead ? '★ 리더 수퍼라이크' : '☆ 수퍼라이크'}
          </span>
          <h3 id="smt" style={{ marginTop: 4 }}>왜 이 사람인가요?</h3>
          <p className="label">
            {candidate.name} · {candidate.headline} ·{' '}
            {isLead ? 'HR 최우선 검토(패스트트랙)' : 'HR 참고 신호 (최종 판단은 HR이 합니다)'}
          </p>
        </div>
        <input
          ref={inputRef}
          type="text"
          maxLength={90}
          placeholder="한 줄 (선택)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(reason.trim()); }}
        />
        <div className="row g8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-2" type="button" onClick={() => onConfirm('')}>건너뛰기</button>
          <button className="btn" type="button" onClick={() => onConfirm(reason.trim())}>확정</button>
        </div>
      </div>
    </div>
  );
}
