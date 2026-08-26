'use client';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';
import { fmtTime } from '../lib/format';

/** HR 화면 상단 알림 — 최근 Super Like N건 (03_feature_spec.md "HR 담당자 화면에 즉시 알림 1건"을 목록으로 확장). */
export default function SuperLikeFeed({ personaId }) {
  const { data } = useSWR(personaId ? `/api/logs?personaId=${personaId}` : null, fetcher);
  if (!data) return null;

  const recent = data.logs.filter((l) => l.action === 'SUPER_LIKE').slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <div className="card pad stack g12">
      <span className="micro muted">최근 Super Like 알림</span>
      <div className="stack g8">
        {recent.map((l) => (
          <div className="voter s" key={l.id}>
            <span aria-hidden="true" style={{ color: 'var(--blue)' }}>★</span>
            <div>
              <div className="w">{l.employeeName}님이 <b>{l.candidateName}</b>을(를) Super Like</div>
              {l.reason && <div className="q">“{l.reason}”</div>}
              <div className="cap" style={{ marginTop: 2 }}>{fmtTime(l.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
