/**
 * Playwright UI 스모크 테스트. `npm run start`로 띄운 서버(기본 http://localhost:3100)를 대상으로 한다.
 * 사용법: BASE_URL=http://localhost:3100 node scripts/smoke.js
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];
  const results = {};

  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.scard');

  // 로고
  results.logoCount = await page.locator('img.logo').count();

  // 실무진 피커에서 세일즈 직원(e09)으로 전환 → 헤더가 B2B 세일즈로 바뀌는지 (직무 접근 제한)
  await page.selectOption('#empPick', 'e09');
  await page.waitForTimeout(400);
  results.salesHeader = await page.locator('h2').innerText();

  // 다시 개발 직원(e01)으로
  await page.selectOption('#empPick', 'e01');
  await page.waitForTimeout(400);
  results.devHeader = await page.locator('h2').innerText();

  // 패스 → 사유 패널이 열리고, 3.5초 넘게 기다려도 자동으로 안 닫히는지 (시간 제한 없음)
  await page.click('.act:not(.like):not(.super)');
  await page.waitForTimeout(500);
  results.reasonOpenImmediately = await page.locator('.reason').count();
  await page.waitForTimeout(3500);
  results.reasonStillOpenAfter3_5s = await page.locator('.reason').count();
  await page.click('.reason [class*="btn-text"]'); // 건너뛰기
  await page.waitForTimeout(300);

  // 수퍼라이크 플로우
  await page.click('.act.super');
  await page.waitForSelector('.modal');
  await page.fill('.modal input', '스모크 테스트 사유');
  await page.click('.modal [class*="btn"]:not(.btn-2)');
  await page.waitForTimeout(600);
  results.toastAfterSuper = await page.locator('.toast').count();

  // HR 화면
  await page.click('button:has-text("HR")');
  await page.waitForTimeout(400);
  results.recRows = await page.locator('.recrow').count();
  await page.click('.recrow >> nth=0');
  await page.waitForTimeout(300);
  results.detailOpen = await page.locator('.detailcard').count();
  const contactBtn = page.locator('.detailcard button.full');
  results.contactBtnText = await contactBtn.innerText();
  await contactBtn.click();
  await page.waitForTimeout(400);
  results.contactBtnTextAfter = await contactBtn.innerText();

  // 안목 랭킹 탭 — 개발자 페르소나는 e01이 2건 모두 HIRED라 배지가 붙어야 한다
  await page.click('button:has-text("안목")');
  await page.waitForTimeout(400);
  results.leaderboardRows = await page.locator('table.data tbody tr').count();
  results.leaderboardBadgeCount = await page.locator('text=이달의 인재 스카우터').count();

  // 기록 탭
  await page.click('button:has-text("기록")');
  await page.waitForTimeout(400);
  results.logRows = await page.locator('table.data tbody tr').count();

  // 모바일 뷰포트 가로 스크롤 체크
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(300);
  results.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  results.errors = errors.length ? errors.slice(0, 10) : 'none';

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE FAILED:', e);
  process.exit(1);
});
