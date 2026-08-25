'use client';
import { useState } from 'react';
import CareerList from './CareerList';
import { postContact } from '../lib/api';
import { ACT_ICON } from '../lib/constants';
import { esc } from '../lib/format';

export default function CandidateDetail({ scored, onToast, onContacted }) {
  const { candidate: c, voters, passReasonCounts } = scored;
  const [contactedAt, setContactedAt] = useState(c.contactedAt);
  const [submitting, setSubmitting] = useState(false);

  const handleContact = async () => {
    setSubmitting(true);
    try {
      const res = await postContact(c.id);
      setContactedAt(res.result.contactedAt);
      onContacted?.();
      onToast(`<b>${esc(c.name)}</b> 면접 조율 메일 발송 <span class="muted">(시뮬레이션)</span>`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card stack detailcard">
      <div className="chead">
        <span className="code num">{c.name}</span>
        <span className="name">{c.headline}</span>
        <p className="liner">“{c.oneLiner}”</p>
      </div>
      <div className="metrics">
        {c.metrics.map(([v, l], i) => (
          <div key={i}><b>{v}</b><span>{l}</span></div>
        ))}
      </div>
      <div className="cwrap">
        <div className="cbody">
          <div>
            <span className="sec">경력</span>
            <CareerList career={c.career} />
          </div>
          <div>
            <span className="sec">스킬</span>
            <div className="row wrapr g6">
              {c.tags.map((t) => <span className="pill" key={t}>{t}</span>)}
            </div>
          </div>
          {c.signalTags.length > 0 && (
            <div>
              <span className="sec">강점 신호</span>
              <div className="row wrapr g6">
                {c.signalTags.map((t) => <span className="pill line" key={t}>{t}</span>)}
              </div>
            </div>
          )}
          <div>
            <span className="sec">좋아요한 실무진 {voters.length}명</span>
            <div className="stack g8">
              {voters.length ? (
                voters.map((v, i) => (
                  <div className={`voter${v.action === 'SUPER_LIKE' ? ' s' : ''}`} key={i}>
                    <span aria-hidden="true" style={{ color: 'var(--blue)' }}>{ACT_ICON[v.action]}</span>
                    <div>
                      <div className="w">{v.employeeName} · {v.employeeRole}</div>
                      {v.superLikeReason && <div className="q">“{v.superLikeReason}”</div>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="cap">아직 없습니다</p>
              )}
              {Object.keys(passReasonCounts).length > 0 && (
                <p className="cap">
                  패스 사유 · {Object.entries(passReasonCounts).map(([r, n]) => `${r} ${n}`).join(' / ')}
                </p>
              )}
            </div>
          </div>
          <div className="row spread g8">
            <span className="cap">{c.education}</span>
            {c.portfolioUrl && <span className="cap">{c.portfolioUrl}</span>}
          </div>
        </div>
      </div>
      <div style={{ padding: '4px 24px 24px' }}>
        <button className="btn full" type="button" disabled={!!contactedAt || submitting} onClick={handleContact}>
          {contactedAt ? '컨택 완료' : '컨택 진행'}
        </button>
      </div>
    </div>
  );
}
