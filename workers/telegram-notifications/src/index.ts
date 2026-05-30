/// <reference types="@cloudflare/workers-types" />

export interface Env {
  GORANI_NOTIFICATIONS_KV: KVNamespace;
  TELEGRAM_BOT_TOKEN: string;
  GORANI_WORKER_API_KEY: string;
}

type TelegramNotificationPayload = {
  plannedNotificationId: string;
  fireAt: string;
  fireAtEpochMs: number;
  fireDateKst: string;
  fireTimeKst: string;
  title: string;
  body: string;
  scheduleRevision: number;
};

type SyncPayload = {
  safeUid: string;
  scheduleRevision: number;
  telegramEnabled: boolean;
  chatId: string;
  notifications: TelegramNotificationPayload[];
};

type Manifest = {
  safeUid: string;
  scheduleRevision: number;
  telegramEnabled: boolean;
  chatId: string;
  updatedAt: string;
};

type StoredPlan = {
  safeUid: string;
  scheduleRevision: number;
  telegramEnabled: boolean;
  chatId: string;
  notifications: TelegramNotificationPayload[];
  updatedAt: string;
};

const JSON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Gorani-Api-Key",
  "Content-Type": "application/json; charset=utf-8",
};
const STORAGE_TTL_SECONDS = 60 * 60 * 24 * 400;
const TELEGRAM_MAX_TEXT_LENGTH = 4096;

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/sync") {
      return handleSync(request, env, _ctx);
    }
    if (request.method === "POST" && url.pathname === "/test") {
      return handleTest(request, env);
    }

    return jsonResponse({ ok: false, error: "not_found" }, 404);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledDispatch(env));
  },
};

async function handleSync(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  const payload = await parseJson<SyncPayload>(request);
  const validationError = validateSyncPayload(payload);
  if (validationError) {
    return jsonResponse({ ok: false, error: validationError }, 400);
  }

  const manifestKey = buildManifestKey(payload.safeUid);
  const previousManifest = await getJson<Manifest>(env.GORANI_NOTIFICATIONS_KV, manifestKey);
  const manifest: Manifest = {
    safeUid: payload.safeUid,
    scheduleRevision: payload.scheduleRevision,
    telegramEnabled: payload.telegramEnabled,
    chatId: payload.chatId,
    updatedAt: new Date().toISOString(),
  };

  await env.GORANI_NOTIFICATIONS_KV.put(manifestKey, JSON.stringify(manifest));

  if (previousManifest && previousManifest.scheduleRevision !== payload.scheduleRevision) {
    await deletePlanKey(env.GORANI_NOTIFICATIONS_KV, payload.safeUid, previousManifest.scheduleRevision);
    ctx.waitUntil(
      deleteLegacyNotificationPrefixSafely(
        env.GORANI_NOTIFICATIONS_KV,
        payload.safeUid,
        previousManifest.scheduleRevision,
      ),
    );
  }

  if (!payload.telegramEnabled) {
    await deletePlanKey(env.GORANI_NOTIFICATIONS_KV, payload.safeUid, payload.scheduleRevision);
    return jsonResponse({ ok: true, savedCount: 0, disabled: true });
  }
  if (!payload.chatId.trim()) {
    return jsonResponse({ ok: false, error: "missing_chat_id" }, 400);
  }

  const notifications = payload.notifications.filter((notification) =>
    isValidNotification(notification, payload.scheduleRevision),
  );
  const plan: StoredPlan = {
    safeUid: payload.safeUid,
    scheduleRevision: payload.scheduleRevision,
    telegramEnabled: true,
    chatId: payload.chatId,
    notifications,
    updatedAt: manifest.updatedAt,
  };

  await env.GORANI_NOTIFICATIONS_KV.put(
    buildPlanKey(payload.safeUid, payload.scheduleRevision),
    JSON.stringify(plan),
    { expirationTtl: STORAGE_TTL_SECONDS },
  );

  return jsonResponse({ ok: true, savedCount: notifications.length });
}

async function handleTest(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  const payload = await parseJson<{ chatId?: unknown }>(request);
  const chatId = typeof payload.chatId === "string" ? payload.chatId.trim() : "";
  if (!chatId) {
    return jsonResponse({ ok: false, error: "missing_chat_id" }, 400);
  }

  try {
    await sendTelegramMessage(env, chatId, "🦌 Gorani Finance 텔레그램 알림 연결 테스트입니다.");
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: getErrorMessage(error) }, 502);
  }
}

async function runScheduledDispatch(env: Env): Promise<void> {
  const nowMs = Date.now();
  const manifestKeys = await listKeys(env.GORANI_NOTIFICATIONS_KV, "user:");

  for (const key of manifestKeys.filter((name) => name.endsWith(":manifest"))) {
    const manifest = await getJson<Manifest>(env.GORANI_NOTIFICATIONS_KV, key);
    if (!manifest || !manifest.telegramEnabled || !manifest.chatId.trim()) {
      continue;
    }

    const plan = await getJson<StoredPlan>(
      env.GORANI_NOTIFICATIONS_KV,
      buildPlanKey(manifest.safeUid, manifest.scheduleRevision),
    );
    if (!plan || !Array.isArray(plan.notifications)) {
      continue;
    }

    for (const notification of plan.notifications) {
      const sentKey = buildSentKey(
        manifest.safeUid,
        manifest.scheduleRevision,
        notification.plannedNotificationId,
      );
      const shouldSend =
        manifest.telegramEnabled &&
        notification.fireAtEpochMs <= nowMs &&
        notification.scheduleRevision === manifest.scheduleRevision &&
        !(await env.GORANI_NOTIFICATIONS_KV.get(sentKey));

      if (!shouldSend) {
        continue;
      }

      try {
        await sendTelegramMessage(env, plan.chatId || manifest.chatId, formatNotificationMessage(notification));
        const sentAt = new Date().toISOString();
        await env.GORANI_NOTIFICATIONS_KV.put(sentKey, JSON.stringify({ sentAt }), {
          expirationTtl: STORAGE_TTL_SECONDS,
        });
      } catch (error) {
        console.error("[cron] Telegram send failed.", notification.plannedNotificationId, getErrorMessage(error));
      }
    }
  }
}

function isAuthorized(request: Request, env: Env): boolean {
  const apiKey = request.headers.get("X-Gorani-Api-Key");
  return Boolean(apiKey && env.GORANI_WORKER_API_KEY && apiKey === env.GORANI_WORKER_API_KEY);
}

async function sendTelegramMessage(env: Env, chatId: string, text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("missing_telegram_bot_token");
  }

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: truncateTelegramText(text),
    }),
  });
  const data = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null;

  if (!response.ok || data?.ok !== true) {
    throw new Error(data?.description ?? `telegram_http_${response.status}`);
  }
}

function formatNotificationMessage(notification: TelegramNotificationPayload): string {
  return `🦌 ${notification.title}\n\n${notification.body}`;
}

function truncateTelegramText(text: string): string {
  if (text.length <= TELEGRAM_MAX_TEXT_LENGTH) {
    return text;
  }
  return `${text.slice(0, TELEGRAM_MAX_TEXT_LENGTH - 1)}…`;
}

function validateSyncPayload(payload: SyncPayload): string | null {
  if (!payload || typeof payload !== "object") return "invalid_json";
  if (typeof payload.safeUid !== "string" || !payload.safeUid.trim()) return "missing_safe_uid";
  if (typeof payload.scheduleRevision !== "number" || !Number.isFinite(payload.scheduleRevision)) return "missing_schedule_revision";
  if (typeof payload.telegramEnabled !== "boolean") return "missing_telegram_enabled";
  if (typeof payload.chatId !== "string") return "invalid_chat_id";
  if (!Array.isArray(payload.notifications)) return "invalid_notifications";
  return null;
}

function isValidNotification(notification: TelegramNotificationPayload, scheduleRevision: number): boolean {
  return Boolean(
    notification &&
      typeof notification.plannedNotificationId === "string" &&
      typeof notification.fireAt === "string" &&
      typeof notification.fireAtEpochMs === "number" &&
      typeof notification.fireDateKst === "string" &&
      typeof notification.fireTimeKst === "string" &&
      typeof notification.title === "string" &&
      typeof notification.body === "string" &&
      notification.scheduleRevision === scheduleRevision,
  );
}

function buildManifestKey(safeUid: string): string {
  return `user:${safeUid}:manifest`;
}

function buildPlanKey(safeUid: string, scheduleRevision: number): string {
  return `user:${safeUid}:rev:${scheduleRevision}:plan`;
}

function buildNotificationPrefix(safeUid: string, scheduleRevision: number): string {
  return `user:${safeUid}:rev:${scheduleRevision}:notification:`;
}

function buildSentKey(safeUid: string, scheduleRevision: number, plannedNotificationId: string): string {
  return `sent:${safeUid}:${scheduleRevision}:${plannedNotificationId}`;
}

async function deletePlanKey(kv: KVNamespace, safeUid: string, scheduleRevision: number): Promise<void> {
  await kv.delete(buildPlanKey(safeUid, scheduleRevision));
}

async function deleteLegacyNotificationPrefixSafely(
  kv: KVNamespace,
  safeUid: string,
  scheduleRevision: number,
): Promise<void> {
  try {
    await deletePrefix(kv, buildNotificationPrefix(safeUid, scheduleRevision));
  } catch (error) {
    console.warn("[sync] Failed to delete legacy notification keys.", safeUid, scheduleRevision, getErrorMessage(error));
  }
}

async function parseJson<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    return {} as T;
  }
}

async function getJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const value = await kv.get(key);
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function listKeys(kv: KVNamespace, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor: string | undefined;

  do {
    const result = await kv.list({ prefix, cursor });
    keys.push(...result.keys.map((key) => key.name));
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return keys;
}

async function deletePrefix(kv: KVNamespace, prefix: string): Promise<void> {
  const keys = await listKeys(kv, prefix);
  await Promise.all(keys.map((key) => kv.delete(key)));
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
