'use client';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';
import CandidateDetail from './CandidateDetail';

export default function RecommendationList({ personaId, selectedId, onSelect, onToast }) {
  const { data, mutate } = useSWR(personaId ? `/api/recommendations?personaId=${personaId}` : null, fetcher);
  if (!data) return null;

  const scored = data.scored;
  const supers = scored.filter((s) => s.superd).length;
  const sel = selectedId ? scored.find((s) => s.candidate.id === selectedId) : null;

  return (
    <div className="rec">
      <div className="reclist">
        {scored.map((s, i) => (
          <button
            key={s.candidate.id}
            type="button"
            className="recrow"
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
                {s.candidate.contactedAt && <span className="pill xs grey">컨택 완료</span>}
              </span>
              <span className="sub">{s.candidate.headline} · {s.candidate.oneLiner}</span>
              <span className="sub muted">
                {s.voters.length
                  ? `${s.voters.slice(0, 3).map((v) => v.employeeName).join(', ')} 등 ${s.voters.length}명`
                  : '판단 없음'}
              </span>
            </span>
            <span className="sc"><b className="num">{s.score}</b><span>SCORE</span></span>
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
