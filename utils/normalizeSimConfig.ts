import { simulatorConfig } from "@/data/dummyData";

type RawRecord = Record<string, unknown>;
type SimConfig = typeof simulatorConfig;

export type NormalizedSimPlanRow = {
  year: number;
  monthlySaving: string;
  isa: boolean;
  pension: boolean;
  isaTransfer: boolean;
};

export type NormalizedSimConfig = {
  config: SimConfig;
  planRows: NormalizedSimPlanRow[];
  hasRemoteData: boolean;
};

const CONFIG_ALIASES: Record<keyof SimConfig, string[]> = {
  startYear: ["startYear", "start_year", "start year", "시작년도", "시작연도"],
  simYears: ["simYears", "sim_years", "simulationYears", "simulation_years", "기간", "시뮬기간", "시뮬레이션기간"],
  returnRate: ["returnRate", "return_rate", "annualReturn", "annual_return", "수익률"],
  inflationRate: ["inflationRate", "inflation_rate", "inflation", "물가상승률"],
  initIsa: ["initIsa", "init_isa", "initialIsa", "initial_isa", "초기ISA잔고", "기존ISA잔고"],
  initPension: ["initPension", "init_pension", "initialPension", "initial_pension", "초기연금저축", "기존연금저축잔고"],
  initGeneral: ["initGeneral", "init_general", "initialGeneral", "initial_general", "초기일반계좌", "기존일반위탁잔고"],
  initDividend: ["initDividend", "init_dividend", "initialDividend", "initial_dividend", "초기배당계좌", "기존배당계좌잔고"],
  withdrawRate: ["withdrawRate", "withdraw_rate", "인출률"],
  withdrawIncrease: ["withdrawIncrease", "withdraw_increase", "withdrawGrowth", "withdraw_growth", "인출금연간증액률", "인출증가율"],
  withdrawDelay: ["withdrawDelay", "withdraw_delay", "인출미루기", "인출미룰년수"],
};

const CONFIG_CONTAINER_KEYS = ["config", "settings", "simConfig", "sim_config", "simulationConfig", "simulation_config"];
const PLAN_COLLECTION_KEYS = [
  "planRows",
  "plan_rows",
  "planData",
  "plan_data",
  "investmentPlan",
  "investment_plan",
  "yearPlans",
  "year_plans",
  "yearlyPlan",
  "yearly_plan",
  "plans",
  "rows",
];
const PLAN_YEAR_KEYS = ["year", "년도", "연도"];
const PLAN_MONTHLY_KEYS = [
  "monthlyContribution",
  "monthly_contribution",
  "monthlySaving",
  "monthly_saving",
  "monthly",
  "월적립액(만원)",
  "월적립(만)",
  "월적립",
];
const PLAN_ISA_KEYS = ["isa", "isaCheck", "isa_check", "ISA적립"];
const PLAN_PENSION_KEYS = ["pension", "pensionCheck", "pension_check", "연금", "연금저축적립"];
const PLAN_TRANSFER_KEYS = ["isaTransfer", "isa_transfer", "transfer", "ISA이전", "ISA연금이전"];

export function normalizeSimConfig(raw: unknown): NormalizedSimConfig {
  if (!hasRemoteValue(raw)) {
    return {
      config: { ...simulatorConfig },
      planRows: [],
      hasRemoteData: false,
    };
  }

  const records = getConfigRecords(raw);
  const config = {
    ...simulatorConfig,
    startYear: getWholeNumber(records, CONFIG_ALIASES.startYear, simulatorConfig.startYear, 1900, 2200),
    simYears: getWholeNumber(records, CONFIG_ALIASES.simYears, simulatorConfig.simYears, 1, 100),
    returnRate: getPercent(records, CONFIG_ALIASES.returnRate, simulatorConfig.returnRate),
    inflationRate: getPercent(records, CONFIG_ALIASES.inflationRate, simulatorConfig.inflationRate),
    initIsa: getInitialBalance(records, CONFIG_ALIASES.initIsa, simulatorConfig.initIsa),
    initPension: getInitialBalance(records, CONFIG_ALIASES.initPension, simulatorConfig.initPension),
    initGeneral: getInitialBalance(records, CONFIG_ALIASES.initGeneral, simulatorConfig.initGeneral),
    initDividend: getInitialBalance(records, CONFIG_ALIASES.initDividend, simulatorConfig.initDividend),
    withdrawRate: getPercent(records, CONFIG_ALIASES.withdrawRate, simulatorConfig.withdrawRate),
    withdrawIncrease: getPercent(records, CONFIG_ALIASES.withdrawIncrease, simulatorConfig.withdrawIncrease),
    withdrawDelay: getWholeNumber(records, CONFIG_ALIASES.withdrawDelay, simulatorConfig.withdrawDelay, 0, 100),
  };

  const providedRows = getPlanRows(raw, records);
  const rowsByYear = new Map(providedRows.map((row) => [row.year, row]));
  const planRows = Array.from({ length: config.simYears }, (_, index) => {
    const year = config.startYear + index;
    return rowsByYear.get(year) ?? {
      year,
      monthlySaving: "0",
      isa: false,
      pension: false,
      isaTransfer: false,
    };
  });

  return { config, planRows, hasRemoteData: true };
}

function getConfigRecords(raw: unknown) {
  const records: RawRecord[] = [];
  if (isRecord(raw)) {
    CONFIG_CONTAINER_KEYS.forEach((key) => {
      const nested = getValue(raw, [key]);
      if (isRecord(nested)) records.push(nested);
    });
    records.push(raw);
  } else if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (isRecord(item)) records.push(item);
    });
  }
  return records;
}

function getPlanRows(raw: unknown, records: RawRecord[]) {
  let collection: unknown;
  for (const record of records) {
    collection = getValue(record, PLAN_COLLECTION_KEYS);
    if (collection !== undefined && collection !== null) break;
  }
  if (collection === undefined && Array.isArray(raw)) {
    collection = raw;
  }
  if (collection === undefined && isRecord(raw) && Object.keys(raw).some((key) => parseYear(key) !== undefined)) {
    collection = raw;
  }

  const entries: Array<[string | undefined, unknown]> = Array.isArray(collection)
    ? collection.map((item) => [undefined, item])
    : isRecord(collection)
      ? Object.entries(collection)
      : [];

  return entries
    .map(([fallbackYear, value]) => normalizePlanRow(value, fallbackYear))
    .filter((row): row is NormalizedSimPlanRow => row !== null);
}

function normalizePlanRow(value: unknown, fallbackYear?: string): NormalizedSimPlanRow | null {
  if (!isRecord(value)) return null;
  const year = getNumber(value, PLAN_YEAR_KEYS) ?? parseYear(fallbackYear);
  if (!year || year < 1900 || year > 2200) return null;

  const monthly = toManwon(getNumber(value, PLAN_MONTHLY_KEYS) ?? 0);
  return {
    year: Math.trunc(year),
    monthlySaving: String(Math.max(0, Math.round(monthly))),
    isa: getBoolean(value, PLAN_ISA_KEYS),
    pension: getBoolean(value, PLAN_PENSION_KEYS),
    isaTransfer: getBoolean(value, PLAN_TRANSFER_KEYS),
  };
}

function getWholeNumber(records: RawRecord[], aliases: string[], fallback: number, min: number, max: number) {
  const value = getFirstNumber(records, aliases);
  if (value === undefined) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function getPercent(records: RawRecord[], aliases: string[], fallback: number) {
  const value = getFirstNumber(records, aliases);
  if (value === undefined) return fallback;
  const percentage = Math.abs(value) > 0 && Math.abs(value) <= 1 ? value * 100 : value;
  return Number(percentage.toFixed(2));
}

function getInitialBalance(records: RawRecord[], aliases: string[], fallback: number) {
  const value = getFirstNumber(records, aliases);
  if (value === undefined) return fallback;
  // Streamlit persists balances in manwon; large values are treated as already KRW.
  return Math.max(0, Math.round(Math.abs(value) < 100000 ? value * 10000 : value));
}

function toManwon(value: number) {
  // Plan inputs are shown in manwon; unusually large raw values are treated as KRW.
  return Math.abs(value) < 100000 ? value : value / 10000;
}

function getFirstNumber(records: RawRecord[], aliases: string[]) {
  for (const record of records) {
    const value = getNumber(record, aliases);
    if (value !== undefined) return value;
  }
  return undefined;
}

function getNumber(record: RawRecord, aliases: string[]) {
  return toNumber(getValue(record, aliases));
}

function getBoolean(record: RawRecord, aliases: string[]) {
  const value = getValue(record, aliases);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return ["true", "1", "yes", "y", "on", "checked", "예", "사용"].includes(value.trim().toLowerCase());
  }
  return false;
}

function getValue(record: RawRecord, aliases: string[]) {
  const wanted = new Set(aliases.map(normalizeKey));
  const entry = Object.entries(record).find(([key]) => wanted.has(normalizeKey(key)));
  return entry?.[1];
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[\s_-]/g, "");
}

function parseYear(value?: string) {
  if (!value) return undefined;
  const match = value.match(/(?:^|[^\d])((?:19|20|21)\d{2})(?:[^\d]|$)/);
  return match ? Number(match[1]) : undefined;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasRemoteValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return isRecord(value) && Object.keys(value).length > 0;
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
