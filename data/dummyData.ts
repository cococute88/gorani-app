// ─────────────────────────────────────────────────────────────────
//  고라니 투자비서 — 더미 데이터
//  Codex가 Firebase 호출로 교체할 파일
// ─────────────────────────────────────────────────────────────────

// ── 이벤트 타입 ─────────────────────────────────────────────────
export type EventType = "Ex-Div" | "Buy" | "Pay" | "Earn";

export const EVENT_COLORS: Record<EventType, string> = {
  "Ex-Div": "#E07B6A",
  Buy: "#C9A96E",
  Pay: "#6AAB82",
  Earn: "#8B6F47",
};

// ── 캘린더 이벤트 ───────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  portfolioName: string;
  ticker: string;
  eventType: EventType;
  date: string;           // YYYY-MM-DD
  shortLabel: string;     // 캘린더 셀 안에 표시할 짧은 텍스트
  dividendAmount?: number;
  currentPrice?: number;
  annualYield?: number;
  memo?: string;
  star: boolean;
  heart: boolean;
  alertEnabled: boolean;
  customSymbol?: string;
  customTitle?: string;
}

export const calendarEvents: CalendarEvent[] = [
  { id: "1",  portfolioName: "배당주", ticker: "APAM",    eventType: "Ex-Div", date: "2026-05-20", shortLabel: "APAM Ex",    dividendAmount: 1.25, currentPrice: 36.8,  annualYield: 13.6, memo: "분기 배당, 전략 미리 확인",   star: true,  heart: false, alertEnabled: true  },
  { id: "2",  portfolioName: "배당주", ticker: "APAM",    eventType: "Pay",    date: "2026-05-23", shortLabel: "APAM Pay",   dividendAmount: 1.25, currentPrice: 36.8,  annualYield: 13.6, memo: "약 $1.25/주 예상",           star: true,  heart: false, alertEnabled: true  },
  { id: "3",  portfolioName: "채권성", ticker: "SGOV",    eventType: "Pay",    date: "2026-05-15", shortLabel: "SGOV Pay",   dividendAmount: 0.42, currentPrice: 100.7, annualYield: 5.0,  memo: "월 배당 수령",               star: true,  heart: true,  alertEnabled: true  },
  { id: "4",  portfolioName: "배당주", ticker: "TROW",    eventType: "Ex-Div", date: "2026-05-28", shortLabel: "TROW Ex",    dividendAmount: 1.24, currentPrice: 102.3, annualYield: 4.8,  memo: "배당금 재투자 고려",          star: false, heart: false, alertEnabled: false },
  { id: "5",  portfolioName: "나스닥", ticker: "CHRD",    eventType: "Earn",   date: "2026-05-21", shortLabel: "CHRD Earn",  memo: "WTI 흐름 주목",                                                                            star: false, heart: true,  alertEnabled: false },
  { id: "6",  portfolioName: "기타",  ticker: "장전체크", eventType: "Buy",    date: "2026-05-21", shortLabel: "장전 체크",  memo: "WTI, XLF 확인",                                                                            star: false, heart: false, alertEnabled: false },
  { id: "7",  portfolioName: "배당주", ticker: "IVZ",     eventType: "Ex-Div", date: "2026-06-05", shortLabel: "IVZ Ex",     dividendAmount: 0.19, currentPrice: 15.2,  annualYield: 5.0,  memo: "배당 수익률 5% 수준",        star: false, heart: false, alertEnabled: false },
  { id: "8",  portfolioName: "기타",  ticker: "메모",     eventType: "Buy",    date: "2026-05-26", shortLabel: "시장 메모",  memo: "연준 발언 주목",                                            customTitle: "FOMC 체크",       star: false, heart: false, alertEnabled: false },
  { id: "9",  portfolioName: "배당주", ticker: "CHRD",    eventType: "Ex-Div", date: "2026-06-18", shortLabel: "CHRD Ex",    dividendAmount: 1.25, currentPrice: 118.4, annualYield: 4.2,  memo: "특별배당 가능성",            star: false, heart: true,  alertEnabled: false },
  { id: "10", portfolioName: "배당주", ticker: "TROW",    eventType: "Pay",    date: "2026-06-01", shortLabel: "TROW Pay",   dividendAmount: 1.24, currentPrice: 102.3, annualYield: 4.8,                                      star: false, heart: false, alertEnabled: false },
  { id: "11", portfolioName: "배당주", ticker: "IVZ",     eventType: "Pay",    date: "2026-06-12", shortLabel: "IVZ Pay",    dividendAmount: 0.19, currentPrice: 15.2,  annualYield: 5.0,                                      star: false, heart: false, alertEnabled: false },
  { id: "12", portfolioName: "채권성", ticker: "SGOV",    eventType: "Ex-Div", date: "2026-06-15", shortLabel: "SGOV Ex",    dividendAmount: 0.42, currentPrice: 100.7, annualYield: 5.0,  memo: "6월 배당락",               star: true,  heart: true,  alertEnabled: true  },
];

// ── 포트폴리오 티커 ──────────────────────────────────────────────
export interface PortfolioTicker {
  ticker: string;
  name: string;
  portfolioName: string;
  memo: string;
  star: boolean;
  heart: boolean;
  alertEnabled: boolean;
  relatedEventCount: number;
}

export const portfolioTickers: PortfolioTicker[] = [
  { ticker: "APAM", name: "Artisan Partners Asset Mgmt", portfolioName: "배당주", memo: "배당락 전날 매도 전략 고려. 분기 배당 수익률 확인 후 결정. 연 수익률 13%대 유지 중.", star: true,  heart: false, alertEnabled: true,  relatedEventCount: 4 },
  { ticker: "CHRD", name: "Chord Energy Corp",           portfolioName: "배당주", memo: "WTI 흐름 주목. 특별배당 가능성 있음. 에너지 섹터 변동성 체크 필요.",                  star: false, heart: true,  alertEnabled: false, relatedEventCount: 2 },
  { ticker: "SGOV", name: "iShares 0-3M Treasury ETF",  portfolioName: "SGOV",  memo: "단기 유동성 관리용. 금리 인하 시점에 리밸런싱 예정. 현금 대체로 활용 중.",            star: true,  heart: true,  alertEnabled: true,  relatedEventCount: 3 },
  { ticker: "TROW", name: "T. Rowe Price Group",         portfolioName: "배당주", memo: "배당금 재투자 고려. 장기 보유 목표. 자산운용사 섹터 장기 안정성 높음.",             star: false, heart: false, alertEnabled: false, relatedEventCount: 3 },
  { ticker: "IVZ",  name: "Invesco Ltd",                 portfolioName: "관심종목", memo: "배당 수익률 5% 수준. 자산운용사 섹터. 추가 매수 타이밍 검토 중.",             star: false, heart: false, alertEnabled: false, relatedEventCount: 2 },
];

// ── 자산 월별 데이터 ─────────────────────────────────────────────
export type TagCategory = "cash" | "bond" | "stock" | "dividend" | "other";

export interface AssetTag {
  name: string;
  amount: number;
  ratio: number;
  category: TagCategory;
}

export interface AssetMonthly {
  month: string;          // "2026-01"
  displayLabel: string;   // "26-01"
  totalAsset: number;     // KRW
  changeFromPrev: number;
  tags: AssetTag[];
  memo?: string;
}

export const assetMonthlyData: AssetMonthly[] = [
  {
    month: "2026-01", displayLabel: "26-01", totalAsset: 14800000, changeFromPrev: 0,
    tags: [
      { name: "현금", amount: 2200000, ratio: 14.9, category: "cash" },
      { name: "달러", amount: 1500000, ratio: 10.1, category: "cash" },
      { name: "SGOV/채권성", amount: 3000000, ratio: 20.3, category: "bond" },
      { name: "나스닥", amount: 2700000, ratio: 18.2, category: "stock" },
      { name: "SPY", amount: 2000000, ratio: 13.5, category: "stock" },
      { name: "배당주", amount: 2900000, ratio: 19.6, category: "dividend" },
      { name: "기타", amount: 500000, ratio: 3.4, category: "other" },
    ],
    memo: "새해 포트폴리오 정리 완료",
  },
  {
    month: "2026-02", displayLabel: "26-02", totalAsset: 15200000, changeFromPrev: 400000,
    tags: [
      { name: "현금", amount: 2100000, ratio: 13.8, category: "cash" },
      { name: "달러", amount: 1600000, ratio: 10.5, category: "cash" },
      { name: "SGOV/채권성", amount: 3100000, ratio: 20.4, category: "bond" },
      { name: "나스닥", amount: 3000000, ratio: 19.7, category: "stock" },
      { name: "SPY", amount: 2100000, ratio: 13.8, category: "stock" },
      { name: "배당주", amount: 2800000, ratio: 18.4, category: "dividend" },
      { name: "기타", amount: 500000, ratio: 3.3, category: "other" },
    ],
    memo: "APAM 배당금 재투자",
  },
  {
    month: "2026-03", displayLabel: "26-03", totalAsset: 15600000, changeFromPrev: 400000,
    tags: [
      { name: "현금", amount: 2000000, ratio: 12.8, category: "cash" },
      { name: "달러", amount: 1700000, ratio: 10.9, category: "cash" },
      { name: "SGOV/채권성", amount: 3200000, ratio: 20.5, category: "bond" },
      { name: "나스닥", amount: 3100000, ratio: 19.9, category: "stock" },
      { name: "SPY", amount: 2200000, ratio: 14.1, category: "stock" },
      { name: "배당주", amount: 2900000, ratio: 18.6, category: "dividend" },
      { name: "기타", amount: 500000, ratio: 3.2, category: "other" },
    ],
    memo: "분기 배당 시즌",
  },
  {
    month: "2026-04", displayLabel: "26-04", totalAsset: 15100000, changeFromPrev: -500000,
    tags: [
      { name: "현금", amount: 2500000, ratio: 16.6, category: "cash" },
      { name: "달러", amount: 1500000, ratio: 9.9, category: "cash" },
      { name: "SGOV/채권성", amount: 3100000, ratio: 20.5, category: "bond" },
      { name: "나스닥", amount: 2700000, ratio: 17.9, category: "stock" },
      { name: "SPY", amount: 2000000, ratio: 13.2, category: "stock" },
      { name: "배당주", amount: 2800000, ratio: 18.5, category: "dividend" },
      { name: "기타", amount: 500000, ratio: 3.3, category: "other" },
    ],
    memo: "시장 변동성 확대, 현금 비중 확대",
  },
  {
    month: "2026-05", displayLabel: "26-05", totalAsset: 16000000, changeFromPrev: 900000,
    tags: [
      { name: "현금", amount: 2500000, ratio: 15.6, category: "cash" },
      { name: "달러", amount: 1800000, ratio: 11.3, category: "cash" },
      { name: "SGOV/채권성", amount: 3200000, ratio: 20.0, category: "bond" },
      { name: "나스닥", amount: 3200000, ratio: 20.0, category: "stock" },
      { name: "SPY", amount: 2200000, ratio: 13.8, category: "stock" },
      { name: "배당주", amount: 2600000, ratio: 16.3, category: "dividend" },
      { name: "기타", amount: 500000, ratio: 3.1, category: "other" },
    ],
    memo: "APAM, TROW 배당락 예정",
  },
];

// ── 시뮬레이터 ───────────────────────────────────────────────────
export const simulatorConfig = {
  startYear: 2024,
  simYears: 20,
  returnRate: 7.0,
  inflationRate: 2.5,
  initIsa: 10000000,
  initPension: 5000000,
  initGeneral: 20000000,
  initDividend: 8000000,
  withdrawRate: 4.0,
  withdrawIncrease: 2.5,
  withdrawDelay: 5,
};

export const simulatorResults = {
  kpis: {
    finalNominalBalance: 182000000,
    finalRealBalance: 112000000,
    combinedNominalBalance: 95000000,
    combinedRealBalance: 58000000,
    retirementYear: 2044,
    pensionLimit: 9000000,
  },
  balanceTrend: [
    { year: 2024, nominal: 43000000, real: 43000000 },
    { year: 2026, nominal: 52000000, real: 49500000 },
    { year: 2028, nominal: 63000000, real: 57800000 },
    { year: 2030, nominal: 77000000, real: 67900000 },
    { year: 2032, nominal: 93000000, real: 79200000 },
    { year: 2034, nominal: 112000000, real: 91500000 },
    { year: 2036, nominal: 135000000, real: 106000000 },
    { year: 2038, nominal: 158000000, real: 119000000 },
    { year: 2040, nominal: 175000000, real: 127000000 },
    { year: 2044, nominal: 182000000, real: 112000000 },
  ],
  dividendTrend: [
    { year: 2024, pensionMonthly: 120000, brokerageMonthly: 180000, total: 300000 },
    { year: 2026, pensionMonthly: 145000, brokerageMonthly: 220000, total: 365000 },
    { year: 2028, pensionMonthly: 175000, brokerageMonthly: 265000, total: 440000 },
    { year: 2030, pensionMonthly: 210000, brokerageMonthly: 320000, total: 530000 },
    { year: 2032, pensionMonthly: 255000, brokerageMonthly: 385000, total: 640000 },
    { year: 2034, pensionMonthly: 310000, brokerageMonthly: 460000, total: 770000 },
    { year: 2036, pensionMonthly: 375000, brokerageMonthly: 555000, total: 930000 },
    { year: 2040, pensionMonthly: 540000, brokerageMonthly: 800000, total: 1340000 },
    { year: 2044, pensionMonthly: 740000, brokerageMonthly: 1050000, total: 1790000 },
  ],
  planData: [
    { year: 2024, startBalance: 43000000, contribution: 9000000, dividendIncome: 3600000, endBalance: 55600000 },
    { year: 2025, startBalance: 55600000, contribution: 9000000, dividendIncome: 4380000, endBalance: 68980000 },
    { year: 2026, startBalance: 68980000, contribution: 9000000, dividendIncome: 5190000, endBalance: 83170000 },
    { year: 2027, startBalance: 83170000, contribution: 9000000, dividendIncome: 6180000, endBalance: 98350000 },
    { year: 2028, startBalance: 98350000, contribution: 9000000, dividendIncome: 7260000, endBalance: 114610000 },
    { year: 2030, startBalance: 114610000, contribution: 9000000, dividendIncome: 8520000, endBalance: 132130000 },
    { year: 2034, startBalance: 132130000, contribution: 9000000, dividendIncome: 9240000, endBalance: 150370000 },
    { year: 2040, startBalance: 150370000, contribution: 0, dividendIncome: 16080000, endBalance: 166450000 },
    { year: 2044, startBalance: 166450000, contribution: 0, dividendIncome: 21480000, endBalance: 182000000 },
  ],
  withdrawalTable: [
    { year: 2029, isaWithdrawal: 2400000, pensionWithdrawal: 0, totalWithdrawal: 2400000 },
    { year: 2030, isaWithdrawal: 2460000, pensionWithdrawal: 0, totalWithdrawal: 2460000 },
    { year: 2031, isaWithdrawal: 2520000, pensionWithdrawal: 0, totalWithdrawal: 2520000 },
    { year: 2035, isaWithdrawal: 3000000, pensionWithdrawal: 1500000, totalWithdrawal: 4500000 },
    { year: 2040, isaWithdrawal: 3600000, pensionWithdrawal: 3000000, totalWithdrawal: 6600000 },
    { year: 2044, isaWithdrawal: 4200000, pensionWithdrawal: 4800000, totalWithdrawal: 9000000 },
  ],
  dividendAccountTable: [
    { year: 2024, balance: 8000000, dividendMonthly: 180000 },
    { year: 2026, balance: 10200000, dividendMonthly: 230000 },
    { year: 2028, balance: 12800000, dividendMonthly: 288000 },
    { year: 2030, balance: 15600000, dividendMonthly: 351000 },
    { year: 2034, balance: 22100000, dividendMonthly: 497000 },
    { year: 2040, balance: 35500000, dividendMonthly: 799000 },
    { year: 2044, balance: 46800000, dividendMonthly: 1053000 },
  ],
};

// ── 계산기 ───────────────────────────────────────────────────────
export const calculatorData = {
  conversionAnalysis: {
    inputs: {
      sellTicker: "APAM",
      buyTicker: "TROW",
      startDate: "2023-01-01",
      endDate: "2026-05-19",
    },
    kpis: {
      sellTickerStart: "$28.50",
      buyTickerStart: "$110.20",
      currentRatio: "0.360",
      avgRatio: "0.334",
      diffFromAvg: "+7.8%",
    },
    ratioTrend: [
      { date: "23-01", sellPrice: 28.5, buyPrice: 110.2, ratio: 0.259 },
      { date: "23-04", sellPrice: 30.1, buyPrice: 104.5, ratio: 0.288 },
      { date: "23-07", sellPrice: 32.4, buyPrice: 107.8, ratio: 0.300 },
      { date: "23-10", sellPrice: 31.0, buyPrice: 101.2, ratio: 0.306 },
      { date: "24-01", sellPrice: 33.5, buyPrice: 105.0, ratio: 0.319 },
      { date: "24-04", sellPrice: 35.2, buyPrice: 109.3, ratio: 0.322 },
      { date: "24-07", sellPrice: 34.8, buyPrice: 103.1, ratio: 0.338 },
      { date: "24-10", sellPrice: 36.5, buyPrice: 107.4, ratio: 0.340 },
      { date: "25-01", sellPrice: 37.1, buyPrice: 108.5, ratio: 0.342 },
      { date: "25-04", sellPrice: 35.9, buyPrice: 102.8, ratio: 0.349 },
      { date: "25-10", sellPrice: 37.8, buyPrice: 106.2, ratio: 0.356 },
      { date: "26-01", sellPrice: 36.2, buyPrice: 103.5, ratio: 0.350 },
      { date: "26-05", sellPrice: 36.8, buyPrice: 102.3, ratio: 0.360 },
    ],
    tableRows: [
      { date: "2023-01-02", sellPrice: 28.5, buyPrice: 110.2, ratio: 0.259 },
      { date: "2023-04-03", sellPrice: 30.1, buyPrice: 104.5, ratio: 0.288 },
      { date: "2023-07-01", sellPrice: 32.4, buyPrice: 107.8, ratio: 0.300 },
      { date: "2024-01-02", sellPrice: 33.5, buyPrice: 105.0, ratio: 0.319 },
      { date: "2024-07-01", sellPrice: 34.8, buyPrice: 103.1, ratio: 0.338 },
      { date: "2025-01-02", sellPrice: 37.1, buyPrice: 108.5, ratio: 0.342 },
      { date: "2026-05-19", sellPrice: 36.8, buyPrice: 102.3, ratio: 0.360 },
    ],
  },
  dividendTaxSim: {
    inputs: {
      ticker: "APAM",
      investmentAmount: 5000000,
      buyBasis: "Ex-Div 기준",
      holdingDays: 30,
      taxRate: 15.4,
      last5YearsOnly: true,
    },
    kpis: {
      winRate: "68.2%",
      avgWinReturn: "+2.4%",
      avgLossReturn: "-1.1%",
      profitLossRatio: "2.18",
      expectedReturn: "+0.9%",
      taxSavingPerTrade: "약 19,250원",
    },
    scatterData: [
      { id: "1", x: 12, y: 68, success: true, label: "2021-03" },
      { id: "2", x: 20, y: 30, success: false, label: "2021-06" },
      { id: "3", x: 28, y: 72, success: true, label: "2021-09" },
      { id: "4", x: 37, y: 55, success: true, label: "2021-12" },
      { id: "5", x: 45, y: 20, success: false, label: "2022-03" },
      { id: "6", x: 53, y: 80, success: true, label: "2022-06" },
      { id: "7", x: 62, y: 62, success: true, label: "2022-09" },
      { id: "8", x: 70, y: 40, success: true, label: "2022-12" },
      { id: "9", x: 78, y: 18, success: false, label: "2023-03" },
      { id: "10", x: 87, y: 75, success: true, label: "2023-06" },
      { id: "11", x: 30, y: 50, success: true, label: "2023-09" },
      { id: "12", x: 55, y: 25, success: false, label: "2023-12" },
      { id: "13", x: 65, y: 85, success: true, label: "2024-03" },
      { id: "14", x: 80, y: 45, success: true, label: "2024-06" },
      { id: "15", x: 92, y: 60, success: true, label: "2024-09" },
    ],
    tableRows: [
      { date: "2021-03-15", buyPrice: 29.5, dividendNet: 0.92, breakeven: 30.42, success: true, returnRate: "+1.8%", recoveryDate: "2021-03-22" },
      { date: "2021-06-14", buyPrice: 33.1, dividendNet: 1.00, breakeven: 34.10, success: false, returnRate: "-0.8%", recoveryDate: "-" },
      { date: "2021-09-13", buyPrice: 36.2, dividendNet: 1.05, breakeven: 37.25, success: true, returnRate: "+2.3%", recoveryDate: "2021-09-20" },
      { date: "2022-03-14", buyPrice: 32.8, dividendNet: 0.98, breakeven: 33.78, success: false, returnRate: "-1.4%", recoveryDate: "-" },
      { date: "2022-06-13", buyPrice: 30.5, dividendNet: 1.05, breakeven: 31.55, success: true, returnRate: "+3.1%", recoveryDate: "2022-06-18" },
      { date: "2023-03-13", buyPrice: 33.2, dividendNet: 1.05, breakeven: 34.25, success: false, returnRate: "-0.5%", recoveryDate: "-" },
      { date: "2024-03-11", buyPrice: 35.4, dividendNet: 1.12, breakeven: 36.52, success: true, returnRate: "+2.7%", recoveryDate: "2024-03-17" },
    ],
  },
};

// ── 홈 요약 ──────────────────────────────────────────────────────
export const homeSummary = {
  marketOpen: true,
  todayMessage: "고라니님, 오늘도 차분하게 전략 체크해보세용! APAM 배당락일이 내일이에요 🦌",
  urgentEvent: { ticker: "APAM", event: "배당락일", daysUntil: 1 },
  stats: {
    thisMonthEventCount: 6,
    registeredTickers: 5,
    totalAsset: 16000000,
    finalRealBalance: 112000000,
  },
};

// ── 메모 ─────────────────────────────────────────────────────────
export const notesData = [
  { id: "1", title: "APAM 전략 메모", content: "배당락 전날 매도 전략 고려. 이번 분기 배당 수익률 확인 후 결정.", updatedAt: "2026-05-18" },
  { id: "2", title: "SGOV 활용 메모", content: "단기 유동성 관리용으로 유지. 금리 인하 시점에 리밸런싱 예정.", updatedAt: "2026-05-15" },
  { id: "3", title: "시장 노트", content: "XLF 흐름이 약세 전환 신호. 금융주 비중 점검 필요.", updatedAt: "2026-05-12" },
];

// ── 설정 ─────────────────────────────────────────────────────────
export const settingsData = {
  name: "고라니님",
  email: "dummy@gorani.finance",
  notifEnabled: false,
  syncStatus: "Firebase 연결 예정",
  appVersion: "0.3.0 (프로토타입)",
};

// ── 유틸 ─────────────────────────────────────────────────────────
export function getEventsForDate(date: string): CalendarEvent[] {
  return calendarEvents.filter((e) => e.date === date);
}

export function getEventsForMonth(year: number, month: number): CalendarEvent[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return calendarEvents.filter((e) => e.date.startsWith(prefix));
}

export function formatKRW(amount: number): string {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억원`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만원`;
  return `${amount.toLocaleString()}원`;
}
