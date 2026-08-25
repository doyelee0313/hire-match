/**
 * 수동 시딩 CLI.
 *   node scripts/seed.js            — 비어 있을 때만 시딩 (npm run db:seed)
 *   node scripts/seed.js --reset    — 전부 지우고 다시 시딩 (npm run db:reset)
 *
 * 참고: `npm run dev`/`npm start`로 서버를 처음 띄울 때도 db/client.js가
 * 테이블이 비어 있으면 자동으로 시딩하므로, 보통은 이 스크립트를 직접 돌릴 필요가 없다.
 */
const { getDb, resetAndSeed } = require('../db/client');
const { seedAll } = require('../db/seed');

const reset = process.argv.includes('--reset');
const db = getDb(); // 이미 이 시점에 비어있던 DB는 자동 시딩됨

if (reset) {
  const counts = resetAndSeed(db);
  console.log('[hire-match] DB를 초기화하고 다시 시딩했습니다:', counts);
} else {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM persona').get();
  console.log(`[hire-match] 현재 persona ${n}건 — 이미 시딩되어 있습니다. (다시 시드하려면 --reset)`);
}
