const repo = require('../../../db/repo');
const { json, badRequest, serverError } = require('../../../lib/http');

/** POST /api/swipes — { employeeId, candidateId, action, superLikeReason? }
 *  persona_id는 서버가 employee 레코드로 직접 채운다 (직무 접근 제한을 API 레벨에서도 강제). */
export async function POST(request) {
  try {
    const body = await request.json();
    const { employeeId, candidateId, action, superLikeReason } = body || {};
    if (!employeeId || !candidateId || !action) return badRequest('employeeId, candidateId, action이 필요합니다.');

    const log = repo.insertSwipe({ employeeId, candidateId, action, superLikeReason });
    return json({ log }, { status: 201 });
  } catch (err) {
    return badRequest(err.message);
  }
}
