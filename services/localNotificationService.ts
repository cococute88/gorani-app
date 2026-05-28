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
    importance: Notifications.AndroidImportance.DEFAULT,
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
