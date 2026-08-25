'use client';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';
import { ACT_ICON, ACT_KO } from '../lib/constants';
import { fmtTime } from '../lib/format';

export default function SwipeLogTable({ personaId }) {
  const { data } = useSWR(personaId ? `/api/logs?personaId=${personaId}` : null, fetcher);
  if (!data) return null;
  const logs = data.logs;

  return (
    <div className="card pad stack g16">
      <span className="micro muted">SWIPE_LOG · {logs.length}건</span>
      <div className="scroll-x">
        <table className="data">
          <thead>
            <tr><th>시각</th><th>실무진</th><th>후보</th><th>판단</th><th>사유</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="num">{fmtTime(l.createdAt)}</td>
                <td><b>{l.employeeName}</b></td>
                <td className="num">{l.candidateName}</td>
                <td>{ACT_ICON[l.action]} {ACT_KO[l.action]}</td>
                <td>{l.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
