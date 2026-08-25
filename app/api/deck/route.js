const repo = require('../../../db/repo');
const { json, badRequest, serverError } = require('../../../lib/http');

/** GET /api/deck?employeeId=e01 — 로그인한 실무진 기준, 본인 직무 채용의 미판단 덱만 반환한다. */
export async function GET(request) {
  try {
    const employeeId = new URL(request.url).searchParams.get('employeeId');
    if (!employeeId) return badRequest('employeeId가 필요합니다.');

    const employee = repo.getEmployee(employeeId);
    if (!employee) return badRequest('알 수 없는 실무진입니다.');

    const persona = repo.getPersona(employee.personaId);
    const deck = repo.deckFor(employee.personaId, employeeId);
    const pool = repo.poolOf(employee.personaId);
    const mates = new Set(repo.logsOfPersona(employee.personaId).map((l) => l.employee_id)).size;

    return json({
      employee,
      persona,
      deck: deck.slice(0, 3),
      deckCount: deck.length,
      poolCount: pool.length,
      mates,
    });
  } catch (err) {
    return serverError(err);
  }
}
