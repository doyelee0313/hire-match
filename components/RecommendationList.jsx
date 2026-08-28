'use client';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';
import CandidateDetail from './CandidateDetail';

// 패스트트랙 배지는 리더 Super Like만 센다 — recommendations()의 superd 정의와 맞춘다.
function leadSuperLikeCountOf(voters) {
  return voters.filter((v) => v.action === 'SUPER_LIKE' && v.isLead).length;
}
function staffSuperLikeCountOf(voters) {
  return voters.filter((v) => v.action === 'SUPER_LIKE' && !v.isLead).length;
}

export default function RecommendationList({ personaId, selectedId, onSelect, onToast }) {
  const { data, mutate } = useSWR(personaId ? `/api/recommendations?personaId=${personaId}` : null, fetcher);
  if (!data) return null;

  const scored = data.scored;
  const recentIds = new Set(data.recentSuperLikeIds || []);
  const supers = scored.filter((s) => s.superd).length;
  const sel = selectedId ? scored.find((s) => s.candidate.id === selectedId) : null;

  return (
    <div className="rec">
      <div className="reclist">
        {scored.map((s, i) => (
          <button
            key={s.candidate.id}
            type="button"
            className={`recrow${s.superd ? ' superd' : ''}`}
            aria-current={selectedId === s.candidate.id}
            onClick={() => onSelect(s.candidate.id)}
          >
            <span className={`rk num${s.superd ? ' star' : ''}`}>
              {s.superd ? '★' : String(i + 1 - supers).padStart(2, '0')}
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="nm">
                {s.candidate.name}
                {s.superd && <span className="pill xs solid">패스트트랙</span>}
                {s.superd && (
                  <span className="pill xs gold" title="리더 Super Like 수 — 리더의 확신만 패스트트랙으로 작동합니다">
                    {'★'.repeat(leadSuperLikeCountOf(s.voters))} 리더 확신 ×{leadSuperLikeCountOf(s.voters)}
                  </span>
                )}
                {staffSuperLikeCountOf(s.voters) > 0 && (
                  <span className="pill xs line" title="실무진 Super Like 수 — 패스트트랙에는 반영되지 않는 참고 신호입니다">
                    ☆ 실무진 참고 ×{staffSuperLikeCountOf(s.voters)}
                  </span>
                )}
                {recentIds.has(s.candidate.id) && <span className="pill xs grey">최근 Super Like</span>}
                {s.candidate.contactedAt && <span className="pill xs grey">컨택 완료</span>}
              </span>
              <span className="sub">{s.candidate.headline} · {s.candidate.oneLiner}</span>
              <span className="sub muted">
                {s.voters.length
                  ? `${s.voters.slice(0, 3).map((v) => v.employeeName).join(', ')} 등 ${s.voters.length}명`
                  : '판단 없음'}
              </span>
            </span>
            <span className="sc"><b className="num">{s.candidate.fitScore}</b><span>종합 적합도</span></span>
          </button>
        ))}
      </div>
      <aside className="detail">
        {sel ? (
          <CandidateDetail scored={sel} onToast={onToast} onContacted={() => mutate()} />
        ) : (
          <div className="empty">후보를 선택하세요</div>
        )}
      </aside>
    </div>
  );
}
