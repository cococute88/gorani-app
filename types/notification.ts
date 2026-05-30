export type WeekdayCode = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export type DateRuleType =
  | "monthly_day"
  | "monthly_last_day"
  | "monthly_last_weekday"
  | "weekly_interval_weekday"
  | "day_interval";

export type CalendarNotificationKind = "exDiv" | "buyBy" | "pay" | "custom";

export type NotificationSourceType = "date_rule" | "calendar_event";

export interface BaseDateRule {
  id: string;
  enabled: boolean;
  type: DateRuleType;
  notifyTime: string; // HH:mm, KST
  label: string;
  customMessage: string;
}

export interface MonthlyDayRule extends BaseDateRule {
  type: "monthly_day";
  dayOfMonth: number; // 1~31
}

export interface MonthlyLastDayRule extends BaseDateRule {
  type: "monthly_last_day";
}

export interface MonthlyLastWeekdayRule extends BaseDateRule {
  type: "monthly_last_weekday";
  weekday: WeekdayCode;
}

export interface WeeklyIntervalWeekdayRule extends BaseDateRule {
  type: "weekly_interval_weekday";
  startDate: string; // YYYY-MM-DD
  intervalWeeks: number;
  weekday: WeekdayCode;
}

export interface DayIntervalRule extends BaseDateRule {
  type: "day_interval";
  startDate: string; // YYYY-MM-DD
  intervalDays: number;
}

export type DateNotificationRule =
  | MonthlyDayRule
  | MonthlyLastDayRule
  | MonthlyLastWeekdayRule
  | WeeklyIntervalWeekdayRule
  | DayIntervalRule;

export interface CalendarAlertSettings {
  filterStar: boolean;
  filterHeart: boolean;
  filterBell: boolean;

  typeTimes: {
    exDiv: string;
    buyBy: string;
    pay: string;
    custom: string;
  };

  templates: {
    exDiv: string;
    buyBy: string;
    pay: string;
    custom: string;
  };
}

export interface TelegramSettings {
  enabled: boolean;
  chatId: string;
}

export interface NotificationSettings {
  version: number;
  scheduleRevision: number;
  timezone: "Asia/Seoul";

  localPushEnabled: boolean;
  telegramEnabled: boolean;
  telegram: TelegramSettings;

  dateRules: DateNotificationRule[];
  calendarAlert: CalendarAlertSettings;

  lastCalendarHash?: string;
  updatedAt: string;
}

export interface PlannedNotification {
  plannedNotificationId: string;
  fireAt: string; // ISO string
  fireAtEpochMs: number;
  fireDateKst: string; // YYYY-MM-DD
  fireTimeKst: string; // HH:mm
  title: string;
  body: string;
  sourceType: NotificationSourceType;
  sourceId: string;
  sourceKind: DateRuleType | CalendarNotificationKind;
  scheduleRevision: number;
  localPushEnabled: boolean;
  telegramEnabled: boolean;
}

export interface ScheduleLedgerEntry {
  plannedNotificationId: string;
  expoNotificationId: string;
  fireAt: string;
  fireAtEpochMs: number;
  title: string;
  body: string;
  sourceType: NotificationSourceType;
  sourceId: string;
  scheduleRevision: number;
  createdAt: string;
  cancelledAt?: string;
  status: "scheduled" | "cancelled" | "failed";
}

export interface TelegramNotificationPayload {
  plannedNotificationId: string;
  fireAt: string;
  fireAtEpochMs: number;
  fireDateKst: string;
  fireTimeKst: string;
  title: string;
  body: string;
  scheduleRevision: number;
}
