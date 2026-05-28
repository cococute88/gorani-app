# Gorani Telegram Notifications Worker

이 Worker는 Gorani Finance 앱에서 동기화한 알림 계획을 Cloudflare KV에 저장하고, Cloudflare Cron으로 5분마다 확인해 Telegram Bot API로 예약 알림을 발송합니다.

## 전제

- Cloudflare Workers Free 플랜을 기준으로 합니다.
- 유료 기능은 사용하지 않습니다.
- Cron은 `*/5 * * * *`, 즉 5분마다 실행합니다.
- 1분 Cron과 매번 KV list 조합은 무료 한도에 부담이 될 수 있어 사용하지 않습니다.

## KV Namespace 만들기

Cloudflare 대시보드 또는 Wrangler로 KV Namespace를 만듭니다.

```bash
wrangler kv namespace create GORANI_NOTIFICATIONS_KV
```

생성된 namespace id를 `wrangler.toml`의 아래 값에 넣어야 합니다.

```toml
[[kv_namespaces]]
binding = "GORANI_NOTIFICATIONS_KV"
id = "YOUR_KV_NAMESPACE_ID"
```

## Secret 등록

실제 Telegram Bot Token과 앱-Worker API key는 코드에 넣지 않고 secret으로 등록합니다.

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put GORANI_WORKER_API_KEY
```

`GORANI_WORKER_API_KEY`는 직접 정한 긴 랜덤 문자열을 사용하세요. 앱의 `.env`에도 같은 값을 넣어야 합니다.

## Telegram Bot 만들기

1. Telegram에서 `@BotFather`를 엽니다.
2. `/newbot`으로 Bot을 만들고 token을 받습니다.
3. 받은 token을 `TELEGRAM_BOT_TOKEN` secret으로 등록합니다.
4. 알림을 받을 채팅의 Chat ID를 확인합니다.
5. 앱 알림 탭의 Telegram Chat ID 입력칸에 Chat ID를 넣고 테스트 메시지를 보냅니다.

## 배포

의존성을 설치한 뒤 배포합니다.

```bash
npm install
npm run deploy
```

이 저장소에서는 실제 배포를 수행하지 않습니다. 사용자가 Cloudflare 계정과 KV namespace, secret을 준비한 뒤 직접 배포해야 합니다.

## 앱 환경변수

앱 `.env`에 아래 값을 넣습니다.

```bash
EXPO_PUBLIC_CF_WORKER_URL=https://your-worker.your-subdomain.workers.dev
EXPO_PUBLIC_GORANI_WORKER_API_KEY=직접_정한_긴_랜덤_문자열
```

`EXPO_PUBLIC_GORANI_WORKER_API_KEY`는 Worker secret `GORANI_WORKER_API_KEY`와 같아야 합니다.

## API

### POST /sync

앱이 현재 알림 계획을 Worker KV에 동기화합니다.

- Header: `X-Gorani-Api-Key`
- Body: `safeUid`, `scheduleRevision`, `telegramEnabled`, `chatId`, `notifications`

저장 key 구조:

- Manifest: `user:{safeUid}:manifest`
- Notification: `user:{safeUid}:rev:{scheduleRevision}:notification:{plannedNotificationId}`
- Sent key: `sent:{safeUid}:{scheduleRevision}:{plannedNotificationId}`

알림 key와 sent key에는 약 400일 TTL을 둡니다. 12개월 계획을 저장하므로 90일 TTL은 너무 짧습니다.

### POST /test

Telegram 연결 테스트 메시지를 보냅니다.

메시지:

```text
🦌 Gorani Finance 텔레그램 알림 연결 테스트입니다.
```

## Cron 발송 정책

Cron은 5분마다 실행되므로 알림은 최대 약 5분 늦을 수 있습니다.

발송 조건은 다음과 같습니다.

- `telegramEnabled = true`
- `notification.fireAtEpochMs <= nowMs`
- sent key 없음
- manifest의 `scheduleRevision`과 notification의 `scheduleRevision` 일치
- `notification.sent !== true`

`±3분 이내` 같은 조건은 사용하지 않습니다. Worker가 늦게 실행되어도 `fireAtEpochMs <= nowMs` 조건이므로 알림을 놓치지 않습니다.

Telegram API 실패 시 sent key를 만들지 않으므로 다음 Cron에서 다시 시도합니다.
