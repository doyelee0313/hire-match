/**
 * 아주 가벼운 로그인 — 이름(employeeId) + 4자리 PIN.
 * 세션은 별도 테이블 없이 "employeeId + HMAC 서명" 쿠키로만 유지한다 (무상태).
 * 서버 프로세스가 재시작되면 서명 비밀키도 새로 생성되어 전원 로그아웃되는데,
 * 내부 데모 툴 특성상 문제되지 않는다고 판단해 세션 테이블은 만들지 않았다.
 */
const crypto = require('crypto');

const DEFAULT_PIN = '0000';
const PIN_SALT = 'hire-match-demo-salt'; // 데모용 고정 salt. 실서비스라면 실무진별 랜덤 salt를 써야 한다.

// HR은 employee 테이블에 없는 별도 신원이라, 세션 subject로 이 고정 문자열을 쓴다.
// employee id는 전부 "e01" 형식이라 'hr'와 절대 겹치지 않는다.
const HR_SUBJECT = 'hr';

function hashPin(pin) {
  return crypto.scryptSync(String(pin), PIN_SALT, 32).toString('hex');
}

function verifyPin(pin, pinHash) {
  if (!pinHash) return false;
  const a = Buffer.from(hashPin(pin), 'hex');
  const b = Buffer.from(pinHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function getSessionSecret() {
  if (!globalThis.__hmSessionSecret) {
    globalThis.__hmSessionSecret = process.env.HM_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  }
  return globalThis.__hmSessionSecret;
}

function signSession(employeeId) {
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(employeeId).digest('hex');
  return `${employeeId}.${sig}`;
}

function verifySession(token) {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const employeeId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(employeeId).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return employeeId;
}

/** HR 전용 라우트에서 쓰는 서버 사이드 게이트 — 세션 쿠키가 HR 로그인인지 확인한다. */
function isHrRequest() {
  const { cookies } = require('next/headers');
  const token = cookies().get('hm_session')?.value;
  return verifySession(token) === HR_SUBJECT;
}

module.exports = { DEFAULT_PIN, HR_SUBJECT, hashPin, verifyPin, signSession, verifySession, isHrRequest };
