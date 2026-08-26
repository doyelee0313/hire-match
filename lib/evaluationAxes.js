/**
 * 인재 평가 축 SSOT. POPUP Studio 인재기준 문서의 방법론
 * ("축마다 high/medium 가중치를 매기고, 후보를 그 축으로 채점한다")만 가져와
 * 코드프레소 채용 3개 직무에 적용한 것 — 문서의 FDE 관련 실제 내용은 쓰지 않는다.
 */

const PERSONA_AXES = {
  dev: [
    { id: 'problem_solving', label: '문제 해결력', weight: 'high' },
    { id: 'completion', label: '완주 경험', weight: 'high' },
  ],
  edu: [
    { id: 'curriculum', label: '커리큘럼 설계력', weight: 'high' },
    { id: 'stakeholder', label: '이해관계자 조율', weight: 'medium' },
  ],
  sales: [
    { id: 'deal_closing', label: '딜클로징', weight: 'high' },
    { id: 'need_structuring', label: '요구 구조화', weight: 'medium' },
  ],
};

// 직무 무관 공통 축 (01_personas.md "공통 평가 축" 표를 그대로 반영)
const COMMON_AXES = [
  { id: 'communication', label: '커뮤니케이션 명료성', weight: 'high' },
  { id: 'execution', label: '문제 해결·실행 지향', weight: 'high' },
  { id: 'sharing', label: '협업·공유 마인드', weight: 'medium' },
  { id: 'self_learning', label: '자기주도 학습', weight: 'medium' },
];

const WEIGHT_FACTOR = { high: 2, medium: 1 };

/** 시드 데이터 작성용 — 점수 배열만 넘기면 축 메타(라벨/가중치/스코프)를 붙여준다. */
function axisScoresFor(personaId, specificScores, commonScores) {
  const specific = PERSONA_AXES[personaId].map((axis, i) => ({
    ...axis,
    score: specificScores[i],
    scope: 'persona',
  }));
  const common = COMMON_AXES.map((axis, i) => ({ ...axis, score: commonScores[i], scope: 'common' }));
  return [...specific, ...common];
}

/** 가중평균 종합 적합도 (high=2배, medium=1배). */
function fitScore(axisScores) {
  if (!axisScores || axisScores.length === 0) return 0;
  let sum = 0;
  let wsum = 0;
  for (const a of axisScores) {
    const w = WEIGHT_FACTOR[a.weight] || 1;
    sum += a.score * w;
    wsum += w;
  }
  return Math.round(sum / wsum);
}

module.exports = { PERSONA_AXES, COMMON_AXES, WEIGHT_FACTOR, axisScoresFor, fitScore };
