import type { PlannedNotification, TelegramNotificationPayload } from "@/types/notification";

type WorkerResult = { ok: boolean; skipped: boolean; reason?: string };

const WORKER_URL = process.env.EXPO_PUBLIC_CF_WORKER_URL;
const WORKER_API_KEY = process.env.EXPO_PUBLIC_GORANI_WORKER_API_KEY;

export function buildTelegramPayload(plan: PlannedNotification[]): TelegramNotificationPayload[] {
  return plan
    .filter((item) => item.telegramEnabled)
    .map((item) => ({
      plannedNotificationId: item.plannedNotificationId,
      fireAt: item.fireAt,
      fireAtEpochMs: item.fireAtEpochMs,
      fireDateKst: item.fireDateKst,
      fireTimeKst: item.fireTimeKst,
      title: item.title,
      body: item.body,
      scheduleRevision: item.scheduleRevision,
    }));
}

export async function syncTelegramNotifications(params: {
  safeUid: string;
  scheduleRevision: number;
  telegramEnabled: boolean;
  chatId: string;
  plan: PlannedNotification[];
}): Promise<WorkerResult> {
  const config = getWorkerConfig();
  if (!config) {
    return skipWithWarning("missing_worker_config");
  }
  if (params.telegramEnabled && !params.chatId.trim()) {
    return { ok: false, skipped: true, reason: "missing_chat_id" };
  }

  return postWorkerJson(`${config.workerUrl}/sync`, config.apiKey, {
    safeUid: params.safeUid,
    scheduleRevision: params.scheduleRevision,
    telegramEnabled: params.telegramEnabled,
    chatId: params.chatId,
    notifications: params.telegramEnabled ? buildTelegramPayload(params.plan) : [],
  });
}

export async function sendTelegramTestMessage(params: {
  chatId: string;
}): Promise<WorkerResult> {
  const config = getWorkerConfig();
  if (!config) {
    return skipWithWarning("missing_worker_config");
  }
  if (!params.chatId.trim()) {
    return { ok: false, skipped: true, reason: "missing_chat_id" };
  }

  return postWorkerJson(`${config.workerUrl}/test`, config.apiKey, {
    chatId: params.chatId,
  });
}

function getWorkerConfig(): { workerUrl: string; apiKey: string } | null {
  const workerUrl = WORKER_URL?.trim().replace(/\/+$/, "");
  const apiKey = WORKER_API_KEY?.trim();
  if (!workerUrl || !apiKey) {
    return null;
  }
  return { workerUrl, apiKey };
}

async function postWorkerJson(
  url: string,
  apiKey: string,
  body: unknown,
): Promise<WorkerResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gorani-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn("[telegram] Worker request failed.", url, response.status);
      return { ok: false, skipped: false, reason: `http_${response.status}` };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    console.warn("[telegram] Worker request error.", url, error);
    return { ok: false, skipped: false, reason: "request_failed" };
  }
}

function skipWithWarning(reason: string): WorkerResult {
  console.warn("[telegram] Worker sync skipped.", reason);
  return { ok: false, skipped: true, reason };
}
