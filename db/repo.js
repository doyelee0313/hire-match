/**
 * 데이터 접근 + 추천 스코어링 레이어. API 라우트는 전부 이 파일을 통해서만 DB를 만진다.
 * (원래 vanilla-JS 프로토타입의 prefProfile/scoreOf/votersOf/deckFor 로직을
 *  클라이언트 메모리 배열 대신 실제 SQLite 쿼리로 옮긴 버전.)
 */
const crypto = require('crypto');
const { getDb } = require('./client');

const ACT_WEIGHT = { LIKE: 1, SUPER_LIKE: 3 };

function rowToCandidate(row) {
  if (!row) return null;
  return {
    id: row.id,
    personaId: row.persona_id,
    name: row.name,
    headline: row.headline,
    oneLiner: row.one_liner,
    yearsOfExperience: row.years_of_experience,
    metrics: JSON.parse(row.metrics),
    career: JSON.parse(row.career),
    tags: JSON.parse(row.tags),
    signalTags: JSON.parse(row.signal_tags),
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

function prefProfile(personaId) {
  const db = getDb();
  const rows = db
    .prepare(`SELECT sl.action, c.tags FROM swipe_log sl
              JOIN candidate c ON c.id = sl.candidate_id
              WHERE sl.persona_id = ? AND sl.action != 'PASS'`)
    .all(personaId);
  const profile = {};
  for (const r of rows) {
    const w = ACT_WEIGHT[r.action] || 0;
    for (const t of JSON.parse(r.tags)) profile[t] = (profile[t] || 0) + w;
  }
  return profile;
}

function scoreOf(candidateTags, profile) {
  return candidateTags.reduce((sum, t) => sum + (profile[t] || 0), 0);
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
    .map((r) => ({
      employeeId: r.employee_id,
      employeeName: r.emp_name,
      employeeRole: r.emp_role,
      action: r.action,
      superLikeReason: r.super_like_reason,
      createdAt: r.created_at,
    }));
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
      score: scoreOf(c.tags, profile),
      voters,
      superd,
      passReasonCounts: passReasonCounts(c.id),
    };
  });
  scored.sort(
    (a, b) => (b.superd - a.superd) || (b.score - a.score) || a.candidate.id.localeCompare(b.candidate.id)
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
    return {
      employee,
      superLikes: s.superLikes,
      hired: s.hired,
      rejected: s.rejected,
      pending: s.pending,
      decided,
      accuracy: decided > 0 ? s.hired / decided : null,
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
};
