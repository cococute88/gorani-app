import type { WeekdayCode } from "@/types/notification";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;
const WEEKDAY_CODES: WeekdayCode[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function getNowKstParts(): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  return getKstParts(Date.now());
}

export function getTodayKstDateString(): string {
  const { year, month, day } = getNowKstParts();
  return formatDateParts(year, month, day);
}

export function parseKstDateTimeToEpochMs(date: string, time: string): number {
  const dateParts = parseDateParts(date);
  const timeParts = parseTimeParts(time);
  if (!dateParts || !timeParts) {
    throw new Error(`Invalid KST date/time: ${date} ${time}`);
  }

  return Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour - 9,
    timeParts.minute,
    0,
    0,
  );
}

export function formatKstDate(input: Date | number): string {
  const { year, month, day } = getKstParts(input);
  return formatDateParts(year, month, day);
}

export function formatKstTime(input: Date | number): string {
  const { hour, minute } = getKstParts(input);
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function addMonthsKst(date: string, months: number): string {
  const parts = parseDateParts(date);
  if (!parts) {
    throw new Error(`Invalid KST date: ${date}`);
  }

  const targetMonthIndex = parts.year * 12 + (parts.month - 1) + months;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = (targetMonthIndex % 12 + 12) % 12 + 1;
  const targetDay = Math.min(parts.day, getDaysInMonthKst(targetYear, targetMonth));
  return formatDateParts(targetYear, targetMonth, targetDay);
}

export function getDaysInMonthKst(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid KST year/month: ${year}-${month}`);
  }
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getWeekdayCodeKst(date: string): WeekdayCode {
  if (!isValidDateString(date)) {
    throw new Error(`Invalid KST date: ${date}`);
  }
  const epochMs = parseKstDateTimeToEpochMs(date, "00:00");
  const kstDate = new Date(epochMs + KST_OFFSET_MS);
  return WEEKDAY_CODES[kstDate.getUTCDay()];
}

export function isValidDateString(value: string): boolean {
  return parseDateParts(value) !== null;
}

export function isValidTimeString(value: string): boolean {
  return parseTimeParts(value) !== null;
}

export function compareKstDateStrings(a: string, b: string): number {
  if (!isValidDateString(a) || !isValidDateString(b)) {
    throw new Error(`Invalid KST date comparison: ${a}, ${b}`);
  }
  return a.localeCompare(b);
}

function getKstParts(input: Date | number) {
  const epochMs = input instanceof Date ? input.getTime() : input;
  const kstDate = new Date(epochMs + KST_OFFSET_MS);
  return {
    year: kstDate.getUTCFullYear(),
    month: kstDate.getUTCMonth() + 1,
    day: kstDate.getUTCDate(),
    hour: kstDate.getUTCHours(),
    minute: kstDate.getUTCMinutes(),
    second: kstDate.getUTCSeconds(),
  };
}

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = DATE_RE.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12) {
    return null;
  }
  if (day < 1 || day > getDaysInMonthKst(year, month)) {
    return null;
  }

  return { year, month, day };
}

function parseTimeParts(value: string): { hour: number; minute: number } | null {
  const match = TIME_RE.exec(value);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
