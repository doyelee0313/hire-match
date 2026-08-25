const repo = require('../../../../../db/repo');
const { json, serverError } = require('../../../../../lib/http');

/** POST /api/candidates/:id/contact — HR "컨택 진행" 버튼. contactedAt을 DB에 영구 기록한다. */
export async function POST(_request, { params }) {
  try {
    const result = repo.setContacted(params.id);
    return json({ result });
  } catch (err) {
    return serverError(err);
  }
}
