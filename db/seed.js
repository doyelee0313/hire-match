/**
 * 시드 로직. seed-data.js(원본 vanilla-JS 시드와 동일한 데이터)를 better-sqlite3로 삽입한다.
 * db/client.js가 최초 부팅 시 테이블이 비어 있으면 자동으로 seedAll()을 호출하므로,
 * `npm install && npm run dev`만으로 바로 데모가 가능하다.
 */
const { PERSONAS, EMPLOYEES, CANDIDATES, SEED_LOGS } = require('./seed-data');

function seedAll(db) {
  const insertPersona = db.prepare(
    `INSERT INTO persona (id, title, short, department) VALUES (?, ?, ?, ?)`
  );
  const insertEmployee = db.prepare(
    `INSERT INTO employee (id, name, department, role, persona_id) VALUES (?, ?, ?, ?, ?)`
  );
  const insertCandidate = db.prepare(`
    INSERT INTO candidate
      (id, persona_id, name, headline, one_liner, years_of_experience,
       metrics, career, skills, certifications, cover_letter, axis_scores, channel, education, portfolio_url, hired_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLog = db.prepare(`
    INSERT INTO swipe_log
      (id, persona_id, employee_id, candidate_id, session_id, action, pass_reason, super_like_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const p of PERSONAS) {
      insertPersona.run(p.persona_id, p.title, p.short, p.department);
    }
    for (const e of EMPLOYEES) {
      insertEmployee.run(e.employee_id, e.name, e.department, e.role, e.persona_id);
    }
    for (const c of CANDIDATES) {
      insertCandidate.run(
        c.candidate_id, c.persona_id, c.name, c.headline, c.one_liner, c.years_of_experience,
        JSON.stringify(c.metrics), JSON.stringify(c.career),
        JSON.stringify(c.skills), JSON.stringify(c.certifications), JSON.stringify(c.cover_letter),
        JSON.stringify(c.axis_scores),
        c.channel || null, c.education, c.portfolio_url || null,
        c.hired_status || 'PENDING'
      );
    }
    for (const l of SEED_LOGS) {
      insertLog.run(
        l.log_id, l.persona_id, l.employee_id, l.candidate_id, l.session_id,
        l.action, l.pass_reason, l.super_like_reason, l.created_at
      );
    }
  });
  tx();

  return {
    personas: PERSONAS.length,
    employees: EMPLOYEES.length,
    candidates: CANDIDATES.length,
    logs: SEED_LOGS.length,
  };
}

function resetAndSeed(db) {
  db.exec(`
    DELETE FROM decision_log;
    DELETE FROM swipe_log;
    DELETE FROM candidate;
    DELETE FROM employee;
    DELETE FROM persona;
  `);
  return seedAll(db);
}

module.exports = { seedAll, resetAndSeed };
