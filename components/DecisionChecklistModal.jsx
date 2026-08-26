'use client';
import { useState } from 'react';

/** POPUP Studio "채용 결정 게이트" 6문항 — 컨택 진행 전 HR이 근거를 짧게 기록한다. */
const GATES = [
  ['positionFit', '포지션 적합성', '직무 요건에 부합하는가?'],
  ['contribution', '기여도', '회사가 이 사람으로 직접 받는 도움은?'],
  ['irreplaceable', '대체불가능성', '이 포지션에 꼭 이 사람이어야 하는가?'],
  ['roleFit', '직무 적합성', '실제 현업 투입·협업이 가능한가?'],
  ['roiOk', 'ROI', '연봉 대비 직접 가치가 정당한가?'],
  ['loyaltyOk', '충성도', '조직에 결속됐는가? (객관 기록 기반)'],
];

export default function DecisionChecklistModal({ candidate, initial, onSave, onCancel }) {
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(GATES.map(([key]) => [key, initial?.[key] || false]))
  );
  const [note, setNote] = useState(initial?.note || '');
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setAnswers((a) => ({ ...a, [key]: !a[key] }));
  const checkedCount = Object.values(answers).filter(Boolean).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...answers, note: note.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dct">
        <div className="stack g8">
          <span className="pill" style={{ alignSelf: 'flex-start' }}>채용 결정 게이트</span>
          <h3 id="dct" style={{ marginTop: 4 }}>{candidate.name} · 최종 결정 체크리스트</h3>
          <p className="label">답 못 하는 항목이 있으면 컨택을 보류하는 게 원칙입니다 ({checkedCount}/6)</p>
        </div>

        <div className="stack g8">
          {GATES.map(([key, title, desc]) => (
            <label key={key} className="row g12" style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={answers[key]}
                onChange={() => toggle(key)}
                style={{ marginTop: 3, width: 18, height: 18, flex: 'none' }}
              />
              <span>
                <span className="label" style={{ display: 'block', color: 'var(--heading)', fontWeight: 600 }}>{title}</span>
                <span className="cap">{desc}</span>
              </span>
            </label>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="근거 메모 (선택)"
          rows={3}
          style={{
            fontFamily: 'inherit', fontSize: 14, padding: '10px 12px', borderRadius: 'var(--r-lg)',
            border: '1px solid var(--border-sub)', resize: 'vertical', width: '100%',
          }}
        />

        <div className="row g8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-2" type="button" onClick={onCancel}>취소</button>
          <button className="btn" type="button" disabled={saving} onClick={handleSave}>
            {saving ? '저장 중…' : '기록 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
