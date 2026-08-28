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
  persona_id  TEXT NOT NULL REFERENCES persona(id),
  pin_hash    TEXT, -- 로그인용 PIN 해시. 기존 DB 파일에는 없을 수 있어 db/client.js가 부팅 시 마이그레이션한다.
  is_lead     INTEGER NOT NULL DEFAULT 0 -- 리더십 여부(멘토링 피드백 반영: Day6_3_1).
              -- 리더의 Super Like만 패스트트랙(추천 리스트 상단 고정)으로 작동하고, 그 외 실무진의
              -- Super Like는 여전히 기록·집계되지만 "참고 신호"로만 표시된다 — 신입/일반 실무진에게
              -- 면접 프리패스에 준하는 권한을 그대로 주면, 면접 대상자가 늘어나 원래 풀려던 시간
              -- 병목이 재현되는 자기모순이 생긴다는 지적을 반영.
);
CREATE INDEX IF NOT EXISTS idx_employee_persona ON employee(persona_id);

CREATE TABLE IF NOT EXISTS candidate (
  id                  TEXT PRIMARY KEY,
  persona_id          TEXT NOT NULL REFERENCES persona(id),
  name                TEXT NOT NULL,
  headline            TEXT NOT NULL,
  one_liner           TEXT NOT NULL,
  years_of_experience INTEGER NOT NULL,
  metrics             TEXT NOT NULL, -- JSON: [[value,label], ...] (HR 상세 화면에서만 표시)
  career              TEXT NOT NULL, -- JSON: [{org,role,period,bullets:[]}, ...] — 경력 타임라인 + 주요 프로젝트
  skills              TEXT NOT NULL, -- JSON: string[] — 이력서에 명시된 보유 기술 (실무진 카드에 노출)
  certifications      TEXT NOT NULL, -- JSON: string[] — 자격증, 없으면 빈 배열
  cover_letter        TEXT NOT NULL, -- JSON: {motivation, experience} — 자기소개서(지원 동기·주요 경험)
  axis_scores         TEXT NOT NULL, -- JSON: [{id,label,weight,score,scope:'persona'|'common'}, ...] — lib/evaluationAxes.js가 SSOT, HR 화면 전용
  channel             TEXT, -- 유입 채널(원티드/잡코리아/원픽-잡코리아/링크드인/사람인/그룹바이). 스와이프 카드엔 노출하지 않는다 —
                             -- 채널은 개별 판정의 사전 정보가 아니라 사이클 종료 후 채널 운영을 검토할 때만 쓰는 값이라, HR 인사이트 집계 전용으로 둔다.
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

-- HR이 "컨택 진행" 전에 남기는 최종 결정 체크리스트 (POPUP Studio 채용 결정 게이트 6문항 참고).
-- 후보 하나에 여러 번 기록될 수 있어 append-only로 두고, 최신 1건만 화면에 노출한다.
CREATE TABLE IF NOT EXISTS decision_log (
  id            TEXT PRIMARY KEY,
  candidate_id  TEXT NOT NULL REFERENCES candidate(id),
  position_fit  INTEGER NOT NULL DEFAULT 0, -- 포지션 적합성
  contribution  INTEGER NOT NULL DEFAULT 0, -- 기여도
  irreplaceable INTEGER NOT NULL DEFAULT 0, -- 대체불가능성
  role_fit      INTEGER NOT NULL DEFAULT 0, -- 직무 적합성 (원문 "FDE 적합성"을 이 앱 맥락으로 일반화)
  roi_ok        INTEGER NOT NULL DEFAULT 0, -- ROI
  loyalty_ok    INTEGER NOT NULL DEFAULT 0, -- 충성도
  note          TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decision_candidate ON decision_log(candidate_id);
