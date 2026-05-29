import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { PlannedNotification, ScheduleLedgerEntry } from "@/types/notification";

const GORANI_NOTIFICATION_CHANNEL_ID = "gorani_notifications";
const LOCAL_PUSH_HORIZON_DAYS = 30;
const LOCAL_PUSH_MAX_COUNT = 35;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(GORANI_NOTIFICATION_CHANNEL_ID, {
    name: "Gorani 알림",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  await ensureNotificationChannel();

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (existing.status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  return finalStatus === "granted";
}

export async function cancelGoraniScheduledNotifications(
  ledger: ScheduleLedgerEntry[],
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const targets = ledger.filter((entry) => entry.status === "scheduled");
  for (const entry of targets) {
    const notificationId = entry.expoNotificationId || entry.plannedNotificationId;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.warn("[notifications] Failed to cancel Gorani notification.", notificationId, error);
    }
  }
}

export async function scheduleLocalNotifications(
  plan: PlannedNotification[],
  scheduleRevision: number,
): Promise<ScheduleLedgerEntry[]> {
  if (Platform.OS === "web") {
    return [];
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return [];
  }

  await ensureNotificationChannel();

  const nowEpochMs = Date.now();
  const targets = selectLocalPushTargets(
    plan.filter((item) => item.scheduleRevision === scheduleRevision),
    nowEpochMs,
  );
  const createdAt = new Date().toISOString();
  const ledger: ScheduleLedgerEntry[] = [];

  for (const item of targets) {
    if (item.fireAtEpochMs <= Date.now()) {
      continue;
    }

    try {
      const expoNotificationId = await Notifications.scheduleNotificationAsync({
        identifier: item.plannedNotificationId,
        content: {
          title: item.title,
          body: item.body,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            plannedNotificationId: item.plannedNotificationId,
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            scheduleRevision: item.scheduleRevision,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(item.fireAtEpochMs),
          channelId: GORANI_NOTIFICATION_CHANNEL_ID,
        },
      });

      if (expoNotificationId !== item.plannedNotificationId) {
        console.warn(
          "[notifications] Expo returned a different notification id.",
          item.plannedNotificationId,
          expoNotificationId,
        );
      }

      ledger.push(toLedgerEntry(item, expoNotificationId, createdAt, "scheduled"));
    } catch (error) {
      console.warn("[notifications] Failed to schedule Gorani notification.", item.plannedNotificationId, error);
      ledger.push(toLedgerEntry(item, item.plannedNotificationId, createdAt, "failed"));
    }
  }

  return ledger;
}

export async function scheduleLocalTestNotificationAfterSeconds(
  seconds = 60,
): Promise<{
  ok: boolean;
  notificationId?: string;
  reason?: string;
}> {
  if (Platform.OS === "web") {
    return { ok: false, reason: "web_skip" };
  }

  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return { ok: false, reason: "permission_denied" };
    }

    await ensureNotificationChannel();

    const notificationId = `gf_local_test_${Date.now()}`;
    const delaySeconds = Math.max(1, Math.floor(seconds));
    const expoNotificationId = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: "Gorani 로컬 푸시 테스트",
        body: "1분 뒤 로컬 알림 테스트입니다.",
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          sourceType: "local_push_test",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
        channelId: GORANI_NOTIFICATION_CHANNEL_ID,
      },
    });

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const isScheduled = scheduled.some((notification) =>
      notification.identifier === expoNotificationId ||
      notification.identifier === notificationId,
    );

    if (!isScheduled) {
      return { ok: false, notificationId: expoNotificationId, reason: "not_found_after_schedule" };
    }

    return { ok: true, notificationId: expoNotificationId };
  } catch (error) {
    console.warn("[notifications] Local test notification failed.", error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "schedule_failed",
    };
  }
}

export function selectLocalPushTargets(
  plan: PlannedNotification[],
  nowEpochMs = Date.now(),
): PlannedNotification[] {
  return plan
    .filter((item) => item.localPushEnabled)
    .filter((item) => item.fireAtEpochMs > nowEpochMs)
    .filter((item) => item.fireAtEpochMs <= nowEpochMs + LOCAL_PUSH_HORIZON_DAYS * DAY_MS)
    .sort((a, b) => (
      a.fireAtEpochMs - b.fireAtEpochMs ||
      a.plannedNotificationId.localeCompare(b.plannedNotificationId)
    ))
    .slice(0, LOCAL_PUSH_MAX_COUNT);
}

function toLedgerEntry(
  item: PlannedNotification,
  expoNotificationId: string,
  createdAt: string,
  status: ScheduleLedgerEntry["status"],
): ScheduleLedgerEntry {
  return {
    plannedNotificationId: item.plannedNotificationId,
    expoNotificationId,
    fireAt: item.fireAt,
    fireAtEpochMs: item.fireAtEpochMs,
    title: item.title,
    body: item.body,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    scheduleRevision: item.scheduleRevision,
    createdAt,
    status,
  };
}
