const { cookies } = require('next/headers');
const { json } = require('../../../../lib/http');

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — 세션 쿠키 삭제. */
export async function POST() {
  cookies().delete('hm_session');
  return json({ ok: true });
}
