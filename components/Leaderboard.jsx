'use client';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';

function pct(n) {
  return `${Math.round(n * 100)}%`;
}

/** 안목 랭킹 — Super Like가 실제 합격(HIRED)으로 이어진 비율. 판정이 안 난(PENDING) 픽은
 *  분모에서 빠지므로, 아직 결과가 없는 실무진은 순위 없이 "판정 대기"로만 표시된다. */
export default function Leaderboard({ personaId }) {
  const { data } = useSWR(personaId ? `/api/leaderboard?personaId=${personaId}` : null, fetcher);
  if (!data) return null;
  const board = data.board;

  let rank = 0;

  return (
    <div className="card pad stack g16">
      <span className="micro muted">안목 랭킹 · Super Like가 실제 합격으로 이어진 비율</span>
      <div className="scroll-x">
        <table className="data">
          <thead>
            <tr>
              <th>순위</th>
              <th>실무진</th>
              <th>채용 페르소나</th>
              <th>수퍼라이크</th>
              <th>적중</th>
              <th>적중률</th>
            </tr>
          </thead>
          <tbody>
            {board.map((row) => {
              const ranked = row.decided > 0;
              if (ranked) rank += 1;
              return (
                <tr key={row.employee.id}>
                  <td className="num">{ranked ? String(rank).padStart(2, '0') : '—'}</td>
                  <td>
                    <b>{row.employee.name}</b> <span className="cap">· {row.employee.role}</span>
                    {row.badge && (
                      <span className="pill xs solid" style={{ marginLeft: 6 }}>
                        ★ 이달의 인재 스카우터
                      </span>
                    )}
                  </td>
                  <td>
                    {row.personaTitle ? (
                      <span className="pill line">{row.personaTitle}</span>
                    ) : (
                      <span className="cap">성향 파악 중</span>
                    )}
                  </td>
                  <td className="num">{row.superLikes}</td>
                  <td className="num">{ranked ? `${row.hired} / ${row.decided}` : '—'}</td>
                  <td className="num">{ranked ? pct(row.accuracy) : <span className="cap">판정 대기</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="cap">
        적중률 = Super Like한 후보 중 최종 합격(HIRED) 비율. 아직 결과가 안 나온(PENDING) 픽은 분모에서 제외합니다.
      </p>
    </div>
  );
}
