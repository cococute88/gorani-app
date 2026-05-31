// ─────────────────────────────────────────────────────────────────
//  매도전환계산기(Switch Ratio) 계산 엔진
//  - Streamlit `pages_app/4_conversion_analysis.py` 의 의미를 그대로 이식
//      * Conversion_Ratio = Sell_Price / Buy_Price
//      * average_ratio = mean(Conversion_Ratio)
//      * latest_ratio  = Conversion_Ratio.iloc[-1]
//      * delta = latest - average
//  - 외부 가격 API는 연결하지 않고, 앱 내부의 dummyData(`calculatorData.conversionAnalysis`)를
//    합쳐 일자 정렬된 series로 사용
//  - 입력값에 따라 [startDate, endDate] 구간 필터, 평균/최신/차이 다시 계산
//  - 원본 데이터는 mutate 하지 않음, NaN/Infinity 노출 차단
// ─────────────────────────────────────────────────────────────────

import { calculatorData } from "@/data/dummyData";

export interface SwitchRatioInputs {
  sellTicker: string;
  buyTicker: string;
  startDate: string; // "YYYY-MM-DD" (문자열 그대로 받음)
  endDate: string; // "YYYY-MM-DD"
}

export interface SwitchRatioChartPoint {
  label: string; // YY-MM
  value: number; // ratio
  tooltip: string;
}

export interface SwitchRatioTableRow {
  date: string; // YYYY-MM-DD
  sellPrice: number;
  buyPrice: number;
  ratio: number;
}

export interface SwitchRatioOutput {
  chartData: SwitchRatioChartPoint[];
  tableRows: SwitchRatioTableRow[];
  currentRatio: number;
  avgRatio: number;
  diffPct: number;
  diffAbs: number;
  usedStart: string; // YYYY-MM-DD or ""
  usedEnd: string; // YYYY-MM-DD or ""
  sellTicker: string;
  buyTicker: string;
  pointCount: number;
}

type SourcePoint = {
  isoDate: string; // YYYY-MM-DD
  sellPrice: number;
  buyPrice: number;
  shortLabel: string; // YY-MM
};

// ── 진입점 ───────────────────────────────────────────────────────
export function computeSwitchRatio(inputs: SwitchRatioInputs): SwitchRatioOutput {
  const sellTicker = (inputs.sellTicker || "").trim().toUpperCase();
  const buyTicker = (inputs.buyTicker || "").trim().toUpperCase();
  const points = collectSourcePoints();
  const filtered = filterByDateRange(points, inputs.startDate, inputs.endDate);

  // 데이터가 한 점도 남지 않는 비정상 입력은 안전한 기본값 반환
  if (filtered.length === 0) {
    return {
      chartData: [],
      tableRows: [],
      currentRatio: 0,
      avgRatio: 0,
      diffPct: 0,
      diffAbs: 0,
      usedStart: "",
      usedEnd: "",
      sellTicker,
      buyTicker,
      pointCount: 0,
    };
  }

  const chartData: SwitchRatioChartPoint[] = filtered.map((p) => ({
    label: p.shortLabel,
    value: round4(safeRatio(p.sellPrice, p.buyPrice)),
    tooltip: `${p.isoDate} · 전환비 ${round4(safeRatio(p.sellPrice, p.buyPrice)).toFixed(3)}`,
  }));

  const tableRows: SwitchRatioTableRow[] = filtered.map((p) => ({
    date: p.isoDate,
    sellPrice: p.sellPrice,
    buyPrice: p.buyPrice,
    ratio: round4(safeRatio(p.sellPrice, p.buyPrice)),
  }));

  const ratios = filtered
    .map((p) => safeRatio(p.sellPrice, p.buyPrice))
    .filter((v) => Number.isFinite(v));
  const avgRatio = ratios.length > 0 ? avg(ratios) : 0;
  const currentRatio = ratios[ratios.length - 1] ?? 0;
  const diffAbs = currentRatio - avgRatio;
  const diffPct = avgRatio !== 0 ? (diffAbs / avgRatio) * 100 : 0;

  return {
    chartData,
    tableRows,
    currentRatio: round4(currentRatio),
    avgRatio: round4(avgRatio),
    diffPct: round4(diffPct),
    diffAbs: round4(diffAbs),
    usedStart: filtered[0].isoDate,
    usedEnd: filtered[filtered.length - 1].isoDate,
    sellTicker,
    buyTicker,
    pointCount: filtered.length,
  };
}

// ─────────────────────────────────────────────────────────────────
//  내부 헬퍼
// ─────────────────────────────────────────────────────────────────

// dummyData의 ratioTrend(차트용·YY-MM)와 tableRows(상세표·YYYY-MM-DD)를
// 하나의 일자 series로 합친다. 동일 month-key가 둘 다 있으면 더 정확한
// tableRows(완전 ISO 날짜) 쪽을 우선 사용한다.
function collectSourcePoints(): SourcePoint[] {
  const trend = calculatorData.conversionAnalysis.ratioTrend ?? [];
  const detailRows = calculatorData.conversionAnalysis.tableRows ?? [];

  const map = new Map<string, SourcePoint>();

  trend.forEach((row) => {
    const isoDate = parseShortDateToIso(row.date);
    if (!isoDate) return;
    const monthKey = isoDate.slice(0, 7);
    map.set(monthKey, {
      isoDate,
      sellPrice: numericOr(row.sellPrice, 0),
      buyPrice: numericOr(row.buyPrice, 0),
      shortLabel: row.date,
    });
  });

  detailRows.forEach((row) => {
    const isoDate = isValidIsoDate(row.date) ? row.date : parseShortDateToIso(row.date) ?? "";
    if (!isoDate) return;
    const monthKey = isoDate.slice(0, 7);
    const shortLabel = monthKeyToShortLabel(monthKey);
    map.set(monthKey, {
      isoDate,
      sellPrice: numericOr(row.sellPrice, 0),
      buyPrice: numericOr(row.buyPrice, 0),
      shortLabel,
    });
  });

  return Array.from(map.values())
    .filter((p) => p.sellPrice > 0 && p.buyPrice > 0)
    .sort((a, b) => (a.isoDate < b.isoDate ? -1 : a.isoDate > b.isoDate ? 1 : 0));
}

function filterByDateRange(points: SourcePoint[], startDate: string, endDate: string) {
  const start = normalizeDateBoundary(startDate, "start");
  const end = normalizeDateBoundary(endDate, "end");
  return points.filter((p) => {
    if (start && p.isoDate < start) return false;
    if (end && p.isoDate > end) return false;
    return true;
  });
}

function normalizeDateBoundary(value: string, mode: "start" | "end"): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (isValidIsoDate(v)) return v;
  // YY-MM 같은 단축 입력도 안전하게 받기
  const iso = parseShortDateToIso(v);
  if (iso) {
    if (mode === "end") {
      // YY-MM 만 들어오면 그 달의 말일까지 포함되도록 31로 비교 (문자열 비교로도 안전)
      return `${iso.slice(0, 7)}-31`;
    }
    return iso;
  }
  // YYYY 만 들어온 경우
  if (/^\d{4}$/.test(v)) return mode === "start" ? `${v}-01-01` : `${v}-12-31`;
  return null;
}

function parseShortDateToIso(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // YYYY-MM
  const ym = v.match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  // YY-MM (예: "23-04") → 20YY-MM-01
  const yym = v.match(/^(\d{2})-(\d{2})$/);
  if (yym) return `20${yym[1]}-${yym[2]}-01`;
  // YYYY/MM/DD
  const ymd = v.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/);
  if (ymd) {
    const m = ymd[2].padStart(2, "0");
    const d = ymd[3].padStart(2, "0");
    return `${ymd[1]}-${m}-${d}`;
  }
  return null;
}

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function monthKeyToShortLabel(monthKey: string) {
  // "2023-04" → "23-04"
  if (/^\d{4}-\d{2}$/.test(monthKey)) return monthKey.slice(2);
  return monthKey;
}

function safeRatio(sell: number, buy: number) {
  if (!Number.isFinite(sell) || !Number.isFinite(buy) || buy === 0) return 0;
  const r = sell / buy;
  return Number.isFinite(r) ? r : 0;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

function round4(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}

function numericOr(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.\-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}
