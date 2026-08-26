const { cookies } = require('next/headers');
const repo = require('../../../../db/repo');
const { HR_SUBJECT, DEFAULT_PIN, hashPin, verifyPin, signSession } = require('../../../../lib/auth');
const { json, badRequest, serverError } = require('../../../../lib/http');

export const dynamic = 'force-dynamic';

const HR_PIN_HASH = hashPin(DEFAULT_PIN); // HR은 employee 레코드가 없어 고정 데모 PIN으로 검증한다.

function setSessionCookie(subject) {
  cookies().set('hm_session', signSession(subject), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * POST /api/auth/login — 두 갈래.
 * { employeeId: 'hr', pin } → HR 로그인 (직무 무관, 실무진 화면은 못 봄)
 * { employeeId, pin }       → 실무진 로그인, 본인 직무 스와이프 화면만 봄
 */
export async function POST(request) {
  try {
    const { employeeId, pin } = await request.json();

    if (employeeId === HR_SUBJECT) {
      if (!verifyPin(pin || '', HR_PIN_HASH)) return badRequest('PIN이 올바르지 않습니다.');
      setSessionCookie(HR_SUBJECT);
      return json({ employee: null, hr: true });
    }

    const employee = employeeId && repo.getEmployee(employeeId);
    if (!employee || !repo.verifyEmployeePin(employeeId, pin || '')) {
      return badRequest('실무진 또는 PIN이 올바르지 않습니다.');
    }
    setSessionCookie(employeeId);
    return json({ employee, hr: false });
  } catch (err) {
    return serverError(err);
  }
}
