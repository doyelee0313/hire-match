const repo = require('../../../db/repo');
const { json, badRequest, serverError } = require('../../../lib/http');

/** GET /api/logs?personaId=dev — SWIPE_LOG 테이블 뷰. */
export async function GET(request) {
  try {
    const personaId = new URL(request.url).searchParams.get('personaId');
    if (!personaId) return badRequest('personaId가 필요합니다.');
    const logs = repo.logsForTable(personaId);
    return json({ logs });
  } catch (err) {
    return serverError(err);
  }
}
