import * as SQLite from "expo-sqlite";

import type { PlannedNotification, ScheduleLedgerEntry } from "@/types/notification";

const DB_NAME = "gorani_notifications.db";

type NotificationDb = SQLite.SQLiteDatabase;

type PlanItemRow = {
  plannedNotificationId: string;
  fireAt: string;
  fireAtEpochMs: number;
  fireDateKst: string;
  fireTimeKst: string;
  title: string;
  body: string;
  sourceType: PlannedNotification["sourceType"];
  sourceId: string;
  sourceKind: PlannedNotification["sourceKind"];
  scheduleRevision: number;
  localPushEnabled: number;
  telegramEnabled: number;
};

type LedgerRow = {
  plannedNotificationId: string;
  expoNotificationId: string;
  fireAt: string;
  fireAtEpochMs: number;
  title: string;
  body: string;
  sourceType: ScheduleLedgerEntry["sourceType"];
  sourceId: string;
  scheduleRevision: number;
  createdAt: string;
  cancelledAt: string | null;
  status: ScheduleLedgerEntry["status"];
};

type SyncStateRow = {
  value: string;
};

let dbPromise: Promise<NotificationDb> | null = null;
let initPromise: Promise<void> | null = null;

export async function initNotificationDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await getDb();
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS notification_plan_items (
          plannedNotificationId TEXT PRIMARY KEY NOT NULL,
          fireAt TEXT NOT NULL,
          fireAtEpochMs INTEGER NOT NULL,
          fireDateKst TEXT NOT NULL,
          fireTimeKst TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          sourceType TEXT NOT NULL,
          sourceId TEXT NOT NULL,
          sourceKind TEXT NOT NULL,
          scheduleRevision INTEGER NOT NULL,
          localPushEnabled INTEGER NOT NULL,
          telegramEnabled INTEGER NOT NULL,
          createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notification_schedule_ledger (
          plannedNotificationId TEXT PRIMARY KEY NOT NULL,
          expoNotificationId TEXT NOT NULL,
          fireAt TEXT NOT NULL,
          fireAtEpochMs INTEGER NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          sourceType TEXT NOT NULL,
          sourceId TEXT NOT NULL,
          scheduleRevision INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          cancelledAt TEXT,
          status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notification_sync_state (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);
    })();
  }

  await initPromise;
}

export async function replacePlanItems(items: PlannedNotification[]): Promise<void> {
  const db = await getReadyDb();
  const createdAt = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync("DELETE FROM notification_plan_items");
    for (const item of items) {
      await tx.runAsync(
        `INSERT INTO notification_plan_items (
          plannedNotificationId,
          fireAt,
          fireAtEpochMs,
          fireDateKst,
          fireTimeKst,
          title,
          body,
          sourceType,
          sourceId,
          sourceKind,
          scheduleRevision,
          localPushEnabled,
          telegramEnabled,
          createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.plannedNotificationId,
        item.fireAt,
        item.fireAtEpochMs,
        item.fireDateKst,
        item.fireTimeKst,
        item.title,
        item.body,
        item.sourceType,
        item.sourceId,
        item.sourceKind,
        item.scheduleRevision,
        boolToInt(item.localPushEnabled),
        boolToInt(item.telegramEnabled),
        createdAt,
      );
    }
  });
}

export async function loadCurrentPlanItems(): Promise<PlannedNotification[]> {
  const db = await getReadyDb();
  const rows = await db.getAllAsync<PlanItemRow>(
    "SELECT * FROM notification_plan_items ORDER BY fireAtEpochMs ASC, plannedNotificationId ASC",
  );
  return rows.map(planRowToItem);
}

export async function loadScheduledLedger(): Promise<ScheduleLedgerEntry[]> {
  const db = await getReadyDb();
  const rows = await db.getAllAsync<LedgerRow>(
    "SELECT * FROM notification_schedule_ledger ORDER BY fireAtEpochMs ASC, plannedNotificationId ASC",
  );
  return rows.map(ledgerRowToEntry);
}

export async function replaceLedger(entries: ScheduleLedgerEntry[]): Promise<void> {
  const db = await getReadyDb();

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync("DELETE FROM notification_schedule_ledger");
    for (const entry of entries) {
      await tx.runAsync(
        `INSERT INTO notification_schedule_ledger (
          plannedNotificationId,
          expoNotificationId,
          fireAt,
          fireAtEpochMs,
          title,
          body,
          sourceType,
          sourceId,
          scheduleRevision,
          createdAt,
          cancelledAt,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.plannedNotificationId,
        entry.expoNotificationId,
        entry.fireAt,
        entry.fireAtEpochMs,
        entry.title,
        entry.body,
        entry.sourceType,
        entry.sourceId,
        entry.scheduleRevision,
        entry.createdAt,
        entry.cancelledAt ?? null,
        entry.status,
      );
    }
  });
}

export async function markLedgerCancelled(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const db = await getReadyDb();
  const cancelledAt = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const id of ids) {
      await tx.runAsync(
        `UPDATE notification_schedule_ledger
         SET status = ?, cancelledAt = ?
         WHERE plannedNotificationId = ?`,
        "cancelled",
        cancelledAt,
        id,
      );
    }
  });
}

export async function getSyncState(key: string): Promise<string | null> {
  const db = await getReadyDb();
  const row = await db.getFirstAsync<SyncStateRow>(
    "SELECT value FROM notification_sync_state WHERE key = ?",
    key,
  );
  return row?.value ?? null;
}

export async function setSyncState(key: string, value: string): Promise<void> {
  const db = await getReadyDb();
  await db.runAsync(
    `INSERT INTO notification_sync_state (key, value, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
    key,
    value,
    new Date().toISOString(),
  );
}

async function getDb(): Promise<NotificationDb> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

async function getReadyDb(): Promise<NotificationDb> {
  await initNotificationDb();
  return getDb();
}

function planRowToItem(row: PlanItemRow): PlannedNotification {
  return {
    plannedNotificationId: row.plannedNotificationId,
    fireAt: row.fireAt,
    fireAtEpochMs: row.fireAtEpochMs,
    fireDateKst: row.fireDateKst,
    fireTimeKst: row.fireTimeKst,
    title: row.title,
    body: row.body,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceKind: row.sourceKind,
    scheduleRevision: row.scheduleRevision,
    localPushEnabled: row.localPushEnabled === 1,
    telegramEnabled: row.telegramEnabled === 1,
  };
}

function ledgerRowToEntry(row: LedgerRow): ScheduleLedgerEntry {
  return {
    plannedNotificationId: row.plannedNotificationId,
    expoNotificationId: row.expoNotificationId,
    fireAt: row.fireAt,
    fireAtEpochMs: row.fireAtEpochMs,
    title: row.title,
    body: row.body,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    scheduleRevision: row.scheduleRevision,
    createdAt: row.createdAt,
    cancelledAt: row.cancelledAt ?? undefined,
    status: row.status,
  };
}

function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}
