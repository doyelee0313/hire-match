const repo = require('../../../../db/repo');
const { json, badRequest, serverError } = require('../../../../lib/http');

/** PATCH /api/swipes/:id — { passReason } — 패스 사유 칩은 스와이프 후 시간 제한 없이 언제든 붙는다. */
export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const { passReason } = body || {};
    if (!passReason) return badRequest('passReason이 필요합니다.');
    const result = repo.patchPassReason(params.id, passReason);
    return json({ result });
  } catch (err) {
    return badRequest(err.message);
  }
}
