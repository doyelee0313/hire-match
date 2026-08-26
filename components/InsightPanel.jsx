'use client';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';

/** HR 인사이트 — 이 직무에서 실무진이 실제로 반응한 평가 축/패스 사유 (03_feature_spec.md 화면3 부속기능). */
export default function InsightPanel({ personaId }) {
  const { data } = useSWR(personaId ? `/api/recommendations?personaId=${personaId}` : null, fetcher);
  if (!data) return null;

  const { topTags, topSignalTags, passReasons } = data.insights;
  if (!topTags.length && !topSignalTags.length && !passReasons.length) {
    return (
      <div className="card pad stack g8">
        <span className="micro muted">HR 인사이트</span>
        <p className="cap">아직 판단 데이터가 부족합니다. 실무진이 스와이프를 시작하면 여기에 쌓입니다.</p>
      </div>
    );
  }

  return (
    <div className="card pad stack g16">
      <span className="micro muted">HR 인사이트 · 실무진이 실제로 반응한 신호</span>

      {topTags.length > 0 && (
        <div>
          <span className="sec">선호 직무 특화 축 TOP {topTags.length}</span>
          <div className="row wrapr g6">
            {topTags.map(({ tag, weight }) => (
              <span className="pill" key={tag}>{tag} <b className="num">{weight}</b></span>
            ))}
          </div>
        </div>
      )}

      {topSignalTags.length > 0 && (
        <div>
          <span className="sec">선호 공통 역량 축 TOP {topSignalTags.length}</span>
          <div className="row wrapr g6">
            {topSignalTags.map(({ tag, weight }) => (
              <span className="pill line" key={tag}>{tag} <b className="num">{weight}</b></span>
            ))}
          </div>
        </div>
      )}

      {passReasons.length > 0 && (
        <div>
          <span className="sec">가장 흔한 패스 사유</span>
          <div className="row wrapr g6">
            {passReasons.map(({ reason, count }) => (
              <span className="pill grey" key={reason}>{reason} · {count}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
