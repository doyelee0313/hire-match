# Hire Match

코드프레소 사내 채용 판단 기록 툴. 실무진이 지원자 카드를 스와이프(패스 / 좋아요 / 수퍼라이크)하면
그 판단이 실시간으로 SQLite에 쌓이고, HR은 "누가, 왜 좋아했는지" 근거와 함께 태그 기반 추천 리스트를
받아본다.

**스택**: Next.js 14 (App Router) + React 18 · SQLite (better-sqlite3) · SWR

> 원래 계획은 Prisma + SQLite였지만, 이 저장소를 만든 실행 환경의 네트워크 정책이 Prisma 엔진
> 바이너리 다운로드 호스트(`binaries.prisma.sh`)를 막고 있어 `prisma generate`가 403으로 실패했다.
> 그래서 npm 레지스트리에서 받아 로컬에서 네이티브로 빌드되는 `better-sqlite3`로 바꿨다 — 여전히
> 진짜 SQLite 파일 DB에 실제 SQL로 연결되고, 서버 재시작 후에도 데이터가 그대로 남는다 (인메모리
> 상태가 아니다). 이후 다른 환경에서 Prisma 사용이 가능하다면 `db/` 폴더만 스키마를 옮겨 대체하면 된다.

## 시작하기

```bash
npm install
npm run dev
```

`http://localhost:3000`을 열면 끝이다. 별도 마이그레이션/시드 명령이 필요 없다 — 서버가 처음 뜰 때
`data/app.db`가 없으면 자동으로 스키마를 만들고 시드 데이터(직무 3개, 실무진 10명, 지원자 36명,
판단 기록 30여 건)를 채운다.

DB를 초기 상태로 되돌리고 싶으면:

```bash
npm run db:reset
```

프로덕션 빌드:

```bash
npm run build
npm start
```

UI 스모크 테스트 (Playwright, 서버가 떠 있어야 함):

```bash
BASE_URL=http://localhost:3000 npm run smoke
```

## 프로젝트 구조

| 경로 | 역할 |
|---|---|
| `db/schema.sql` | SQLite 테이블 정의 (persona / employee / candidate / swipe_log) |
| `db/seed-data.js` | 시드 데이터 원본 (직무 · 실무진 · 지원자 36명 · 판단 로그) |
| `db/seed.js` | 시드 삽입 로직 |
| `db/client.js` | better-sqlite3 커넥션 싱글턴, 최초 부팅 시 자동 마이그레이션 + 자동 시딩 |
| `db/repo.js` | 모든 쿼리 + 추천 스코어링 로직 (API 라우트는 이 파일만 통해 DB에 접근) |
| `app/api/*` | Next.js Route Handlers (아래 API 목록 참고) |
| `components/*` | 클라이언트 React 컴포넌트 |
| `lib/*` | fetch 헬퍼, 상수, 포맷터 |
| `scripts/seed.js` | 수동 시딩 CLI |
| `scripts/smoke.js` | Playwright UI 스모크 테스트 |

## API

| Method & Path | 설명 |
|---|---|
| `GET /api/employees` | 실무진 목록 + 직무(persona) 목록 |
| `GET /api/deck?employeeId=` | 로그인한 실무진의 **본인 직무 채용만** 담긴 미판단 덱 |
| `POST /api/swipes` | 스와이프 기록 `{ employeeId, candidateId, action, superLikeReason? }` — `persona_id`는 서버가 employee 레코드로 직접 채워서, 클라이언트 조작으로 다른 직무를 판단할 수 없다 |
| `PATCH /api/swipes/:id` | 패스 사유를 나중에(시간 제한 없이) 붙인다 `{ passReason }` |
| `GET /api/recommendations?personaId=` | 태그 기반 스코어 + 수퍼라이크 패스트트랙 + "누가 왜 좋아했는지" |
| `GET /api/leaderboard?personaId=` | 실무진별 Super Like 적중률(안목 랭킹) |
| `GET /api/logs?personaId=` | SWIPE_LOG 테이블 뷰 |
| `POST /api/candidates/:id/contact` | HR "컨택 진행" — `contacted_at`을 DB에 영구 기록 |

## 기능

- **직무 접근 제한** — 각 실무진(`employee`)은 `persona_id`로 자신의 직무에 고정되어 있다. 개발팀
  실무진은 개발자 채용만, 세일즈팀은 세일즈 채용만 보인다. 이 제한은 클라이언트뿐 아니라
  `POST /api/swipes`에서도 서버가 강제한다 (다른 직무의 후보를 판단하려 하면 400 에러).
- **이력서형 카드** — 회사명·연차를 앞세우지 않고, 핵심 경력 타임라인·정량 지표·스킬 태그·강점
  신호 위주로 한 사람의 이력을 카드 하나에 압축했다. 카드 본문은 내부 스크롤이 가능하고, 스크롤
  중에는 스와이프 제스처가 시작되지 않는다.
- **패스 사유는 선택 + 무제한** — 패스하면 사유 칩이 뜨지만 자동으로 닫히지 않는다. 칩을 고르거나
  "건너뛰기"를 눌러야만 닫힌다.
- **수퍼라이크** — 한 줄 사유를 남기면 "왜 이 사람인가"가 HR 추천 화면에 그대로 노출되고,
  스코어와 무관하게 패스트트랙으로 상단에 고정된다.
- **HR 추천** — `직무별` 좋아요/수퍼라이크 태그 빈도로 만든 선호 프로필과 후보 태그를 매칭해
  스코어를 매긴다. 각 후보 카드에는 좋아요한 실무진 명단과 수퍼라이크 사유가 근거로 붙는다.
- **안목 랭킹** — 실무진별 Super Like 적중률(HR 화면 "안목" 탭). 적중률 = `hired / (hired + rejected)`이고,
  아직 결과가 안 나온(`PENDING`) 픽은 분모에서 제외한다 — 판정이 안 났을 뿐인 픽을 실패로 세지 않기
  위해서다. 결정된 판단이 하나도 없는 실무진은 순위 없이 "판정 대기"로만 뜨고, 적중률 최상위 1명에게만
  "이달의 인재 스카우터" 배지가 붙는다.
- **기록 탭** — 모든 판단이 append-only로 SWIPE_LOG에 쌓이고 시각순으로 조회할 수 있다.
- **컨택 진행** — HR이 후보를 컨택하면 `contacted_at`이 DB에 기록되어, 서버를 재시작해도
  "컨택 완료" 상태가 유지된다.

## 추천 스코어링 (의사코드)

```
prefProfile(personaId):
  각 태그의 가중치 = 그 직무에서 해당 태그를 가진 후보에게 쌓인
                     (LIKE=1점, SUPER_LIKE=3점, PASS=0점)의 합

scoreOf(candidate, profile):
  candidate.tags 각각의 profile 가중치를 합산

정렬 순서:
  1. 수퍼라이크(패스트트랙) 여부 — 있으면 최상단, ★ 표시
  2. score 내림차순
  3. candidate_id
```

## 데이터 모델

`04_data_model.md`를 그대로 옮겼다 (컬럼명만 SQL 관례에 맞게 snake_case):

- **persona** — 채용 직무 단위 (`dev` / `edu` / `sales`)
- **employee** — 스와이프하는 실무진. `persona_id`가 접근 가능한 채용을 고정한다
- **candidate** — 지원자 카드. `metrics` / `career` / `tags` / `signal_tags`는 JSON 컬럼
- **swipe_log** — 모든 판단의 원천 기록. append-only, `pass_reason`만 사후 PATCH로 채워진다

## 만들지 않은 것

- 지원자 화면 (실무진/HR 전용 내부 툴)
- 실제 이력서 파싱/AI — 지원자 데이터는 목업 시드
- 실제 이메일 발송 — "메일 발송" 토스트는 시뮬레이션
- 로그인/인증 — 실무진 선택은 셀렉트 박스로 신원을 바꾸는 데모용 스위처
- 파티 모드(SWIPE_SESSION) — 스키마에 `session_id` 컬럼만 남겨뒀다
