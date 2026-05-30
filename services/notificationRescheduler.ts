import type { CalendarEvent } from "@/data/dummyData";
import {
  cancelGoraniScheduledNotifications,
  scheduleLocalNotifications,
} from "@/services/localNotificationService";
import {
  loadScheduledLedger,
  replaceLedger,
  replacePlanItems,
} from "@/services/notificationDb";
import { readNotificationSettings } from "@/services/notificationFirebaseService";
import { generateNotificationPlan } from "@/services/notificationPlanService";
import { readDividendCalendar } from "@/services/rtdbReadService";
import { syncTelegramNotifications } from "@/services/telegramSyncService";
import { normalizeDividendCalendar } from "@/utils/normalizeDividendCalendar";
import { toSafeUidAtDot, validateEmailForFirebase } from "@/utils/userKey";

export async function rescheduleAllNotifications(
  email: string | null | undefined,
): Promise<{
  ok: boolean;
  reason?: string;
  plannedCount?: number;
  localScheduledCount?: number;
  telegramSynced?: boolean;
}> {
  const validEmail = validateEmailSafely(email);
  if (!validEmail) {
    return { ok: false, reason: "missing_email" };
  }

  const settings = await readNotificationSettings(validEmail);
  if (!settings) {
    return { ok: false, reason: "missing_settings" };
  }

  const revisionAtStart = settings.scheduleRevision;
  const rawCalendar = await readDividendCalendar(validEmail);
  const calendarEvents = normalizeCalendarEventsResult(rawCalendar);
  const plan = generateNotificationPlan({
    settings,
    calendarEvents,
  });

  const latestBeforeApply = await readNotificationSettings(validEmail);
  if (!latestBeforeApply || latestBeforeApply.scheduleRevision !== revisionAtStart) {
    return { ok: false, reason: "stale_revision_before_apply" };
  }

  await replacePlanItems(plan);

  const existingLedger = await loadScheduledLedger();
  await cancelGoraniScheduledNotifications(existingLedger);

  const nextLedger = settings.localPushEnabled
    ? await scheduleLocalNotifications(plan, revisionAtStart)
    : [];
  await replaceLedger(nextLedger);

  let telegramSynced: boolean | undefined;
  const safeUid = toSafeUidAtDot(validEmail);
  const telegramResult = await syncTelegramNotifications({
    safeUid,
    scheduleRevision: revisionAtStart,
    telegramEnabled: settings.telegramEnabled,
    chatId: settings.telegram.chatId,
    plan,
  });
  telegramSynced = settings.telegramEnabled ? telegramResult.ok : undefined;
  if (!telegramResult.ok && !telegramResult.skipped) {
    console.warn("[notifications] Telegram sync did not complete.", telegramResult.reason);
  }

  const latestAfterApply = await readNotificationSettings(validEmail);
  if (!latestAfterApply || latestAfterApply.scheduleRevision !== revisionAtStart) {
    return { ok: false, reason: "stale_revision_after_apply" };
  }

  return {
    ok: true,
    plannedCount: plan.length,
    localScheduledCount: nextLedger.filter((entry) => entry.status === "scheduled").length,
    telegramSynced,
  };
}

function normalizeCalendarEventsResult(result: unknown): CalendarEvent[] {
  if (Array.isArray(result)) {
    return result as CalendarEvent[];
  }
  if (isRecord(result) && Array.isArray(result.events)) {
    return result.events as CalendarEvent[];
  }
  return normalizeDividendCalendar(result);
}

function validateEmailSafely(email: string | null | undefined): string | null {
  try {
    return validateEmailForFirebase(email);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
