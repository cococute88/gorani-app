import type {
  CalendarAlertSettings,
  CalendarNotificationKind,
  DateNotificationRule,
  NotificationSettings,
  PlannedNotification,
  WeekdayCode,
} from "@/types/notification";
import type { CalendarEvent } from "@/data/dummyData";
import {
  addMonthsKst,
  compareKstDateStrings,
  formatKstDate,
  formatKstTime,
  getDaysInMonthKst,
  getTodayKstDateString,
  getWeekdayCodeKst,
  isValidDateString,
  isValidTimeString,
  parseKstDateTimeToEpochMs,
} from "@/utils/kstDate";
import {
  buildCalendarNotificationId,
  buildDateNotificationId,
} from "@/utils/notificationId";

const DEFAULT_HORIZON_MONTHS = 12;
const WEEKDAY_LABELS: Record<CalendarNotificationKind, string> = {
  exDiv: "ex-div",
  buyBy: "buy by",
  pay: "pay",
  custom: "custom",
};

export function normalizeCalendarEventType(eventType: string | null | undefined): CalendarNotificationKind {
  if (eventType === "Ex-Div") return "exDiv";
  if (eventType === "Buy" || eventType === "Buy By" || eventType === "buy by") return "buyBy";
  if (eventType === "Pay") return "pay";
  return "custom";
}

export function passesCalendarFilter(
  event: CalendarEvent,
  settings: CalendarAlertSettings,
): boolean {
  return (
    (settings.filterStar && event.star === true) ||
    (settings.filterHeart && event.heart === true) ||
    (settings.filterBell && event.alertEnabled === true)
  );
}

export function applyTemplate(
  template: string,
  values: {
    ticker?: string;
    kind?: string;
    date?: string;
    label?: string;
    memo?: string;
  },
): string {
  if (!template) {
    return "";
  }

  return template
    .replace(/\{티커명\}/g, values.ticker ?? "")
    .replace(/\{속성\}/g, values.kind ?? "")
    .replace(/\{날짜\}/g, values.date ?? "")
    .replace(/\{일정명\}/g, values.label ?? "")
    .replace(/\{메모\}/g, values.memo ?? "");
}

export function generateDateRuleNotifications(params: {
  settings: NotificationSettings;
  nowEpochMs?: number;
  horizonMonths?: number;
}): PlannedNotification[] {
  const nowEpochMs = params.nowEpochMs ?? Date.now();
  const horizonMonths = params.horizonMonths ?? DEFAULT_HORIZON_MONTHS;
  const window = getPlanningWindow(nowEpochMs, horizonMonths);

  return params.settings.dateRules.flatMap((rule) => (
    rule.enabled ? buildDateRuleCandidates(rule, window).map((date) => (
      buildDateRuleNotification(rule, date, params.settings, nowEpochMs, window.endDateExclusive)
    )).filter((item): item is PlannedNotification => item !== null) : []
  ));
}

export function generateCalendarEventNotifications(params: {
  settings: NotificationSettings;
  calendarEvents: CalendarEvent[];
  nowEpochMs?: number;
  horizonMonths?: number;
}): PlannedNotification[] {
  const nowEpochMs = params.nowEpochMs ?? Date.now();
  const horizonMonths = params.horizonMonths ?? DEFAULT_HORIZON_MONTHS;
  const window = getPlanningWindow(nowEpochMs, horizonMonths);

  return params.calendarEvents
    .map((event, index) => buildCalendarNotification(event, index, params.settings, nowEpochMs, window.endDateExclusive))
    .filter((item): item is PlannedNotification => item !== null);
}

export function generateNotificationPlan(params: {
  settings: NotificationSettings;
  calendarEvents: CalendarEvent[];
  nowEpochMs?: number;
  horizonMonths?: number;
}): PlannedNotification[] {
  const dateNotifications = generateDateRuleNotifications(params);
  const calendarNotifications = generateCalendarEventNotifications(params);
  const deduped = new Map<string, PlannedNotification>();

  [...dateNotifications, ...calendarNotifications].forEach((notification) => {
    if (!deduped.has(notification.plannedNotificationId)) {
      deduped.set(notification.plannedNotificationId, notification);
    }
  });

  return [...deduped.values()].sort((a, b) => (
    a.fireAtEpochMs - b.fireAtEpochMs ||
    a.plannedNotificationId.localeCompare(b.plannedNotificationId)
  ));
}

function buildDateRuleCandidates(
  rule: DateNotificationRule,
  window: { startDate: string; endDateExclusive: string },
): string[] {
  if (!isValidTimeString(rule.notifyTime)) {
    return [];
  }

  switch (rule.type) {
    case "monthly_day":
      if (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31) {
        return [];
      }
      return getCandidateMonths(window.startDate, window.endDateExclusive).flatMap(({ year, month }) => {
        if (rule.dayOfMonth > getDaysInMonthKst(year, month)) {
          return [];
        }
        return [formatDateParts(year, month, rule.dayOfMonth)];
      });
    case "monthly_last_day":
      return getCandidateMonths(window.startDate, window.endDateExclusive).map(({ year, month }) => (
        formatDateParts(year, month, getDaysInMonthKst(year, month))
      ));
    case "monthly_last_weekday":
      return getCandidateMonths(window.startDate, window.endDateExclusive).map(({ year, month }) => (
        getLastWeekdayOfMonth(year, month, rule.weekday)
      ));
    case "weekly_interval_weekday":
      if (!isValidDateString(rule.startDate) || !isPositiveInteger(rule.intervalWeeks)) {
        return [];
      }
      return getIntervalDates({
        firstDate: getFirstWeekdayOnOrAfter(rule.startDate, rule.weekday),
        intervalDays: rule.intervalWeeks * 7,
        endDateExclusive: window.endDateExclusive,
      });
    case "day_interval":
      if (!isValidDateString(rule.startDate) || !isPositiveInteger(rule.intervalDays)) {
        return [];
      }
      return getIntervalDates({
        firstDate: rule.startDate,
        intervalDays: rule.intervalDays,
        endDateExclusive: window.endDateExclusive,
      });
    default:
      return [];
  }
}

function buildDateRuleNotification(
  rule: DateNotificationRule,
  date: string,
  settings: NotificationSettings,
  nowEpochMs: number,
  endDateExclusive: string,
): PlannedNotification | null {
  if (!isDateInHorizon(date, endDateExclusive)) {
    return null;
  }

  const fireAtEpochMs = safeParseKstDateTime(date, rule.notifyTime);
  if (fireAtEpochMs === null || fireAtEpochMs <= nowEpochMs) {
    return null;
  }

  const suffix = rule.customMessage.trim();
  const body = suffix ? `${date} ${rule.label}, ${suffix}` : `${date} ${rule.label}`;

  return {
    plannedNotificationId: buildDateNotificationId({
      ruleId: rule.id,
      date,
      time: rule.notifyTime,
    }),
    fireAt: new Date(fireAtEpochMs).toISOString(),
    fireAtEpochMs,
    fireDateKst: formatKstDate(fireAtEpochMs),
    fireTimeKst: formatKstTime(fireAtEpochMs),
    title: "Gorani 날짜 알림",
    body,
    sourceType: "date_rule",
    sourceId: rule.id,
    sourceKind: rule.type,
    scheduleRevision: settings.scheduleRevision,
    localPushEnabled: settings.localPushEnabled,
    telegramEnabled: settings.telegramEnabled,
  };
}

function buildCalendarNotification(
  event: CalendarEvent,
  index: number,
  settings: NotificationSettings,
  nowEpochMs: number,
  endDateExclusive: string,
): PlannedNotification | null {
  if (!passesCalendarFilter(event, settings.calendarAlert) || !isValidDateString(event.date)) {
    return null;
  }

  const kind = normalizeCalendarEventType(event.eventType);
  const time = settings.calendarAlert.typeTimes[kind];
  if (!isValidTimeString(time) || !isDateInHorizon(event.date, endDateExclusive)) {
    return null;
  }

  const fireAtEpochMs = safeParseKstDateTime(event.date, time);
  if (fireAtEpochMs === null || fireAtEpochMs <= nowEpochMs) {
    return null;
  }

  const ticker = event.ticker || "";
  const eventId = String(
    event.id ?? `${event.ticker ?? "unknown"}_${event.eventType ?? "custom"}_${event.date ?? "no-date"}_${index}`,
  );
  const label = event.customTitle || event.shortLabel || event.ticker || "";
  const body = applyTemplate(settings.calendarAlert.templates[kind], {
    ticker,
    kind: WEEKDAY_LABELS[kind],
    date: event.date,
    label,
    memo: event.memo || "",
  });

  return {
    plannedNotificationId: buildCalendarNotificationId({
      eventId,
      ticker: ticker || "unknown",
      kind,
      date: event.date,
      time,
    }),
    fireAt: new Date(fireAtEpochMs).toISOString(),
    fireAtEpochMs,
    fireDateKst: formatKstDate(fireAtEpochMs),
    fireTimeKst: formatKstTime(fireAtEpochMs),
    title: "Gorani 투자 캘린더",
    body,
    sourceType: "calendar_event",
    sourceId: eventId,
    sourceKind: kind,
    scheduleRevision: settings.scheduleRevision,
    localPushEnabled: settings.localPushEnabled,
    telegramEnabled: settings.telegramEnabled,
  };
}

function getPlanningWindow(nowEpochMs: number, horizonMonths: number) {
  const startDate = formatKstDate(nowEpochMs) || getTodayKstDateString();
  return {
    startDate,
    endDateExclusive: addMonthsKst(startDate, Math.max(1, horizonMonths)),
  };
}

function getCandidateMonths(startDate: string, endDateExclusive: string): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const startMonth = `${startDate.slice(0, 7)}-01`;
  let cursor = startMonth;

  while (compareKstDateStrings(cursor, endDateExclusive) < 0) {
    const [year, month] = cursor.split("-").map(Number);
    months.push({ year, month });
    cursor = addMonthsKst(cursor, 1);
  }

  return months;
}

function getLastWeekdayOfMonth(year: number, month: number, weekday: WeekdayCode): string {
  let date = formatDateParts(year, month, getDaysInMonthKst(year, month));
  while (getWeekdayCodeKst(date) !== weekday) {
    date = addDaysKst(date, -1);
  }
  return date;
}

function getFirstWeekdayOnOrAfter(startDate: string, weekday: WeekdayCode): string {
  let date = startDate;
  for (let offset = 0; offset < 7; offset += 1) {
    if (getWeekdayCodeKst(date) === weekday) {
      return date;
    }
    date = addDaysKst(date, 1);
  }
  return startDate;
}

function getIntervalDates(params: {
  firstDate: string;
  intervalDays: number;
  endDateExclusive: string;
}): string[] {
  const dates: string[] = [];
  let cursor = params.firstDate;
  while (compareKstDateStrings(cursor, params.endDateExclusive) < 0) {
    dates.push(cursor);
    cursor = addDaysKst(cursor, params.intervalDays);
  }
  return dates;
}

function addDaysKst(date: string, days: number): string {
  const epochMs = parseKstDateTimeToEpochMs(date, "00:00") + days * 24 * 60 * 60 * 1000;
  return formatKstDate(epochMs);
}

function isDateInHorizon(date: string, endDateExclusive: string): boolean {
  return compareKstDateStrings(date, endDateExclusive) < 0;
}

function safeParseKstDateTime(date: string, time: string): number | null {
  try {
    return parseKstDateTimeToEpochMs(date, time);
  } catch {
    return null;
  }
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
