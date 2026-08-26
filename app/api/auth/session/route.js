const { cookies } = require('next/headers');
const repo = require('../../../../db/repo');
const { HR_SUBJECT, verifySession } = require('../../../../lib/auth');
const { json } = require('../../../../lib/http');

export const dynamic = 'force-dynamic';

/** GET /api/auth/session — 현재 로그인 상태 (미로그인: 둘 다 null/false). */
export async function GET() {
  const token = cookies().get('hm_session')?.value;
  const subject = verifySession(token);

  if (subject === HR_SUBJECT) return json({ employee: null, hr: true });
  const employee = subject ? repo.getEmployee(subject) : null;
  return json({ employee: employee || null, hr: false });
}
