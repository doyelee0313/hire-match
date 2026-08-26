const repo = require('../../../db/repo');
const { json, badRequest, serverError } = require('../../../lib/http');

/** GET /api/profile?employeeId=e01 — 실무진 본인의 취향 페르소나 (좋아요/수퍼라이크 기반). */
export async function GET(request) {
  try {
    const employeeId = new URL(request.url).searchParams.get('employeeId');
    if (!employeeId) return badRequest('employeeId가 필요합니다.');
    const profile = repo.employeeTasteProfile(employeeId);
    return json({ profile });
  } catch (err) {
    return serverError(err);
  }
}
