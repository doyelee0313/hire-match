const repo = require('../../../db/repo');
const { isHrRequest } = require('../../../lib/auth');
const { json, badRequest, forbidden, serverError } = require('../../../lib/http');

/** GET /api/ranking?personaId=dev — 실무진별 Super Like → 실제 합격 전환율 랭킹. HR 전용. */
export async function GET(request) {
  try {
    if (!isHrRequest()) return forbidden('HR 권한이 필요합니다.');
    const personaId = new URL(request.url).searchParams.get('personaId');
    if (!personaId) return badRequest('personaId가 필요합니다.');
    const ranking = repo.scoutRanking(personaId);
    return json({ ranking });
  } catch (err) {
    return serverError(err);
  }
}
