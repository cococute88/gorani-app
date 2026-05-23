import type { CalendarEvent, EventStatus, EventType } from "@/data/dummyData";

type RawRecord = Record<string, unknown>;
type RawEntry = {
  key: string;
  value: RawRecord;
  kind: "event" | "custom";
};

type DatePlan = {
  eventType: EventType;
  date: string;
};

const TICKER_KEYS = ["ticker", "symbol", "stock", "name", "code"];
const TYPE_KEYS = ["type", "eventType", "event_type", "kind", "category"];
const GENERIC_DATE_KEYS = ["date", "eventDate", "event_date", "targetDate", "target_date"];
const EX_DATE_KEYS = [
  "exDate",
  "ex_date",
  "exDivDate",
  "ex_div_date",
  "exDividendDate",
  "ex_dividend_date",
  "dividendDate",
  "dividend_date",
];
const BUY_DATE_KEYS = [
  "buyDate",
  "buy_date",
  "buyBy",
  "buy_by",
  "buyByDate",
  "buy_by_date",
  "buyDeadline",
  "buy_deadline",
  "deadline",
];
const PAY_DATE_KEYS = ["payDate", "pay_date", "paymentDate", "payment_date"];
const EARN_DATE_KEYS = ["earnDate", "earn_date", "earningsDate", "earnings_date"];
const MEMO_KEYS = ["memo", "note", "notes", "description", "desc"];
const TICKER_MEMO_KEYS = ["tickerMemo", "ticker_memo", "stockMemo", "stock_memo", "tickerNote", "ticker_note"];
const CUSTOM_MEMO_KEYS = ["customMemo", "custom_memo", "customNote", "custom_note"];
const TITLE_KEYS = ["title", "customTitle", "custom_title", "label", "shortLabel", "short_label"];
const DIVIDEND_KEYS = ["dividend", "dividendAmount", "dividend_amount", "amount", "dividend_per_share", "dividendPerShare", "dps"];
const CURRENT_PRICE_KEYS = ["currentPrice", "current_price", "price", "stockPrice", "stock_price"];
const YIELD_KEYS = ["annualYield", "annual_yield", "yield", "dividendYield", "dividend_yield"];
const TAX_SAVING_KEYS = [
  "taxSaving",
  "tax_saving",
  "taxSavings",
  "tax_savings",
  "estimatedTaxSaving",
  "estimated_tax_saving",
  "estimatedTaxSavings",
  "estimated_tax_savings",
  "estTaxSavings",
  "est_tax_savings",
  "saving",
  "savings",
  "savingOnce",
  "saving_once",
  "taxSavingOnce",
  "tax_saving_once",
  "taxSavings10k",
  "tax_savings_10k",
  "tax10k",
  "tax_10k",
  "Tax($10k)",
  "Est. Tax Savings($10k)",
  "1회절세",
  "예상절세액",
  "절세액",
];
const TAX_10K_KEYS = [
  "taxSavingPer10k",
  "tax_saving_per_10k",
  "taxSavings10k",
  "tax_savings_10k",
  "tax10k",
  "tax_10k",
  "Tax($10k)",
  "Est. Tax Savings($10k)",
];
const SOURCE_ID_KEYS = ["id", "sourceId", "source_id", "key", "uid"];
const CUSTOM_COLLECTION_KEYS = ["custom_ce", "customEvents", "custom_events", "customMemos", "custom_memos"];
const IGNORED_COLLECTION_KEYS = new Set(["memos", "memo", "marks", "mark", "portfolios", "portfolio"]);
const TAX_RETENTION_RATE = 0.85;
const DIVIDEND_TAX_RATE = 0.22;
const INVESTMENT_BUDGET_USD = 10_000;

const EVENT_RECORD_KEYS = [
  ...TYPE_KEYS,
  ...GENERIC_DATE_KEYS,
  ...EX_DATE_KEYS,
  ...BUY_DATE_KEYS,
  ...PAY_DATE_KEYS,
  ...EARN_DATE_KEYS,
];

const TYPE_ORDER: Record<EventType, number> = {
  Buy: 0,
  "Ex-Div": 1,
  Pay: 2,
  Earn: 3,
  custom: 4,
};

export function normalizeDividendCalendar(raw: unknown): CalendarEvent[] {
  if (raw === null || raw === undefined) {
    return [];
  }

  const entries = collectRawEntries(raw);
  if (entries.length === 0) {
    console.warn("[dividend_calendar] No readable event records found.");
    return [];
  }

  const semanticSeen = new Set<string>();
  const sourceSeen = new Set<string>();
  const events: CalendarEvent[] = [];

  entries.forEach((entry, index) => {
    normalizeEntry(entry, index).forEach((event) => {
      const sourceKey = getDedupKey(event, true);
      const semanticKey = getDedupKey(event, false);
      if (sourceSeen.has(sourceKey) || semanticSeen.has(semanticKey)) {
        return;
      }
      sourceSeen.add(sourceKey);
      semanticSeen.add(semanticKey);
      events.push(event);
    });
  });

  return events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      TYPE_ORDER[a.eventType] - TYPE_ORDER[b.eventType] ||
      a.ticker.localeCompare(b.ticker) ||
      a.id.localeCompare(b.id),
  );
}

function collectRawEntries(raw: unknown, path = "root", depth = 0): RawEntry[] {
  if (depth > 6) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((item, index) => collectRawEntries(item, `${path}.${index}`, depth + 1));
  }

  if (!isRecord(raw)) {
    return [];
  }

  if (looksLikeEventRecord(raw)) {
    return [{ key: path, value: raw, kind: "event" }];
  }

  const childEntries = Object.entries(raw).flatMap(([key, value]) => {
    if (IGNORED_COLLECTION_KEYS.has(key)) {
      return [];
    }
    if (CUSTOM_COLLECTION_KEYS.includes(key)) {
      return collectCustomEntries(value, path === "root" ? key : `${path}.${key}`);
    }
    return collectRawEntries(value, path === "root" ? key : `${path}.${key}`, depth + 1);
  });

  return childEntries;
}

function collectCustomEntries(raw: unknown, path: string): RawEntry[] {
  if (raw === null || raw === undefined) {
    return [];
  }

  if (typeof raw === "string" || typeof raw === "number") {
    const date = inferDateFromPath(path);
    if (!date) {
      return [];
    }
    return [{ key: path, kind: "custom", value: { date, title: String(raw) } }];
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((item, index) => collectCustomEntries(item, `${path}.${index}`));
  }

  if (!isRecord(raw)) {
    return [];
  }

  const date = getDate(raw, GENERIC_DATE_KEYS) ?? inferDateFromPath(path);
  if (date && hasCustomText(raw)) {
    return [{ key: path, kind: "custom", value: { ...raw, date } }];
  }

  return Object.entries(raw).flatMap(([key, value]) => collectCustomEntries(value, `${path}.${key}`));
}

function normalizeEntry(entry: RawEntry, index: number): CalendarEvent[] {
  try {
    const datePlans = entry.kind === "custom" ? getCustomDatePlans(entry) : getEventDatePlans(entry.value);
    return datePlans
      .map((plan, planIndex) => buildEvent(entry.value, entry.key, index, planIndex, plan.eventType, plan.date))
      .filter((event): event is CalendarEvent => event !== null);
  } catch (error) {
    console.warn("[dividend_calendar] Failed to normalize an event record.", entry.key, error);
    return [];
  }
}

function getEventDatePlans(record: RawRecord): DatePlan[] {
  const explicitType = normalizeEventType(getText(record, TYPE_KEYS));
  const genericDate = getDate(record, GENERIC_DATE_KEYS);

  if (explicitType && explicitType !== "custom" && genericDate) {
    return [{ eventType: explicitType, date: genericDate }];
  }

  if (explicitType === "custom") {
    const customDate = genericDate ?? getFirstTypedDate(record);
    return customDate ? [{ eventType: "custom", date: customDate }] : [];
  }

  const plans: DatePlan[] = [];
  addPlan(plans, "Buy", getDate(record, BUY_DATE_KEYS));
  addPlan(plans, "Ex-Div", getDate(record, EX_DATE_KEYS));
  addPlan(plans, "Pay", getDate(record, PAY_DATE_KEYS));
  addPlan(plans, "Earn", getDate(record, EARN_DATE_KEYS));

  if (plans.length > 0) {
    return plans;
  }

  if (explicitType && genericDate) {
    return [{ eventType: explicitType, date: genericDate }];
  }

  if (genericDate && hasCustomText(record) && !getText(record, TICKER_KEYS)) {
    return [{ eventType: "custom", date: genericDate }];
  }

  return [];
}

function getCustomDatePlans(entry: RawEntry): DatePlan[] {
  const date = getDate(entry.value, GENERIC_DATE_KEYS) ?? inferDateFromPath(entry.key);
  return date ? [{ eventType: "custom", date }] : [];
}

function buildEvent(
  record: RawRecord,
  key: string,
  index: number,
  planIndex: number,
  eventType: EventType,
  date: string,
): CalendarEvent | null {
  if (!date) {
    return null;
  }

  const rawTicker = getText(record, TICKER_KEYS);
  const ticker = eventType === "custom" ? "" : (rawTicker?.toUpperCase() ?? inferTickerFromKey(key) ?? "UNKNOWN");
  const sourceId = getSourceId(record, key, index);
  const eventId = makeEventId(ticker || "custom", eventType, date, sourceId);
  const title = getText(record, TITLE_KEYS);
  const memo = getText(record, MEMO_KEYS);
  const customMemo = getText(record, CUSTOM_MEMO_KEYS);
  const tickerMemo = getText(record, TICKER_MEMO_KEYS);
  const customTitle = eventType === "custom" ? (title ?? customMemo ?? memo ?? "Custom") : undefined;
  const labelTicker = eventType === "custom" ? (customTitle ?? "Custom") : ticker;
  const dividendAmount = eventType === "Earn" || eventType === "custom" ? undefined : getNumber(record, DIVIDEND_KEYS);
  const currentPrice = getNumber(record, CURRENT_PRICE_KEYS);
  const storedTaxSaving = getNumber(record, TAX_SAVING_KEYS);
  const calculatedTaxSaving = calculateTaxSavingEstimate(currentPrice, dividendAmount);
  const taxSavingOnce = calculatedTaxSaving ?? storedTaxSaving;
  const taxSavingPer10k = calculatedTaxSaving ?? getNumber(record, TAX_10K_KEYS) ?? storedTaxSaving;

  return {
    id: eventId,
    portfolioName: getText(record, ["portfolioName", "portfolio", "group", "categoryName"]) ?? (eventType === "custom" ? "기타" : "배당주"),
    ticker,
    eventType,
    date,
    shortLabel: getText(record, ["shortLabel", "short_label"]) ?? `${labelTicker} ${eventType === "custom" ? "" : shortEventType(eventType)}`.trim(),
    dividendAmount,
    currentPrice,
    annualYield: getNumber(record, YIELD_KEYS),
    memo: memo ?? customMemo ?? tickerMemo,
    tickerMemo,
    customMemo,
    buyDate: getDate(record, BUY_DATE_KEYS),
    exDate: getDate(record, EX_DATE_KEYS),
    payDate: getDate(record, PAY_DATE_KEYS),
    taxSaving: taxSavingOnce,
    taxSavingOnce,
    taxSavingPer10k,
    star: getBoolean(record, ["star", "favorite", "isFavorite"]) ?? false,
    heart: getBoolean(record, ["heart", "liked", "isLiked"]) ?? false,
    alertEnabled: getBoolean(record, ["alertEnabled", "alert", "alarm", "notification"]) ?? false,
    status: normalizeStatus(record),
    customTitle,
  };
}

function addPlan(plans: DatePlan[], eventType: EventType, date?: string) {
  if (!date) {
    return;
  }
  plans.push({ eventType, date });
}

function normalizeEventType(value?: string): EventType | undefined {
  if (!value) {
    return undefined;
  }
  const squashed = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  const compact = squashed.replace(/-/g, "");

  if (["ex-div", "ex-date"].includes(squashed) || ["exdiv", "exdate", "exdividend"].includes(compact) || value.includes("배당락")) {
    return "Ex-Div";
  }
  if (
    ["buy", "buy-by", "buy-deadline"].includes(squashed) ||
    ["buyby", "buydeadline"].includes(compact) ||
    value.includes("매수마감") ||
    value.includes("매수")
  ) {
    return "Buy";
  }
  if (["pay", "payment", "payment-date"].includes(squashed) || ["paymentdate"].includes(compact) || value.includes("배당지급") || value.includes("지급")) {
    return "Pay";
  }
  if (["earn", "earning", "earnings"].includes(squashed) || value.includes("실적")) {
    return "Earn";
  }
  if (["custom", "memo", "personal"].includes(squashed) || value.includes("메모")) {
    return "custom";
  }
  return undefined;
}

function normalizeStatus(record: RawRecord): EventStatus {
  const status = getText(record, ["status", "state"]);
  const declared = getBoolean(record, ["declared", "isDeclared", "confirmed", "isConfirmed"]);
  const estimated = getBoolean(record, ["estimated", "isEstimated"]);
  if (declared === true || estimated === false) return "declared";
  if (declared === false || estimated === true) return "estimated";
  if (!status) return "estimated";

  const normalized = status.toLowerCase();
  if (["declared", "confirmed", "final", "dcl", "확정"].some((word) => normalized.includes(word))) {
    return "declared";
  }
  return "estimated";
}

function getDate(record: RawRecord, keys: string[]) {
  const value = getFirst(record, keys);
  return toDateKey(value);
}

function getFirstTypedDate(record: RawRecord) {
  return getDate(record, [...BUY_DATE_KEYS, ...EX_DATE_KEYS, ...PAY_DATE_KEYS, ...EARN_DATE_KEYS, ...GENERIC_DATE_KEYS]);
}

function toDateKey(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 100000000000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? undefined : formatDate(date);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  const ymd = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : formatDate(parsed);
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function inferDateFromPath(path: string) {
  const match = path.match(/(?:^|\.)(\d{4}[-./]\d{1,2}[-./]\d{1,2})(?:\.|$)/);
  return match ? toDateKey(match[1]) : undefined;
}

function getText(record: RawRecord, keys: string[]) {
  const value = getFirst(record, keys);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function getNumber(record: RawRecord, keys: string[]) {
  const value = getFirst(record, keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numericText = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0];
    const parsed = numericText ? Number(numericText) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function calculateTaxSavingEstimate(currentPrice?: number, dividendAmount?: number) {
  if (currentPrice === undefined || currentPrice <= 0 || dividendAmount === undefined || dividendAmount < 0) {
    return undefined;
  }
  const shares = Math.floor(INVESTMENT_BUDGET_USD / currentPrice);
  const savings = shares * dividendAmount * TAX_RETENTION_RATE * DIVIDEND_TAX_RATE;
  return Math.round(savings * 100) / 100;
}

function getBoolean(record: RawRecord, keys: string[]) {
  const value = getFirst(record, keys);
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1", "declared", "confirmed", "dcl"].includes(normalized)) return true;
    if (["false", "no", "n", "0", "estimated", "est"].includes(normalized)) return false;
  }
  return undefined;
}

function getFirst(record: RawRecord, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  const normalizedEntries = Object.entries(record).map(([key, value]) => [normalizeFieldKey(key), value] as const);
  for (const key of keys) {
    const match = normalizedEntries.find(([recordKey]) => recordKey === normalizeFieldKey(key));
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

function normalizeFieldKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_.-]+/g, "");
}

function looksLikeEventRecord(record: RawRecord) {
  return EVENT_RECORD_KEYS.some((key) => Object.prototype.hasOwnProperty.call(record, key));
}

function hasCustomText(record: RawRecord) {
  return Boolean(getText(record, [...TITLE_KEYS, ...CUSTOM_MEMO_KEYS, ...MEMO_KEYS]));
}

function getSourceId(record: RawRecord, key: string, index: number) {
  return getText(record, SOURCE_ID_KEYS) ?? key ?? String(index);
}

function getDedupKey(event: CalendarEvent, includeSource: boolean) {
  const source = includeSource ? `:${event.id.split("|").slice(3).join("|")}` : "";
  return `${event.ticker || "custom"}:${event.eventType}:${event.date}${source}`;
}

function makeEventId(ticker: string, eventType: EventType, date: string, sourceId: string) {
  return [ticker, eventType, date, sourceId].map((part) => sanitizeIdPart(part)).join("|");
}

function sanitizeIdPart(value: string) {
  return value.replace(/[|]/g, "/").trim();
}

function inferTickerFromKey(key: string) {
  const parts = key.split(".").filter(Boolean).reverse();
  const candidate = parts.find((part) => /^[A-Za-z][A-Za-z0-9.-]{0,9}$/.test(part))?.trim().toUpperCase();
  if (!candidate || ["ROOT", "EVENTS", "DIVIDEND_CALENDAR"].includes(candidate)) {
    return undefined;
  }
  return candidate;
}

function shortEventType(type: EventType) {
  if (type === "Ex-Div") return "Ex";
  if (type === "custom") return "";
  return type;
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
