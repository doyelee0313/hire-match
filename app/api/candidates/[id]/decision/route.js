const repo = require('../../../../../db/repo');
const { isHrRequest } = require('../../../../../lib/auth');
const { json, forbidden, serverError } = require('../../../../../lib/http');

/**
 * POST /api/candidates/:id/decision — HR 최종 결정 체크리스트 저장
 * (POPUP Studio 채용 결정 게이트 6문항: 포지션적합성/기여도/대체불가능성/직무적합성/ROI/충성도). HR 전용.
 */
export async function POST(request, { params }) {
  try {
    if (!isHrRequest()) return forbidden('HR 권한이 필요합니다.');
    const body = await request.json();
    const decision = repo.saveDecision(params.id, body);
    return json({ decision });
  } catch (err) {
    return serverError(err);
  }
}
