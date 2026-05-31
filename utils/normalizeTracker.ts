import type { AssetMonthly, TagCategory } from "@/data/dummyData";

type RawRecord = Record<string, unknown>;

export type TrackerTickerBreakdown = Record<string, Array<{ name: string; amount: number }>>;

export type NormalizedTracker = {
  months: AssetMonthly[];
  tickerBreakdownByMonth: TrackerTickerBreakdown;
};

type MonthBucket = {
  month: string;
  items: Map<string, number>;
  memo?: string;
};

const MONTH_KEYS = ["month", "monthKey", "month_key", "date", "snapshotDate", "snapshot_date", "createdAt", "created_at"];
const ITEM_COLLECTION_KEYS = [
  "items",
  "assets",
  "rows",
  "entries",
  "holdings",
  "breakdown",
  "tickerBreakdown",
  "ticker_breakdown",
  "tags",
];
const TOTAL_KEYS = ["totalAsset", "total_asset", "total", "totalAssets", "total_assets", "amount", "balance", "value"];
const NAME_KEYS = ["name", "ticker", "tag", "label", "category", "asset", "symbol", "item"];
const AMOUNT_KEYS = ["amount", "balance", "value", "marketValue", "market_value", "total", "totalAsset", "total_asset"];
const MEMO_KEYS = ["memo", "note", "description"];

const CATEGORY_ORDER = ["현금", "달러", "SGOV/채권성", "나스닥", "SPY", "배당주", "기타"];

export function normalizeTracker(raw: unknown): NormalizedTracker {
  if (raw === null || raw === undefined) {
    return { months: [], tickerBreakdownByMonth: {} };
  }

  const buckets = collectMonthBuckets(raw);
  const sortedMonths = Array.from(buckets.values())
    .map((bucket) => bucketToMonth(bucket))
    .filter((month): month is AssetMonthly => month !== null)
    .sort((a, b) => a.month.localeCompare(b.month));
  const months = sortedMonths.map((month, index) => ({
    ...month,
    changeFromPrev: index === 0 ? 0 : month.totalAsset - sortedMonths[index - 1].totalAsset,
  }));

  const tickerBreakdownByMonth = Object.fromEntries(
    months.map((month) => [
      month.month,
      Array.from(buckets.get(month.month)?.items.entries() ?? [])
        .map(([name, amount]) => ({ name, amount }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)),
    ]),
  );

  return { months, tickerBreakdownByMonth };
}

function collectMonthBuckets(raw: unknown): Map<string, MonthBucket> {
  const buckets = new Map<string, MonthBucket>();

  if (Array.isArray(raw)) {
    raw.forEach((value, index) => collectMonthValue(value, String(index), buckets));
    return buckets;
  }

  if (!isRecord(raw)) {
    return buckets;
  }

  if (looksLikeSnapshot(raw)) {
    collectMonthValue(raw, getText(raw, MONTH_KEYS) ?? "root", buckets);
    return buckets;
  }

  Object.entries(raw).forEach(([key, value]) => {
    if (["config", "settings", "tracker_config"].includes(key)) {
      return;
    }
    collectMonthValue(value, key, buckets);
  });

  return buckets;
}

function collectMonthValue(value: unknown, fallbackKey: string, buckets: Map<string, MonthBucket>) {
  if (value === null || value === undefined) {
    return;
  }

  const inferredMonth = parseMonthKey(fallbackKey);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (isRecord(item)) {
        const month = getMonthFromRecord(item) ?? inferredMonth;
        if (month) addRecordItem(month, item, buckets, `${fallbackKey}.${index}`);
      }
    });
    return;
  }

  if (!isRecord(value)) {
    const amount = toAmount(value);
    if (inferredMonth && amount > 0) {
      addItem(inferredMonth, fallbackKey, amount, buckets);
    }
    return;
  }

  const month = getMonthFromRecord(value) ?? inferredMonth;
  if (!month) {
    Object.entries(value).forEach(([key, child]) => collectMonthValue(child, key, buckets));
    return;
  }

  const memo = getText(value, MEMO_KEYS);
  if (memo) {
    ensureBucket(month, buckets).memo = memo;
  }

  const handledCollection = ITEM_COLLECTION_KEYS.some((key) => {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return false;
    }
    collectItems(month, value[key], buckets);
    return true;
  });

  if (handledCollection) {
    return;
  }

  const rowAmount = getNumber(value, AMOUNT_KEYS);
  const rowName = getText(value, NAME_KEYS);
  if (rowName && rowAmount > 0 && !isTotalOnlyName(rowName)) {
    addItem(month, rowName, rowAmount, buckets);
    return;
  }

  Object.entries(value).forEach(([key, child]) => {
    if ([...MONTH_KEYS, ...TOTAL_KEYS, ...MEMO_KEYS].includes(key)) {
      return;
    }
    if (isRecord(child) || Array.isArray(child)) {
      collectItems(month, child, buckets, key);
      return;
    }
    const amount = toAmount(child);
    if (amount > 0) {
      addItem(month, key, amount, buckets);
    }
  });
}

function collectItems(month: string, value: unknown, buckets: Map<string, MonthBucket>, fallbackName?: string) {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (isRecord(item)) {
        addRecordItem(month, item, buckets, `${fallbackName ?? "item"}.${index}`);
      }
    });
    return;
  }

  if (!isRecord(value)) {
    const amount = toAmount(value);
    if (fallbackName && amount > 0) {
      addItem(month, fallbackName, amount, buckets);
    }
    return;
  }

  if (looksLikeItem(value)) {
    addRecordItem(month, value, buckets, fallbackName);
    return;
  }

  Object.entries(value).forEach(([key, child]) => {
    if (isRecord(child)) {
      addRecordItem(month, child, buckets, key);
      return;
    }
    const amount = toAmount(child);
    if (amount > 0) {
      addItem(month, key, amount, buckets);
    }
  });
}

function addRecordItem(month: string, record: RawRecord, buckets: Map<string, MonthBucket>, fallbackName?: string) {
  const nestedHandled = ITEM_COLLECTION_KEYS.some((key) => {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      return false;
    }
    collectItems(month, record[key], buckets);
    return true;
  });
  if (nestedHandled) {
    return;
  }

  const name = getText(record, NAME_KEYS) ?? fallbackName;
  const amount = getNumber(record, AMOUNT_KEYS);
  if (!name || amount <= 0 || isTotalOnlyName(name)) {
    return;
  }
  addItem(month, name, amount, buckets);
}

function addItem(month: string, rawName: string, amount: number, buckets: Map<string, MonthBucket>) {
  const name = cleanName(rawName);
  if (!name || amount <= 0 || isTotalOnlyName(name)) {
    return;
  }
  const bucket = ensureBucket(month, buckets);
  bucket.items.set(name, (bucket.items.get(name) ?? 0) + amount);
}

function ensureBucket(month: string, buckets: Map<string, MonthBucket>) {
  const existing = buckets.get(month);
  if (existing) {
    return existing;
  }
  const bucket: MonthBucket = { month, items: new Map<string, number>() };
  buckets.set(month, bucket);
  return bucket;
}

function bucketToMonth(bucket: MonthBucket): AssetMonthly | null {
  const tickerItems = Array.from(bucket.items.entries()).filter(([, amount]) => amount > 0);
  if (tickerItems.length === 0) {
    return null;
  }

  const totalAsset = tickerItems.reduce((sum, [, amount]) => sum + amount, 0);
  const categoryTotals = new Map<string, { amount: number; category: TagCategory }>();
  tickerItems.forEach(([name, amount]) => {
    const categoryName = getCategoryName(name);
    const existing = categoryTotals.get(categoryName) ?? { amount: 0, category: getTagCategory(categoryName) };
    existing.amount += amount;
    categoryTotals.set(categoryName, existing);
  });

  const tags = Array.from(categoryTotals.entries())
    .map(([name, item]) => ({
      name,
      amount: item.amount,
      ratio: totalAsset ? (item.amount / totalAsset) * 100 : 0,
      category: item.category,
    }))
    .sort((a, b) => categorySort(a.name, b.name));

  return {
    month: bucket.month,
    displayLabel: formatDisplayLabel(bucket.month),
    totalAsset,
    changeFromPrev: 0,
    tags,
    memo: bucket.memo,
  };
}

function looksLikeSnapshot(record: RawRecord) {
  return Boolean(getMonthFromRecord(record)) || ITEM_COLLECTION_KEYS.some((key) => Object.prototype.hasOwnProperty.call(record, key));
}

function looksLikeItem(record: RawRecord) {
  return Boolean(getText(record, NAME_KEYS)) && getNumber(record, AMOUNT_KEYS) > 0;
}

function getMonthFromRecord(record: RawRecord) {
  return parseMonthKey(getText(record, MONTH_KEYS));
}

function parseMonthKey(value?: string) {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  const ymd = trimmed.match(/(\d{4})[./-](\d{1,2})(?:[./-]\d{1,2})?/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}`;
  }
  const ymCompact = trimmed.match(/^(\d{4})(\d{2})$/);
  if (ymCompact) {
    return `${ymCompact[1]}-${ymCompact[2]}`;
  }
  return undefined;
}

function formatDisplayLabel(month: string) {
  const [year, monthPart] = month.split("-");
  return `${year.slice(2)}-${monthPart}`;
}

function cleanName(value: string) {
  return value
    .replace(/LBRB|LB|RB|_HASH_|_DOT_|_DOL_|_SL_/g, "")
    .replace(/[|]/g, " ")
    .trim();
}

function isTotalOnlyName(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[\s_-]/g, "");
  return ["total", "totalasset", "totalassets", "합계", "총자산", "전체"].includes(normalized);
}

function getCategoryName(name: string) {
  const upper = name.trim().toUpperCase();
  const lower = name.trim().toLowerCase();
  if (["현금", "KRW", "CASH"].includes(upper) || /예금|적금|입출금|CMA|MMF|RP|대출/.test(name)) return "현금";
  if (["달러", "USD", "DOLLAR"].includes(upper) || lower.includes("usd") || name.includes("달러")) return "달러";
  if (upper.includes("SGOV") || name.includes("채권")) return "SGOV/채권성";
  if (["QQQ", "QQQM", "QLD", "TQQQ", "SOXL", "TECL", "FNGU", "BULZ", "SSO"].includes(upper) || name.includes("나스닥")) return "나스닥";
  if (["SPY", "VOO", "IVV", "SPLG", "UPRO"].includes(upper) || lower.includes("s&p") || lower.includes("sp500")) return "SPY";
  if (
    ["SCHD", "VYM", "DGRO", "APAM", "TROW", "OHI", "MLPA", "OWL", "CHRD", "FEPI", "KO", "JNJ", "PG", "AAPL", "MSFT", "VTI", "VTV", "VUG", "DIA"].includes(upper) ||
    lower.includes("dividend") ||
    name.includes("배당")
  ) {
    return "배당주";
  }
  return "기타";
}

function getTagCategory(categoryName: string): TagCategory {
  if (categoryName === "현금" || categoryName === "달러") return "cash";
  if (categoryName === "SGOV/채권성") return "bond";
  if (categoryName === "배당주") return "dividend";
  if (categoryName === "나스닥" || categoryName === "SPY") return "stock";
  return "other";
}

function categorySort(a: string, b: string) {
  const ai = CATEGORY_ORDER.indexOf(a);
  const bi = CATEGORY_ORDER.indexOf(b);
  const ao = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
  const bo = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
  return ao - bo || a.localeCompare(b);
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
  return toAmount(getFirst(record, keys));
}

function toAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value === "string") {
    const normalized = value.replace(/[₩원$,\s]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}

function getFirst(record: RawRecord, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
