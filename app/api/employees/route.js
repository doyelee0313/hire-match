const repo = require('../../../db/repo');
const { json, serverError } = require('../../../lib/http');

export const dynamic = 'force-dynamic'; // 캐싱/빌드타임 고정 방지 — 항상 최신 DB 상태를 읽는다

export async function GET() {
  try {
    const employees = repo.listEmployees();
    const personas = repo.listPersonas();
    return json({ employees, personas });
  } catch (err) {
    return serverError(err);
  }
}
