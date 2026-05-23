// ─────────────────────────────────────────────────────────────────
//  양도세치기 배당시뮬 (Dividend Capture Backtest) 계산 엔진
//  - Streamlit `pages_app/3_dividend_sim.py` 의 의미를 그대로 이식
//  - 입력: ticker, 투자자금(만원), 매수가 기준(default D-1 종가),
//          매도허용기간(거래일), 배당소득세율(%), 조회 기간(years|"max")
//  - 데이터: 외부 API 미연결. `dividendCaptureFixtures` 정적 ex-div 픽스처 사용.
//          (각 이벤트는 buyPrice=D-1 종가, dividendGross=세전 배당,
//           windowMaxHigh=매도 허용기간 내 일봉 고가 max, windowExitClose=마지막일 종가,
//           recoveryDate=손익분기점 회복일)
//  - 출력: KPI 6개 + 산점도 포인트 + 상세표 row + summary
//  - 원본 fixture mutate 금지, NaN/Infinity/undefined 노출 차단
// ─────────────────────────────────────────────────────────────────

import {
  dividendCaptureFixtures,
  type DividendCaptureEvent,
} from "@/data/dummyData";
import type { ScatterPoint } from "@/components/ScatterPlot";

export interface DividendCaptureInputs {
  ticker: string;
  investmentAmountMan: string | number; // 만원
  taxRatePct: string | number; // %
  sellWindowDays: string | number; // 거래일
  lookback: "max" | string; // "max" 또는 정수 문자열(년)
}

export interface DividendCaptureRow {
  exDate: string; // YYYY-MM-DD
  buyPrice: number;
  dividendNet: number; // 세후 1주 배당 ($)
  breakeven: number; // buyPrice - dividendNet
  success: boolean;
  returnRate: number; // %
  recoveryDate: string; // "" / "회복불가" / YYYY-MM-DD
  recoveryTradingDays: string; // "" / "회복불가" / "{n}거래일"
  recoveryCalendarDays: string; // "" / "회복불가" / "{n}일"
}

export interface DividendCaptureKpis {
  totalCount: number;
  successCount: number;
  failCount: number;
  winRate: number; // %
  avgWinReturn: number; // %
  avgLossReturn: number; // %
  profitLossRatio: number; // 비율
  expectedReturn: number; // %
  taxSavingPerTrade: number; // 원 (KRW). Streamlit식: avg_profit/100 * invest * 0.22
  totalNetDividend: number; // $ (세후 누적 1주 기준 합)
  averageBreakeven: number; // $
}

export interface DividendCaptureOutput {
  kpis: DividendCaptureKpis;
  detailRows: DividendCaptureRow[];
  scatterPoints: ScatterPoint[];
  usedStart: string; // YYYY-MM-DD or ""
  usedEnd: string; // YYYY-MM-DD or ""
  effectiveLookbackLabel: string;
  ticker: string;
  hasData: boolean;
  message?: string;
}

const KRW_PER_MAN = 10_000;
const USD_TO_KRW = 1380; // Streamlit 픽스처와 같은 의미: 환율 추정치 (절세액 표시용)
const DEFAULT_TAX_RATE_PCT = 15; // Streamlit 디폴트
const DEFAULT_SELL_WINDOW_DAYS = 0;
const TAX_SAVING_RATIO = 0.22; // Streamlit `tax_saving = avg_profit/100 * invest * 0.22`

export function computeDividendCapture(inputs: DividendCaptureInputs): DividendCaptureOutput {
  const ticker = (inputs.ticker || "").trim().toUpperCase();
  const investmentMan = clampNumber(inputs.investmentAmountMan, 0, 1_000_000, 500);
  const investmentKrw = investmentMan * KRW_PER_MAN;
  const taxRatePct = clampNumber(inputs.taxRatePct, 0, 99, DEFAULT_TAX_RATE_PCT);
  const sellWindow = clampInt(inputs.sellWindowDays, 0, 600, DEFAULT_SELL_WINDOW_DAYS);
  const { lookbackYears, isMax } = parseLookback(inputs.lookback);

  const events = (dividendCaptureFixtures[ticker] ?? []).slice();
  // 시간순 정렬 (원본 mutate 금지)
  const sortedEvents = events
    .filter((e) => isValidIsoDate(e.exDate))
    .slice()
    .sort((a, b) => (a.exDate < b.exDate ? -1 : a.exDate > b.exDate ? 1 : 0));

  if (sortedEvents.length === 0) {
    return emptyOutput(ticker, isMax ? "최대" : `최근 ${lookbackYears}년`,
      `${ticker} 의 백테스트 데이터가 앱에 없습니다.`);
  }

  // 조회 기간 필터: max → 전체, 그 외 → 최근 N 년
  const filtered = isMax ? sortedEvents : filterByLookback(sortedEvents, lookbackYears);
  if (filtered.length === 0) {
    return emptyOutput(ticker, isMax ? "최대" : `최근 ${lookbackYears}년`,
      `최근 ${lookbackYears}년 구간에 분석할 수 있는 이벤트가 없습니다.`);
  }

  // ── 이벤트별 결과 ────────────────────────────────────────────
  const detailRows: DividendCaptureRow[] = filtered.map((e) => buildEventRow(e, taxRatePct, sellWindow));

  // ── KPI ─────────────────────────────────────────────────────
  const totalCount = detailRows.length;
  const successes = detailRows.filter((r) => r.success);
  const failures = detailRows.filter((r) => !r.success);
  const successCount = successes.length;
  const failCount = failures.length;
  const winRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
  const avgWinReturn = mean(successes.map((r) => r.returnRate));
  const avgLossReturn = mean(failures.map((r) => r.returnRate));
  const profitLossRatio = avgLossReturn !== 0 && Number.isFinite(avgWinReturn) && Number.isFinite(avgLossReturn)
    ? Math.abs(avgWinReturn / avgLossReturn)
    : 0;
  const expectedReturn = mean(detailRows.map((r) => r.returnRate));
  // Streamlit: tax_saving = (avg_profit / 100) * invest_capital * 0.22 (USD 기준)
  // 모바일 앱은 원화 입력이므로 동등 효과를 위해 USD↔KRW 환산 후 동일 식 적용
  const investmentUsd = investmentKrw / USD_TO_KRW;
  const taxSavingUsd = Number.isFinite(avgWinReturn)
    ? (avgWinReturn / 100) * investmentUsd * TAX_SAVING_RATIO
    : 0;
  const taxSavingKrw = Math.max(0, Math.round(taxSavingUsd * USD_TO_KRW));

  const totalNetDividend = sum(detailRows.map((r) => r.dividendNet));
  const averageBreakeven = mean(detailRows.map((r) => r.breakeven));

  // ── 산점도 ──────────────────────────────────────────────────
  const scatterPoints: ScatterPoint[] = detailRows.map((r, idx) => {
    const xRatio = totalCount > 1 ? idx / (totalCount - 1) : 0.5;
    const x = 6 + xRatio * 88; // 0~100 영역 안에서 양 끝 여유
    // y는 -10% ~ +10% 범위를 0~100 비례로 매핑 (그 밖은 클램프)
    const y = clamp((r.returnRate + 10) * 5, 4, 96);
    return {
      id: `${r.exDate}-${idx}`,
      x,
      y,
      success: r.success,
      label: r.exDate.slice(0, 7), // "YYYY-MM"
      tooltip: `${r.exDate} · 수익률 ${formatSigned(r.returnRate)}% · ${r.success ? "성공" : "실패"}`,
    };
  });

  return {
    kpis: {
      totalCount,
      successCount,
      failCount,
      winRate: round1(winRate),
      avgWinReturn: round2(avgWinReturn),
      avgLossReturn: round2(avgLossReturn),
      profitLossRatio: round2(profitLossRatio),
      expectedReturn: round2(expectedReturn),
      taxSavingPerTrade: taxSavingKrw,
      totalNetDividend: round4(totalNetDividend),
      averageBreakeven: round2(averageBreakeven),
    },
    detailRows,
    scatterPoints,
    usedStart: detailRows[0].exDate,
    usedEnd: detailRows[detailRows.length - 1].exDate,
    effectiveLookbackLabel: isMax ? "최대" : `최근 ${lookbackYears}년`,
    ticker,
    hasData: true,
  };
}

// ─────────────────────────────────────────────────────────────────
//  내부 헬퍼
// ─────────────────────────────────────────────────────────────────
function buildEventRow(event: DividendCaptureEvent, taxRatePct: number, _sellWindow: number): DividendCaptureRow {
  const buyPrice = positiveOr(event.buyPrice, 0);
  const dividendGross = positiveOr(event.dividendGross, 0);
  const windowMaxHigh = positiveOr(event.windowMaxHigh, buyPrice);
  const windowExitClose = positiveOr(event.windowExitClose, buyPrice);

  const dividendNet = dividendGross * (1 - taxRatePct / 100);
  const breakeven = buyPrice - dividendNet;
  const isSuccess = windowMaxHigh >= breakeven;

  let returnRate = 0;
  let recoveryDate = "";
  let recoveryTradingDays = "";
  let recoveryCalendarDays = "";

  if (isSuccess) {
    // Streamlit: profit_pct = (after_tax_div / buy_price) * 100
    returnRate = buyPrice > 0 ? (dividendNet / buyPrice) * 100 : 0;
  } else {
    // sell_price = window 마지막 종가, 손익률 = (sell + div - buy) / buy
    returnRate = buyPrice > 0 ? ((windowExitClose + dividendNet - buyPrice) / buyPrice) * 100 : 0;
    if (event.recoveryDate && isValidIsoDate(event.recoveryDate)) {
      recoveryDate = event.recoveryDate;
      recoveryTradingDays = Number.isFinite(event.recoveryTradingDays) ? `${event.recoveryTradingDays}거래일` : "-";
      recoveryCalendarDays = Number.isFinite(event.recoveryCalendarDays) ? `${event.recoveryCalendarDays}일` : "-";
    } else {
      recoveryDate = "회복불가";
      recoveryTradingDays = "회복불가";
      recoveryCalendarDays = "회복불가";
    }
  }

  return {
    exDate: event.exDate,
    buyPrice: round2(buyPrice),
    dividendNet: round4(dividendNet),
    breakeven: round4(breakeven),
    success: isSuccess,
    returnRate: round2(returnRate),
    recoveryDate,
    recoveryTradingDays,
    recoveryCalendarDays,
  };
}

function emptyOutput(ticker: string, lookbackLabel: string, message: string): DividendCaptureOutput {
  return {
    kpis: {
      totalCount: 0,
      successCount: 0,
      failCount: 0,
      winRate: 0,
      avgWinReturn: 0,
      avgLossReturn: 0,
      profitLossRatio: 0,
      expectedReturn: 0,
      taxSavingPerTrade: 0,
      totalNetDividend: 0,
      averageBreakeven: 0,
    },
    detailRows: [],
    scatterPoints: [],
    usedStart: "",
    usedEnd: "",
    effectiveLookbackLabel: lookbackLabel,
    ticker,
    hasData: false,
    message,
  };
}

function filterByLookback(events: DividendCaptureEvent[], years: number) {
  if (events.length === 0) return events;
  // 픽스처는 실제 시점이 아닌 "기준일"이 마지막 ex-date. 최근 N년 = 마지막 ex-date 로부터 N년
  const lastDate = events[events.length - 1].exDate;
  const cutoff = subtractYearsIso(lastDate, years);
  return events.filter((e) => e.exDate >= cutoff);
}

function subtractYearsIso(iso: string, years: number) {
  const [y, m, d] = iso.split("-").map((v) => Number(v));
  const baseY = Number.isFinite(y) ? y : new Date().getFullYear();
  const baseM = Number.isFinite(m) ? m : 1;
  const baseD = Number.isFinite(d) ? d : 1;
  const target = new Date(Date.UTC(baseY - years, baseM - 1, baseD));
  return formatIsoDateUtc(target);
}

function formatIsoDateUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLookback(value: "max" | string | undefined) {
  if (value === "max") return { lookbackYears: 0, isMax: true };
  const trimmed = (value ?? "").toString().trim().toLowerCase();
  if (trimmed === "max" || trimmed === "" || trimmed === "전체") {
    return { lookbackYears: 0, isMax: true };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return { lookbackYears: 5, isMax: false };
  return { lookbackYears: Math.min(50, Math.max(1, Math.trunc(n))), isMax: false };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const n = toFiniteNumber(value, fallback);
  return Math.min(max, Math.max(min, n));
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = toFiniteNumber(value, fallback);
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function toFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function positiveOr(value: unknown, fallback: number) {
  const n = toFiniteNumber(value, fallback);
  return n > 0 ? n : fallback;
}

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  const total = values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
  return total / values.length;
}

function sum(values: number[]) {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}
function round2(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}
function round4(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}
function formatSigned(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}
