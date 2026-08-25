const repo = require('../../../db/repo');
const { json, badRequest, serverError } = require('../../../lib/http');

/** GET /api/recommendations?personaId=dev — 태그 기반 스코어 + "누가 왜 좋아했는지" 근거. */
export async function GET(request) {
  try {
    const personaId = new URL(request.url).searchParams.get('personaId');
    if (!personaId) return badRequest('personaId가 필요합니다.');
    const scored = repo.recommendations(personaId);
    return json({ scored });
  } catch (err) {
    return serverError(err);
  }
}
