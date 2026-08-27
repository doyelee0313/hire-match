/**
 * 데이터 접근 + 추천 스코어링 레이어. API 라우트는 전부 이 파일을 통해서만 DB를 만진다.
 * (원래 vanilla-JS 프로토타입의 prefProfile/scoreOf/votersOf/deckFor 로직을
 *  클라이언트 메모리 배열 대신 실제 SQLite 쿼리로 옮긴 버전.)
 */
const crypto = require('crypto');
const { getDb } = require('./client');
const { verifyPin } = require('../lib/auth');
const { fitScore } = require('../lib/evaluationAxes');

const ACT_WEIGHT = { LIKE: 1, SUPER_LIKE: 3 };

// 후보의 평가 축 점수가 이 값 이상이면, 추천 스코어링/인사이트 집계에서 "이 축을 가졌다"고 취급한다.
// 예전 tags/signal_tags 자리를 대신하는 파생 어휘 — 알고리즘(가중 빈도 매칭)은 그대로 두고
// 입력 어휘만 임의 키워드에서 표준화된 평가 축으로 바꾼 것.
const AXIS_TAG_THRESHOLD = 65;

function derivedAxisLabels(axisScores, scope) {
  return axisScores.filter((a) => a.scope === scope && a.score >= AXIS_TAG_THRESHOLD).map((a) => a.label);
}

function rowToCandidate(row) {
  if (!row) return null;
  const axisScores = JSON.parse(row.axis_scores);
  return {
    id: row.id,
    personaId: row.persona_id,
    name: row.name,
    headline: row.headline,
    oneLiner: row.one_liner,
    yearsOfExperience: row.years_of_experience,
    metrics: JSON.parse(row.metrics),
    career: JSON.parse(row.career),
    skills: JSON.parse(row.skills),
    certifications: JSON.parse(row.certifications),
    coverLetter: JSON.parse(row.cover_letter),
    axisScores,
    fitScore: fitScore(axisScores),
    channel: row.channel,
    education: row.education,
    portfolioUrl: row.portfolio_url,
    hiredStatus: row.hired_status,
    contactedAt: row.contacted_at,
  };
}

function rowToEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    role: row.role,
    personaId: row.persona_id,
  };
}

function rowToPersona(row) {
  if (!row) return null;
  return { id: row.id, title: row.title, short: row.short, department: row.department };
}

function listPersonas() {
  const db = getDb();
  return db.prepare('SELECT * FROM persona ORDER BY rowid').all().map(rowToPersona);
}

function getPersona(id) {
  const db = getDb();
  return rowToPersona(db.prepare('SELECT * FROM persona WHERE id = ?').get(id));
}

function listEmployees() {
  const db = getDb();
  return db.prepare('SELECT * FROM employee ORDER BY rowid').all().map(rowToEmployee);
}

function getEmployee(id) {
  const db = getDb();
  return rowToEmployee(db.prepare('SELECT * FROM employee WHERE id = ?').get(id));
}

/** 로그인 — pin_hash는 rowToEmployee가 밖으로 내보내지 않으므로 여기서 직접 조회해 검증한다. */
function verifyEmployeePin(employeeId, pin) {
  const db = getDb();
  const row = db.prepare('SELECT pin_hash FROM employee WHERE id = ?').get(employeeId);
  return !!row && verifyPin(pin, row.pin_hash);
}

function getCandidate(id) {
  const db = getDb();
  return rowToCandidate(db.prepare('SELECT * FROM candidate WHERE id = ?').get(id));
}

function poolOf(personaId) {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM candidate WHERE persona_id = ? AND hired_status = 'PENDING' ORDER BY id`)
    .all(personaId)
    .map(rowToCandidate);
}

/** 실무진 한 명 기준 아직 판단하지 않은 후보 덱. 전체적으로 판단이 적게 쌓인 후보를 먼저 보여준다. */
function deckFor(personaId, employeeId) {
  const db = getDb();
  const judged = new Set(
    db.prepare('SELECT candidate_id FROM swipe_log WHERE employee_id = ?').all(employeeId)
      .map((r) => r.candidate_id)
  );
  const seenRows = db.prepare('SELECT candidate_id, COUNT(*) AS n FROM swipe_log GROUP BY candidate_id').all();
  const seen = Object.fromEntries(seenRows.map((r) => [r.candidate_id, r.n]));

  return poolOf(personaId)
    .filter((c) => !judged.has(c.id))
    .sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0) || a.id.localeCompare(b.id));
}

function logsOfPersona(personaId) {
  const db = getDb();
  return db.prepare('SELECT * FROM swipe_log WHERE persona_id = ?').all(personaId);
}

/** 직무 특화 평가 축(scope='persona') 기준 선호 프로필 — LIKE=1, SUPER_LIKE=3 가중 빈도. */
function prefProfile(personaId) {
  const db = getDb();
  const rows = db
    .prepare(`SELECT sl.action, c.axis_scores FROM swipe_log sl
              JOIN candidate c ON c.id = sl.candidate_id
              WHERE sl.persona_id = ? AND sl.action != 'PASS'`)
    .all(personaId);
  const profile = {};
  for (const r of rows) {
    const w = ACT_WEIGHT[r.action] || 0;
    for (const label of derivedAxisLabels(JSON.parse(r.axis_scores), 'persona')) {
      profile[label] = (profile[label] || 0) + w;
    }
  }
  return profile;
}

function scoreOf(candidateAxisScores, profile) {
  return derivedAxisLabels(candidateAxisScores, 'persona').reduce((sum, label) => sum + (profile[label] || 0), 0);
}

/** prefProfile과 동일한 가중치로 공통 평가 축(scope='common') 빈도를 집계한다. */
function signalProfile(personaId) {
  const db = getDb();
  const rows = db
    .prepare(`SELECT sl.action, c.axis_scores FROM swipe_log sl
              JOIN candidate c ON c.id = sl.candidate_id
              WHERE sl.persona_id = ? AND sl.action != 'PASS'`)
    .all(personaId);
  const profile = {};
  for (const r of rows) {
    const w = ACT_WEIGHT[r.action] || 0;
    for (const label of derivedAxisLabels(JSON.parse(r.axis_scores), 'common')) {
      profile[label] = (profile[label] || 0) + w;
    }
  }
  return profile;
}

// 이 이상 판단해야 "채용 페르소나"를 HR에게 보여줄 만큼 신뢰할 만하다고 본다.
// 덱을 다 비워야 하는 게 아니라, 스와이프한 만큼 실시간으로 갱신되는 값이다.
const PERSONA_MIN_SWIPES = 3;

// 실무진 개인 취향 페르소나 타이틀 생성용 — 공통 평가 축 4종을 짧은 형용사로 매핑.
const SIGNAL_ADJ = {
  '커뮤니케이션 명료성': '설득형',
  '문제 해결·실행 지향': '완주형',
  '협업·공유 마인드': '동료형',
  '자기주도 학습': '탐구형',
};

/** 실무진 본인이 좋아요/수퍼라이크한 후보들의 평가 축으로 만든 "채용 페르소나". */
function employeeTasteProfile(employeeId) {
  const db = getDb();
  const employee = getEmployee(employeeId);
  if (!employee) throw new Error('알 수 없는 실무진입니다.');

  const rows = db
    .prepare(
      `SELECT sl.action, c.axis_scores FROM swipe_log sl
       JOIN candidate c ON c.id = sl.candidate_id
       WHERE sl.employee_id = ?`
    )
    .all(employeeId);

  const totalSwipes = rows.length;
  const likeCount = rows.filter((r) => r.action === 'LIKE').length;
  const superLikeCount = rows.filter((r) => r.action === 'SUPER_LIKE').length;
  const passCount = rows.filter((r) => r.action === 'PASS').length;

  const tagProfile = {};
  const signalProfileLocal = {};
  for (const r of rows) {
    if (r.action === 'PASS') continue;
    const w = ACT_WEIGHT[r.action] || 0;
    const axisScores = JSON.parse(r.axis_scores);
    for (const label of derivedAxisLabels(axisScores, 'persona')) tagProfile[label] = (tagProfile[label] || 0) + w;
    for (const label of derivedAxisLabels(axisScores, 'common')) signalProfileLocal[label] = (signalProfileLocal[label] || 0) + w;
  }

  const topTags = topEntries(tagProfile, 3);
  const topSignalTags = topEntries(signalProfileLocal, 2);

  const adjective = topSignalTags.length ? SIGNAL_ADJ[topSignalTags[0].tag] || '균형형' : '균형형';
  const noun = topTags.length ? topTags[0].tag : employee.role;

  return {
    employee,
    totalSwipes,
    likeCount,
    superLikeCount,
    passCount,
    topTags,
    topSignalTags,
    title: `${adjective} ${noun} 헌터`,
  };
}

function topEntries(profile, n) {
  return Object.entries(profile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag, weight]) => ({ tag, weight }));
}

/** 후보별이 아니라 직무 전체 기준 패스 사유 집계 (HR 인사이트용). */
function passReasonBreakdownForPersona(personaId) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pass_reason, COUNT(*) AS n FROM swipe_log
       WHERE persona_id = ? AND action = 'PASS' AND pass_reason IS NOT NULL
       GROUP BY pass_reason ORDER BY n DESC`
    )
    .all(personaId);
  return rows.map((r) => ({ reason: r.pass_reason, count: r.n }));
}

/**
 * 채널별 반응률(HR 인사이트 전용) — 접수 채널은 개별 판정의 사전 정보로 쓰지 않지만,
 * 사이클이 쌓인 뒤 "어느 채널이 실제로 반응 좋은 후보를 데려왔는가"를 되짚어보는 용도.
 * 스와이프 카드에는 노출하지 않는다(db/schema.sql의 channel 컬럼 주석 참고).
 */
function channelInsights(personaId) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.channel AS channel,
              COUNT(DISTINCT c.id) AS candidates,
              COUNT(DISTINCT CASE WHEN sl.action IN ('LIKE','SUPER_LIKE') THEN c.id END) AS reacted
       FROM candidate c
       LEFT JOIN swipe_log sl ON sl.candidate_id = c.id
       WHERE c.persona_id = ? AND c.channel IS NOT NULL
       GROUP BY c.channel
       ORDER BY candidates DESC`
    )
    .all(personaId);
  return rows.map((r) => ({
    channel: r.channel,
    candidates: r.candidates,
    reacted: r.reacted,
    reactRate: r.candidates ? r.reacted / r.candidates : 0,
  }));
}

/** HR 인사이트 패널 — 이 직무에서 실무진이 실제로 반응한 태그/강점신호/패스 사유/채널. */
function personaInsights(personaId) {
  return {
    topTags: topEntries(prefProfile(personaId), 5),
    topSignalTags: topEntries(signalProfile(personaId), 3),
    passReasons: passReasonBreakdownForPersona(personaId).slice(0, 3),
    channels: channelInsights(personaId),
  };
}

/** 직무 전체 기준 최근 Super Like된 후보 ID들 (최신순, 중복 제거) — 추천 리스트 행에 "최근" 배지로만 표시. */
function recentSuperLikeCandidateIds(personaId, limit) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT candidate_id, MAX(created_at) AS latest FROM swipe_log
       WHERE persona_id = ? AND action = 'SUPER_LIKE'
       GROUP BY candidate_id ORDER BY latest DESC LIMIT ?`
    )
    .all(personaId, limit);
  return rows.map((r) => r.candidate_id);
}

function rowToDecision(row) {
  if (!row) return null;
  return {
    id: row.id,
    candidateId: row.candidate_id,
    positionFit: !!row.position_fit,
    contribution: !!row.contribution,
    irreplaceable: !!row.irreplaceable,
    roleFit: !!row.role_fit,
    roiOk: !!row.roi_ok,
    loyaltyOk: !!row.loyalty_ok,
    note: row.note,
    createdAt: row.created_at,
  };
}

/** 후보 하나의 최신 결정 체크리스트 (없으면 null). */
function getDecision(candidateId) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM decision_log WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(candidateId);
  return rowToDecision(row);
}

/** HR 최종 결정 체크리스트 저장 (컨택 진행 전 6문항 + 메모). */
function saveDecision(candidateId, answers) {
  const db = getDb();
  const candidate = getCandidate(candidateId);
  if (!candidate) throw new Error('알 수 없는 후보입니다.');

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO decision_log
       (id, candidate_id, position_fit, contribution, irreplaceable, role_fit, roi_ok, loyalty_ok, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    candidateId,
    answers.positionFit ? 1 : 0,
    answers.contribution ? 1 : 0,
    answers.irreplaceable ? 1 : 0,
    answers.roleFit ? 1 : 0,
    answers.roiOk ? 1 : 0,
    answers.loyaltyOk ? 1 : 0,
    answers.note || null,
    createdAt
  );
  return getDecision(candidateId);
}

function votersOf(candidateId) {
  const db = getDb();
  const rows = db
    .prepare(`SELECT sl.*, e.name AS emp_name, e.role AS emp_role FROM swipe_log sl
              JOIN employee e ON e.id = sl.employee_id
              WHERE sl.candidate_id = ? AND sl.action != 'PASS'`)
    .all(candidateId);
  return rows
    .sort(
      (a, b) =>
        (a.action === 'SUPER_LIKE' ? 0 : 1) - (b.action === 'SUPER_LIKE' ? 0 : 1) ||
        new Date(b.created_at) - new Date(a.created_at)
    )
    .map((r) => {
      // 이 실무진의 지금까지 채용 페르소나 — HR이 "누가 좋아했는지"를 볼 때 그 사람 취향까지
      // 같이 참고할 수 있게, 판단 시점(candidate detail 조회 시점)의 최신 상태로 매번 계산한다.
      const profile = employeeTasteProfile(r.employee_id);
      return {
        employeeId: r.employee_id,
        employeeName: r.emp_name,
        employeeRole: r.emp_role,
        action: r.action,
        superLikeReason: r.super_like_reason,
        createdAt: r.created_at,
        voterPersonaTitle: profile.totalSwipes >= PERSONA_MIN_SWIPES ? profile.title : null,
      };
    });
}

function passReasonCounts(candidateId) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pass_reason, COUNT(*) AS n FROM swipe_log
       WHERE candidate_id = ? AND action = 'PASS' AND pass_reason IS NOT NULL
       GROUP BY pass_reason`
    )
    .all(candidateId);
  return Object.fromEntries(rows.map((r) => [r.pass_reason, r.n]));
}

/** HR 추천 리스트 — 수퍼라이크(패스트트랙) 우선, 그다음 태그 스코어 순. */
function recommendations(personaId) {
  const profile = prefProfile(personaId);
  const scored = poolOf(personaId).map((c) => {
    const voters = votersOf(c.id);
    const superd = voters.some((v) => v.action === 'SUPER_LIKE');
    return {
      candidate: c,
      score: scoreOf(c.axisScores, profile),
      voters,
      superd,
      passReasonCounts: passReasonCounts(c.id),
      decision: getDecision(c.id),
    };
  });
  // 목록에 보이는 숫자(종합 적합도)와 정렬 기준을 일치시킨다 — 다른 계산식(선호 매칭 score)으로
  // 정렬하면서 화면엔 종합 적합도를 보여주면, 리스트 순서와 상세에서 본 점수가 서로 안 맞아 보인다.
  scored.sort(
    (a, b) =>
      (b.superd - a.superd) || (b.candidate.fitScore - a.candidate.fitScore) || a.candidate.id.localeCompare(b.candidate.id)
  );
  return scored;
}

function logsForTable(personaId) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT sl.*, e.name AS emp_name, c.name AS cand_name FROM swipe_log sl
       JOIN employee e ON e.id = sl.employee_id
       JOIN candidate c ON c.id = sl.candidate_id
       WHERE sl.persona_id = ?
       ORDER BY sl.created_at DESC`
    )
    .all(personaId);
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    employeeName: r.emp_name,
    candidateName: r.cand_name,
    action: r.action,
    reason: r.pass_reason || r.super_like_reason || null,
  }));
}

/** persona_id는 클라이언트가 아니라 서버가 employee 레코드에서 직접 조회해 채운다 —
 *  직무 접근 제한을 API 레벨에서도 강제하기 위함 (클라이언트 조작으로 우회 불가). */
function insertSwipe({ employeeId, candidateId, action, passReason, superLikeReason }) {
  const db = getDb();
  const employee = getEmployee(employeeId);
  if (!employee) throw new Error('알 수 없는 실무진입니다.');
  const candidate = getCandidate(candidateId);
  if (!candidate) throw new Error('알 수 없는 후보입니다.');
  if (candidate.personaId !== employee.personaId) {
    throw new Error('본인 직무의 채용 후보만 판단할 수 있습니다.');
  }
  if (!['PASS', 'LIKE', 'SUPER_LIKE'].includes(action)) {
    throw new Error('알 수 없는 액션입니다.');
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO swipe_log (id, persona_id, employee_id, candidate_id, session_id, action, pass_reason, super_like_reason, created_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`
  ).run(
    id,
    employee.personaId,
    employeeId,
    candidateId,
    action,
    action === 'PASS' ? passReason || null : null,
    action === 'SUPER_LIKE' ? superLikeReason || null : null,
    createdAt
  );
  return { id, personaId: employee.personaId, employeeId, candidateId, action, createdAt };
}

/** 패스 사유 칩은 스와이프 직후 선택 사항으로 나중에(시간 제한 없이) 붙는다. */
function patchPassReason(logId, passReason) {
  const db = getDb();
  const info = db
    .prepare(`UPDATE swipe_log SET pass_reason = ? WHERE id = ? AND action = 'PASS'`)
    .run(passReason, logId);
  if (info.changes === 0) throw new Error('해당 판단 기록을 찾을 수 없습니다.');
  return { id: logId, passReason };
}

function setContacted(candidateId) {
  const db = getDb();
  const candidate = getCandidate(candidateId);
  if (!candidate) throw new Error('알 수 없는 후보입니다.');
  const contactedAt = new Date().toISOString();
  db.prepare('UPDATE candidate SET contacted_at = ? WHERE id = ?').run(contactedAt, candidateId);
  return { id: candidateId, contactedAt };
}

/**
 * 안목 랭킹 — 실무진별 Super Like 적중률. Super Like만 집계 대상이다(Like/Pass는 제외 —
 * 최종면접 패스트트랙으로 이어지는, 가장 무거운 판단이라 "안목"을 재는 기준으로 삼기에 적합하다).
 *
 * 적중률 = hired / (hired + rejected). 아직 결과가 안 나온 PENDING 후보에 대한 Super Like는
 * 분모에서 제외한다 — 판정이 안 났을 뿐인 픽을 실패로 셀 이유가 없기 때문 (제품 결정, 팀 확인 완료).
 * decided(=hired+rejected)가 0인 실무진은 순위·배지 대상에서 빠지고 "판정 대기"로만 표시된다.
 */
function leaderboard(personaId) {
  const db = getDb();
  const employees = listEmployees().filter((e) => e.personaId === personaId);
  const rows = db
    .prepare(
      `SELECT sl.employee_id, c.hired_status FROM swipe_log sl
       JOIN candidate c ON c.id = sl.candidate_id
       WHERE sl.persona_id = ? AND sl.action = 'SUPER_LIKE'`
    )
    .all(personaId);

  const stats = {};
  for (const e of employees) stats[e.id] = { superLikes: 0, hired: 0, rejected: 0, pending: 0 };
  for (const r of rows) {
    const s = stats[r.employee_id];
    if (!s) continue;
    s.superLikes += 1;
    if (r.hired_status === 'HIRED') s.hired += 1;
    else if (r.hired_status === 'REJECTED') s.rejected += 1;
    else s.pending += 1;
  }

  const board = employees.map((employee) => {
    const s = stats[employee.id];
    const decided = s.hired + s.rejected;
    // 채용 페르소나는 덱을 다 비워야 나오는 게 아니라, 스와이프한 만큼 실시간으로 쌓인다 —
    // 새 지원자가 계속 들어오는 구조라 "덱 완주"는 애초에 완성 기준이 될 수 없다.
    // PERSONA_MIN_SWIPES건 이상 판단하면 그 시점까지의 성향으로 타이틀을 보여준다.
    const profile = employeeTasteProfile(employee.id);
    return {
      employee,
      superLikes: s.superLikes,
      hired: s.hired,
      rejected: s.rejected,
      pending: s.pending,
      decided,
      accuracy: decided > 0 ? s.hired / decided : null,
      personaTitle: profile.totalSwipes >= PERSONA_MIN_SWIPES ? profile.title : null,
      personaSwipes: profile.totalSwipes,
    };
  });

  board.sort((a, b) => {
    const aRanked = a.decided > 0;
    const bRanked = b.decided > 0;
    if (aRanked !== bRanked) return aRanked ? -1 : 1;
    if (aRanked && b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    if (b.decided !== a.decided) return b.decided - a.decided;
    if (b.superLikes !== a.superLikes) return b.superLikes - a.superLikes;
    return a.employee.name.localeCompare(b.employee.name, 'ko');
  });

  const topId = board.length && board[0].decided > 0 ? board[0].employee.id : null;
  return board.map((row) => ({ ...row, badge: row.employee.id === topId }));
}

module.exports = {
  listPersonas,
  getPersona,
  listEmployees,
  getEmployee,
  verifyEmployeePin,
  getCandidate,
  poolOf,
  deckFor,
  logsOfPersona,
  prefProfile,
  scoreOf,
  votersOf,
  recommendations,
  logsForTable,
  leaderboard,
  insertSwipe,
  patchPassReason,
  setContacted,
  signalProfile,
  employeeTasteProfile,
  personaInsights,
  recentSuperLikeCandidateIds,
  getDecision,
  saveDecision,
};
