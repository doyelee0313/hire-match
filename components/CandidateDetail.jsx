'use client';
import { useState } from 'react';
import CareerList from './CareerList';
import AxisScoreBoard from './AxisScoreBoard';
import DecisionChecklistModal from './DecisionChecklistModal';
import { postContact, postDecision } from '../lib/api';
import { ACT_ICON } from '../lib/constants';
import { esc } from '../lib/format';
import { hasHiddenPotential } from '../lib/signalAxis';

const GATE_KEYS = ['positionFit', 'contribution', 'irreplaceable', 'roleFit', 'roiOk', 'loyaltyOk'];

export default function CandidateDetail({ scored, onToast, onContacted }) {
  const { candidate: c, voters, passReasonCounts, decision, superd } = scored;
  // 가중치 계산에는 관여하지 않는 표시 전용 카운트 — "몇 명이 확신했는가"를 한눈에 보여주기 위함.
  // 리더/실무진을 나눠 세는 이유는 recommendations()의 패스트트랙 정의(리더 Super Like만)와
  // 맞추기 위함 — 멘토링 Day6_3_1: 일반 실무진의 Super Like까지 패스트트랙이면 자기모순이 생긴다.
  const leadSuperLikeCount = voters.filter((v) => v.action === 'SUPER_LIKE' && v.isLead).length;
  const staffSuperLikeCount = voters.filter((v) => v.action === 'SUPER_LIKE' && !v.isLead).length;
  const [contactedAt, setContactedAt] = useState(c.contactedAt);
  const [submitting, setSubmitting] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);

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

  const handleSaveDecision = async (answers) => {
    await postDecision(c.id, answers);
    onContacted?.();
    setChecklistOpen(false);
    onToast(`<b>${esc(c.name)}</b> 결정 체크리스트 기록됨`);
  };

  const passedGates = decision ? GATE_KEYS.filter((k) => decision[k]).length : 0;

  return (
    <div className={`card stack detailcard${superd ? ' superd' : ''}`}>
      <div className="chead">
        <div className="row spread g8">
          <span className="code num">{c.name}</span>
          {hasHiddenPotential(c) && <span className="pill xs potential">잠재력 신호</span>}
        </div>
        <span className="name">{c.headline}</span>
        <p className="liner">“{c.oneLiner}”</p>
        <div className="row g8" style={{ marginTop: 4 }}>
          <div className="fit-badge"><b className="num">{c.fitScore}</b><span>종합 적합도</span></div>
          {leadSuperLikeCount > 0 && (
            <span
              className="pill gold"
              style={{ alignSelf: 'flex-start' }}
              title="리더 Super Like — 패스트트랙으로 작동합니다"
            >
              {'★'.repeat(leadSuperLikeCount)} 리더 {leadSuperLikeCount}명 확신
            </span>
          )}
          {staffSuperLikeCount > 0 && (
            <span
              className="pill line"
              style={{ alignSelf: 'flex-start' }}
              title="실무진 Super Like — 참고 신호일 뿐 패스트트랙에는 반영되지 않습니다"
            >
              ☆ 실무진 {staffSuperLikeCount}명 참고
            </span>
          )}
        </div>
      </div>
      <div className="metrics">
        {c.metrics.map(([v, l], i) => (
          <div key={i}><b>{v}</b><span>{l}</span></div>
        ))}
      </div>
      <div className="cwrap">
        <div className="cbody">
          <div>
            <span className="sec">경력 · 주요 프로젝트</span>
            <CareerList career={c.career} />
          </div>
          <div>
            <span className="sec">보유 기술</span>
            <div className="row wrapr g6">
              {c.skills.map((s) => <span className="pill" key={s}>{s}</span>)}
            </div>
          </div>
          {c.certifications.length > 0 && (
            <div>
              <span className="sec">자격증</span>
              <div className="row wrapr g6">
                {c.certifications.map((cert) => <span className="pill line" key={cert}>{cert}</span>)}
              </div>
            </div>
          )}
          <div>
            <span className="sec">자기소개서</span>
            <div className="stack g10">
              <div>
                <span className="cap">지원 동기</span>
                <p className="liner" style={{ marginTop: 2 }}>{c.coverLetter.motivation}</p>
              </div>
              <div>
                <span className="cap">주요 경험</span>
                <p className="liner" style={{ marginTop: 2 }}>{c.coverLetter.experience}</p>
              </div>
            </div>
          </div>
          <AxisScoreBoard axisScores={c.axisScores} />
          <div>
            <span className="sec">좋아요한 실무진 {voters.length}명</span>
            <div className="stack g8">
              {voters.length ? (
                voters.map((v, i) => (
                  <div className={`voter${v.action === 'SUPER_LIKE' ? ' s' : ''}`} key={i}>
                    <span aria-hidden="true" style={{ color: 'var(--blue)' }}>{ACT_ICON[v.action]}</span>
                    <div>
                      <div className="w">
                        {v.employeeName} · {v.employeeRole}
                        {v.action === 'SUPER_LIKE' && (
                          <span className={`pill xs ${v.isLead ? 'gold' : 'line'}`} style={{ marginLeft: 6 }}>
                            {v.isLead ? '★ 리더 확신' : '☆ 실무진 참고'}
                          </span>
                        )}
                        {v.voterPersonaTitle && <span className="pill xs line" style={{ marginLeft: 6 }}>{v.voterPersonaTitle}</span>}
                      </div>
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
      <div className="stack g8" style={{ padding: '4px 24px 24px' }}>
        <button className="btn-2 full" type="button" onClick={() => setChecklistOpen(true)}>
          {decision ? `결정 체크리스트 · ${passedGates}/6` : '최종 결정 체크리스트 작성'}
        </button>
        <button className="btn full" type="button" disabled={!!contactedAt || submitting} onClick={handleContact}>
          {contactedAt ? '컨택 완료' : '컨택 진행'}
        </button>
      </div>

      {checklistOpen && (
        <DecisionChecklistModal
          candidate={c}
          initial={decision}
          onSave={handleSaveDecision}
          onCancel={() => setChecklistOpen(false)}
        />
      )}
    </div>
  );
}
