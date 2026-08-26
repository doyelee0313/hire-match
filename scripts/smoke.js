/**
 * Playwright UI 스모크 테스트. `npm run start`로 띄운 서버(기본 http://localhost:3100)를 대상으로 한다.
 * 사용법: BASE_URL=http://localhost:3100 node scripts/smoke.js
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';

async function login(page, name, pin = '0000') {
  await page.click(`.pcard:has-text("${name}")`);
  await page.fill('.modal input[type="password"]', pin);
  await page.click('.modal button.btn:not(.btn-2)');
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];
  const results = {};

  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // 로그인 화면 → 개발팀 실무진(김도현) 카드 선택 → PIN 로그인
  results.loginScreenCardCount = await page.locator('.pcard').count();
  await login(page, '김도현');
  await page.waitForSelector('.scard');

  // 로고
  results.logoCount = await page.locator('img.logo').count();
  results.devHeaderAfterLogin = await page.locator('h2').innerText();

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

  // 로그아웃 → 세일즈 실무진(강태우)으로 재로그인 → 직무 접근 제한(로그인이 신원을 고정하는지) 확인
  await page.click('button:has-text("로그아웃")');
  await page.waitForSelector('.pcard');
  await login(page, '강태우');
  await page.waitForSelector('.scard');
  results.salesHeaderAfterRelogin = await page.locator('h2').innerText();

  // 실무진 계정으로는 HR 화면 진입 UI 자체가 없는지 (역할 토글 버튼 없음)
  results.hrToggleHiddenForStaff = (await page.locator('button:has-text("HR")').count()) === 0;

  // 로그아웃 → HR로 로그인
  await page.click('button:has-text("로그아웃")');
  await page.waitForSelector('.pcard');
  await login(page, 'HR 담당자');
  await page.waitForTimeout(400);
  results.recRows = await page.locator('.recrow').count();
  await page.click('.recrow >> nth=0');
  await page.waitForTimeout(300);
  results.detailOpen = await page.locator('.detailcard').count();
  const contactBtn = page.locator('.detailcard button.btn.full');
  results.contactBtnText = await contactBtn.innerText();
  await contactBtn.click();
  await page.waitForTimeout(400);
  results.contactBtnTextAfter = await contactBtn.innerText();

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
