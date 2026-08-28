/**
 * better-sqlite3 커넥션 싱글턴.
 *
 * 원래 계획은 Prisma + SQLite였지만, 이 실행 환경의 네트워크 아웃바운드 정책이
 * Prisma 엔진 바이너리 다운로드 호스트(binaries.prisma.sh)를 막고 있어
 * `prisma generate`가 403으로 실패한다. better-sqlite3는 npm 레지스트리에서
 * 받은 소스를 로컬에서 네이티브로 빌드하기 때문에 같은 문제가 없다 — 여전히
 * 진짜 SQLite 파일 DB에 실제 SQL로 연결되고, Next.js 서버 재시작 후에도
 * 데이터가 그대로 남는다(=인메모리 상태가 아니다).
 *
 * Next.js dev 서버는 파일 변경마다 모듈을 다시 평가할 수 있으므로,
 * globalThis에 커넥션을 캐시해 매 요청마다 새 DB 핸들을 여는 것을 방지한다.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { seedAll, resetAndSeed } = require('./seed.js');
const { DEFAULT_PIN, hashPin } = require('../lib/auth.js');

// Vercel 서버리스 환경은 배포 번들 파일시스템이 읽기 전용이라 /tmp에만 쓸 수 있다.
// /tmp는 함수 인스턴스가 바뀌면 초기화되므로 이 경우 데이터가 요청 사이에 영속되지 않는다
// (데모 배포용 트레이드오프 — 로컬/상시 서버에서는 지금처럼 프로젝트 폴더 밑에 영속 저장된다).
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'app.db')
  : path.join(process.cwd(), 'data', 'app.db');
// Next.js가 API 라우트를 웹팩으로 번들링하면 이 파일도 .next/server/chunks/*.js로
// 옮겨져 __dirname이 더 이상 실제 db/ 폴더를 가리키지 않는다. 항상 프로젝트 루트
// 기준(process.cwd())으로 schema.sql을 찾아야 프로덕션 빌드(next build/start)에서도 깨지지 않는다.
const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql');

function openDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  // candidate가 구 스키마(axis_scores/skills/certifications 이전)라면 컬럼을 이어 붙일 방법이
  // 없다 — 전체를 지우고 최신 스키마로 다시 시딩한다.
  const candidateCols = db.prepare('PRAGMA table_info(candidate)').all().map((c) => c.name);
  if (candidateCols.length && (!candidateCols.includes('axis_scores') || !candidateCols.includes('skills') || !candidateCols.includes('cover_letter'))) {
    db.exec(`
      DROP TABLE IF EXISTS decision_log;
      DROP TABLE IF EXISTS swipe_log;
      DROP TABLE IF EXISTS candidate;
      DROP TABLE IF EXISTS employee;
      DROP TABLE IF EXISTS persona;
    `);
    db.exec(schema);
  }

  // schema.sql의 CREATE TABLE은 새 DB에만 적용되므로, 기존 app.db 파일에는
  // pin_hash 컬럼이 없을 수 있다 — 있는지 확인 후 없으면 직접 추가한다.
  const employeeCols = db.prepare('PRAGMA table_info(employee)').all().map((c) => c.name);
  if (!employeeCols.includes('pin_hash')) {
    db.exec('ALTER TABLE employee ADD COLUMN pin_hash TEXT');
  }
  if (!employeeCols.includes('is_lead')) {
    db.exec('ALTER TABLE employee ADD COLUMN is_lead INTEGER NOT NULL DEFAULT 0');
  }

  // candidate.channel도 같은 이유로 기존 DB에는 없을 수 있다. axis_scores 마이그레이션과 달리
  // channel은 순수 추가 컬럼(기존 데이터 손실 없음)이라 드롭 없이 ALTER로 붙인다.
  const candidateColsNow = db.prepare('PRAGMA table_info(candidate)').all().map((c) => c.name);
  if (!candidateColsNow.includes('channel')) {
    db.exec('ALTER TABLE candidate ADD COLUMN channel TEXT');
  }

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM persona').get();
  if (n === 0) {
    const counts = seedAll(db);
    console.log('[hire-match] 최초 실행 — DB 자동 시딩:', counts);
  }

  // 로그인 PIN이 아직 없는 실무진(신규 시딩 포함)에게 데모용 기본 PIN을 채워준다.
  db.prepare('UPDATE employee SET pin_hash = ? WHERE pin_hash IS NULL').run(hashPin(DEFAULT_PIN));

  return db;
}

function getDb() {
  if (!globalThis.__hireMatchDb) {
    globalThis.__hireMatchDb = openDb();
  }
  return globalThis.__hireMatchDb;
}

module.exports = { getDb, resetAndSeed, DB_PATH };
