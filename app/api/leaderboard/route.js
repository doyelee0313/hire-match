const repo = require('../../../db/repo');
const { json, badRequest, serverError } = require('../../../lib/http');

/** GET /api/leaderboard?personaId=dev — 실무진별 Super Like 적중률(안목 랭킹).
 *  적중률 = HIRED / (HIRED+REJECTED). 아직 결과 없는 PENDING 픽은 분모에서 제외한다. */
export async function GET(request) {
  try {
    const personaId = new URL(request.url).searchParams.get('personaId');
    if (!personaId) return badRequest('personaId가 필요합니다.');
    const board = repo.leaderboard(personaId);
    return json({ board });
  } catch (err) {
    return serverError(err);
  }
}
