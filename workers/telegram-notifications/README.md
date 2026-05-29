# Gorani Telegram Notifications Worker

Cloudflare Worker that receives Gorani Finance Telegram notification plans, stores them in Cloudflare KV, and sends due messages with a 5-minute Cron trigger.

## Assumptions

- Uses Cloudflare Workers Free features.
- Uses KV for lightweight personal notification storage.
- Cron runs every 5 minutes: `*/5 * * * *`.
- 1-minute Cron is intentionally not used because frequent Cron + KV list/read work can put unnecessary pressure on the free tier.

## KV Namespace

Create a KV namespace:

```bash
wrangler kv namespace create GORANI_NOTIFICATIONS_KV
```

Put the generated namespace id into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "GORANI_NOTIFICATIONS_KV"
id = "YOUR_KV_NAMESPACE_ID"
```

## Secrets

Do not put real Telegram tokens or API keys in source files. Register them as Worker secrets:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put GORANI_WORKER_API_KEY
```

`GORANI_WORKER_API_KEY` should be a long random string that you choose. The app must use the same value in `EXPO_PUBLIC_GORANI_WORKER_API_KEY`.

## Telegram Bot

1. Open `@BotFather` in Telegram.
2. Create a bot with `/newbot`.
3. Register the token as the `TELEGRAM_BOT_TOKEN` Worker secret.
4. Find the chat id that should receive notifications.
5. Enter that chat id in the Gorani app notification tab and send a test message.

## Deploy

Install dependencies and deploy:

```bash
npm install
npm run deploy
```

## App Environment

Set these values in the app `.env` file:

```bash
EXPO_PUBLIC_CF_WORKER_URL=https://your-worker.your-subdomain.workers.dev
EXPO_PUBLIC_GORANI_WORKER_API_KEY=your_long_random_api_key
```

`EXPO_PUBLIC_GORANI_WORKER_API_KEY` must match the Worker secret `GORANI_WORKER_API_KEY`.

## API

### POST /sync

The app sends the current notification plan to the Worker.

- Header: `X-Gorani-Api-Key`
- Body: `safeUid`, `scheduleRevision`, `telegramEnabled`, `chatId`, `notifications`

KV structure:

- Manifest: `user:{safeUid}:manifest`
- Plan bundle: `user:{safeUid}:rev:{scheduleRevision}:plan`
- Sent key: `sent:{safeUid}:{scheduleRevision}:{plannedNotificationId}`

`/sync` stores the full notification array for the current revision in one plan bundle key. The sent key remains notification-specific so Cron can prevent duplicate sends. This structure reduces KV writes during save, which shortens app-side sync time when a 12-month plan contains hundreds of notifications.

When `telegramEnabled=false`, `/sync` stores the disabled manifest, skips writing the plan bundle, and tries to delete the previous revision plan.

The plan bundle key and sent keys use a TTL of about 400 days:

```txt
60 * 60 * 24 * 400
```

The manifest is kept without TTL.

### POST /test

Sends a Telegram connection test message.

## Cron Dispatch

Cron runs every 5 minutes. It:

1. Lists `user:` keys and loads keys ending in `:manifest`.
2. Skips disabled manifests.
3. Reads `user:{safeUid}:rev:{scheduleRevision}:plan`.
4. Iterates `plan.notifications`.
5. Sends notifications where:
   - `notification.fireAtEpochMs <= nowMs`
   - `notification.scheduleRevision === manifest.scheduleRevision`
   - no sent key exists
6. Writes `sent:{safeUid}:{scheduleRevision}:{plannedNotificationId}` after a successful Telegram send.

There is no `within +/- 3 minutes` condition. If the Worker runs late, `fireAtEpochMs <= nowMs` still allows due notifications to be sent. If Telegram sending fails, no sent key is created, so the next Cron run retries.
