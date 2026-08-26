const repo = require('../../../db/repo');
const { isHrRequest } = require('../../../lib/auth');
const { json, badRequest, forbidden, serverError } = require('../../../lib/http');

/** GET /api/leaderboard?personaId=dev — 실무진별 Super Like 적중률(안목 랭킹). HR 전용.
 *  적중률 = HIRED / (HIRED+REJECTED). 아직 결과 없는 PENDING 픽은 분모에서 제외한다. */
export async function GET(request) {
  try {
    if (!isHrRequest()) return forbidden('HR 권한이 필요합니다.');
    const personaId = new URL(request.url).searchParams.get('personaId');
    if (!personaId) return badRequest('personaId가 필요합니다.');
    const board = repo.leaderboard(personaId);
    return json({ board });
  } catch (err) {
    return serverError(err);
  }
}
