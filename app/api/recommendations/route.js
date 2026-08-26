const repo = require('../../../db/repo');
const { isHrRequest } = require('../../../lib/auth');
const { json, badRequest, forbidden, serverError } = require('../../../lib/http');

/** GET /api/recommendations?personaId=dev — 태그 기반 스코어 + "누가 왜 좋아했는지" 근거. HR 전용. */
export async function GET(request) {
  try {
    if (!isHrRequest()) return forbidden('HR 권한이 필요합니다.');
    const personaId = new URL(request.url).searchParams.get('personaId');
    if (!personaId) return badRequest('personaId가 필요합니다.');
    const scored = repo.recommendations(personaId);
    const insights = repo.personaInsights(personaId);
    return json({ scored, insights });
  } catch (err) {
    return serverError(err);
  }
}
