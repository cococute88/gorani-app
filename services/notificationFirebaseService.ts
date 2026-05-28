import { get, ref, runTransaction } from "firebase/database";

import { getFirebaseDb } from "@/services/firebase";
import type { NotificationSettings } from "@/types/notification";
import { toSafeUidAtDot, validateEmailForFirebase } from "@/utils/userKey";

const SETTINGS_VERSION = 1;

export function createDefaultNotificationSettings(): NotificationSettings {
  return {
    version: SETTINGS_VERSION,
    scheduleRevision: 1,
    timezone: "Asia/Seoul",
    localPushEnabled: false,
    telegramEnabled: false,
    telegram: {
      enabled: false,
      chatId: "",
    },
    dateRules: [],
    calendarAlert: {
      filterStar: true,
      filterHeart: false,
      filterBell: true,
      typeTimes: {
        exDiv: "08:00",
        buyBy: "15:00",
        pay: "09:00",
        custom: "09:00",
      },
      templates: {
        exDiv: "{티커명}의 ex-div 날입니다.",
        buyBy: "{티커명}의 buy by 날입니다.",
        pay: "{티커명}의 pay 날입니다.",
        custom: "{티커명}의 custom 일정입니다.",
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function readNotificationSettings(
  email: string | null | undefined,
): Promise<NotificationSettings | null> {
  const validEmail = validateEmailSafely(email);
  if (!validEmail) {
    return null;
  }

  const db = getFirebaseDb();
  const safeUid = toSafeUidAtDot(validEmail);
  const snapshot = await get(ref(db, `users/${safeUid}/notification_settings`));
  if (!snapshot.exists()) {
    return null;
  }

  return normalizeNotificationSettings(snapshot.val());
}

export async function saveNotificationSettingsWithRevision(
  email: string | null | undefined,
  draft: Omit<NotificationSettings, "scheduleRevision" | "updatedAt">,
): Promise<NotificationSettings> {
  const validEmail = validateEmailForFirebase(email);
  const db = getFirebaseDb();
  const safeUid = toSafeUidAtDot(validEmail);
  const settingsRef = ref(db, `users/${safeUid}/notification_settings`);
  const updatedAt = new Date().toISOString();

  const result = await runTransaction(settingsRef, (currentValue) => {
    const current = normalizeNotificationSettings(currentValue);
    const currentRevision = Number.isFinite(current.scheduleRevision)
      ? current.scheduleRevision
      : 0;
    const nextRevision = currentValue ? currentRevision + 1 : 1;

    return stripUndefinedDeep(normalizeNotificationSettings({
      ...draft,
      telegramEnabled: draft.telegramEnabled,
      telegram: {
        ...draft.telegram,
        enabled: draft.telegramEnabled,
      },
      scheduleRevision: nextRevision,
      updatedAt,
    }));
  });

  if (!result.committed || !result.snapshot.exists()) {
    throw new Error("Firebase notification settings save failed.");
  }

  return normalizeNotificationSettings(result.snapshot.val());
}

function validateEmailSafely(email: string | null | undefined): string | null {
  try {
    return validateEmailForFirebase(email);
  } catch {
    return null;
  }
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined) {
        continue;
      }

      const cleaned = stripUndefinedDeep(entry);
      if (cleaned === undefined) {
        continue;
      }

      result[key] = cleaned;
    }

    return result as T;
  }

  return value;
}

function normalizeNotificationSettings(raw: unknown): NotificationSettings {
  const defaults = createDefaultNotificationSettings();
  if (!isRecord(raw)) {
    return defaults;
  }

  const calendarAlert = isRecord(raw.calendarAlert) ? raw.calendarAlert : {};
  const typeTimes = isRecord(calendarAlert.typeTimes) ? calendarAlert.typeTimes : {};
  const templates = isRecord(calendarAlert.templates) ? calendarAlert.templates : {};
  const telegram = isRecord(raw.telegram) ? raw.telegram : {};

  const telegramEnabled = getBoolean(
    raw.telegramEnabled,
    getBoolean(telegram.enabled, defaults.telegramEnabled),
  );

  return {
    version: getNumber(raw.version, defaults.version),
    scheduleRevision: getNumber(raw.scheduleRevision, defaults.scheduleRevision),
    timezone: raw.timezone === "Asia/Seoul" ? "Asia/Seoul" : defaults.timezone,
    localPushEnabled: getBoolean(raw.localPushEnabled, defaults.localPushEnabled),
    telegramEnabled,
    telegram: {
      enabled: telegramEnabled,
      chatId: getString(telegram.chatId, defaults.telegram.chatId),
    },
    dateRules: Array.isArray(raw.dateRules) ? raw.dateRules as NotificationSettings["dateRules"] : [],
    calendarAlert: {
      filterStar: getBoolean(calendarAlert.filterStar, defaults.calendarAlert.filterStar),
      filterHeart: getBoolean(calendarAlert.filterHeart, defaults.calendarAlert.filterHeart),
      filterBell: getBoolean(calendarAlert.filterBell, defaults.calendarAlert.filterBell),
      typeTimes: {
        exDiv: getString(typeTimes.exDiv, defaults.calendarAlert.typeTimes.exDiv),
        buyBy: getString(typeTimes.buyBy, defaults.calendarAlert.typeTimes.buyBy),
        pay: getString(typeTimes.pay, defaults.calendarAlert.typeTimes.pay),
        custom: getString(typeTimes.custom, defaults.calendarAlert.typeTimes.custom),
      },
      templates: {
        exDiv: getString(templates.exDiv, defaults.calendarAlert.templates.exDiv),
        buyBy: getString(templates.buyBy, defaults.calendarAlert.templates.buyBy),
        pay: getString(templates.pay, defaults.calendarAlert.templates.pay),
        custom: getString(templates.custom, defaults.calendarAlert.templates.custom),
      },
    },
    lastCalendarHash: typeof raw.lastCalendarHash === "string" ? raw.lastCalendarHash : undefined,
    updatedAt: getString(raw.updatedAt, defaults.updatedAt),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
