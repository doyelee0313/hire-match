/**
 * "도메인 경력은 가점이 아니다" — 연차가 낮아도 공통 평가 축에서 강점이 여럿이면
 * 실무진이 연차만 보고 지나치지 않도록 배지를 띄운다.
 */
export function hasHiddenPotential(candidate) {
  const strongCommonAxes = candidate.axisScores.filter((a) => a.scope === 'common' && a.score >= 70).length;
  return candidate.yearsOfExperience <= 2 && strongCommonAxes >= 2;
}
