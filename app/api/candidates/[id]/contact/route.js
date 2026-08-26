const repo = require('../../../../../db/repo');
const { isHrRequest } = require('../../../../../lib/auth');
const { json, forbidden, serverError } = require('../../../../../lib/http');

/** POST /api/candidates/:id/contact — HR "컨택 진행" 버튼. contactedAt을 DB에 영구 기록한다. HR 전용. */
export async function POST(_request, { params }) {
  try {
    if (!isHrRequest()) return forbidden('HR 권한이 필요합니다.');
    const result = repo.setContacted(params.id);
    return json({ result });
  } catch (err) {
    return serverError(err);
  }
}
