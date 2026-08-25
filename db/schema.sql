-- Hire Match — 04_data_model.md 를 그대로 옮긴 SQLite 스키마.
-- SWIPE_SESSION(파티 모드)은 Tier 2라 트리밍했지만, swipe_log.session_id 컬럼은
-- 나중에 다시 붙일 수 있도록 nullable로 남겨뒀다.

CREATE TABLE IF NOT EXISTS persona (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  short      TEXT NOT NULL,
  department TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employee (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  department  TEXT NOT NULL,
  role        TEXT NOT NULL,
  persona_id  TEXT NOT NULL REFERENCES persona(id)
);
CREATE INDEX IF NOT EXISTS idx_employee_persona ON employee(persona_id);

CREATE TABLE IF NOT EXISTS candidate (
  id                  TEXT PRIMARY KEY,
  persona_id          TEXT NOT NULL REFERENCES persona(id),
  name                TEXT NOT NULL,
  headline            TEXT NOT NULL,
  one_liner           TEXT NOT NULL,
  years_of_experience INTEGER NOT NULL,
  metrics             TEXT NOT NULL, -- JSON: [[value,label], ...]
  career              TEXT NOT NULL, -- JSON: [{org,role,period,bullets:[]}, ...]
  tags                TEXT NOT NULL, -- JSON: string[]  (스코어링 입력값)
  signal_tags         TEXT NOT NULL, -- JSON: string[]  (직무 무관 공통 평가 축)
  education           TEXT NOT NULL,
  portfolio_url       TEXT,
  hired_status        TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | HIRED | REJECTED
  contacted_at        TEXT -- HR이 "컨택 진행"을 누른 시각(ISO). NULL이면 컨택 전.
);
CREATE INDEX IF NOT EXISTS idx_candidate_persona ON candidate(persona_id);

-- 모든 판단의 원천 기록. append-only — pass_reason만 사후에 PATCH로 채워 넣을 수 있다
-- (패스 사유 칩은 선택 사항이라, 스와이프 자체는 사유 없이 먼저 기록되고
--  칩을 누르면 그 필드만 업데이트된다. 시간 제한 없음).
CREATE TABLE IF NOT EXISTS swipe_log (
  id                TEXT PRIMARY KEY,
  persona_id        TEXT NOT NULL REFERENCES persona(id),
  employee_id       TEXT NOT NULL REFERENCES employee(id),
  candidate_id      TEXT NOT NULL REFERENCES candidate(id),
  session_id        TEXT, -- 파티 모드용, 현재 스코프에서는 미사용
  action            TEXT NOT NULL, -- PASS | LIKE | SUPER_LIKE
  pass_reason       TEXT,
  super_like_reason TEXT,
  created_at        TEXT NOT NULL -- ISO 8601
);
CREATE INDEX IF NOT EXISTS idx_log_persona ON swipe_log(persona_id);
CREATE INDEX IF NOT EXISTS idx_log_employee ON swipe_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_log_candidate ON swipe_log(candidate_id);
