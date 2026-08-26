'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';

/**
 * 실무진이 자기 직무 후보를 전부 판단했을 때(deck 소진) 뜨는 화면.
 * 바로 결과를 보여주지 않고 버튼을 눌러야 리빌되게 해서 성취감을 살린다.
 */
export default function PersonaReveal({ employeeId }) {
  const { data } = useSWR(employeeId ? `/api/profile?employeeId=${employeeId}` : null, fetcher);
  const [revealed, setRevealed] = useState(false);
  const [barsIn, setBarsIn] = useState(false);

  useEffect(() => {
    if (!revealed) {
      setBarsIn(false);
      return undefined;
    }
    const t = setTimeout(() => setBarsIn(true), 60);
    return () => clearTimeout(t);
  }, [revealed]);

  if (!data) return null;
  const { profile } = data;
  const bars = [
    ...profile.topTags.map((t) => ({ ...t, kind: 'tag' })),
    ...profile.topSignalTags.map((t) => ({ ...t, kind: 'signal' })),
  ];
  const maxWeight = Math.max(...bars.map((b) => b.weight), 1);

  return (
    <div className="done persona-reveal">
      {!revealed ? (
        <div className="stack g12" style={{ alignItems: 'center' }}>
          <div className="check-badge" aria-hidden="true">✓</div>
          <h3>이번 채용은 다 보셨습니다</h3>
          <p className="cap">
            판단 완료 <b className="num">{profile.totalSwipes}</b>건 · 좋아요 {profile.likeCount} · 수퍼라이크 {profile.superLikeCount}
          </p>
          {profile.totalSwipes > 0 ? (
            <button className="btn" type="button" onClick={() => setRevealed(true)}>내 페르소나 확인하기</button>
          ) : (
            <p className="cap">판단 기록이 없어 페르소나를 계산할 수 없어요.</p>
          )}
          <p className="cap">새 지원자가 들어오면 여기에 다시 쌓입니다.</p>
        </div>
      ) : (
        <div className="stack g16 persona-pop" style={{ alignItems: 'center', width: '100%' }}>
          <span className="cap">당신의 채용 페르소나</span>
          <h2 className="persona-title">{profile.title}</h2>
          <div className="persona-bars">
            {bars.map((b, i) => (
              <div className="pbar" key={b.tag}>
                <span className="label">{b.tag}</span>
                <div className="pbar-track">
                  <div
                    className={`pbar-fill${b.kind === 'signal' ? ' signal' : ''}`}
                    style={{
                      width: barsIn ? `${(b.weight / maxWeight) * 100}%` : '0%',
                      transitionDelay: `${i * 120}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="cap">
            좋아요·수퍼라이크한 후보 {profile.likeCount + profile.superLikeCount}명을 기준으로 만들어졌어요.
          </p>
        </div>
      )}
    </div>
  );
}
