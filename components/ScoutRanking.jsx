'use client';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';

/** 이달의 인재 스카우터 — 실무진별 Super Like → 실제 합격 전환율 랭킹 (02_user_flow.md 흐름 E). */
export default function ScoutRanking({ personaId }) {
  const { data } = useSWR(personaId ? `/api/ranking?personaId=${personaId}` : null, fetcher);
  if (!data) return null;

  const ranking = data.ranking;
  const topId = ranking.find((r) => r.rate !== null)?.employee.id;

  return (
    <div className="card pad stack g16">
      <span className="micro muted">이달의 인재 스카우터 · Super Like 대비 실제 합격 전환율</span>
      <div className="stack g8">
        {ranking.map((r, i) => (
          <div className={`voter${r.employee.id === topId ? ' s' : ''}`} key={r.employee.id}>
            <span className="cap num" style={{ minWidth: 18 }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div className="w">
                {r.employee.name} · {r.employee.role}
                {r.employee.id === topId && <span className="pill xs solid" style={{ marginLeft: 8 }}>TOP 스카우터</span>}
              </div>
              <div className="q">
                {r.superLikeCount === 0
                  ? 'Super Like 기록 없음'
                  : `Super Like ${r.superLikeCount}건 중 ${r.hiredCount}건 합격 · 전환율 ${Math.round((r.rate || 0) * 100)}%`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
