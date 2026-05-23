// ─────────────────────────────────────────────────────────────────
//  고라니 투자비서 — 더미 데이터
//  Codex가 Firebase 호출로 교체할 파일
// ─────────────────────────────────────────────────────────────────

// ── 이벤트 타입 ─────────────────────────────────────────────────
export type EventType = "Ex-Div" | "Buy" | "Pay" | "Earn" | "custom";
export type EventStatus = "declared" | "estimated";

export const EVENT_COLORS: Record<EventType, string> = {
  "Ex-Div": "#E07B6A",
  Buy: "#C9A96E",
  Pay: "#6AAB82",
  Earn: "#8B6F47",
  custom: "#4E8FD6",
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
  tickerMemo?: string;
  customMemo?: string;
  buyDate?: string;
  exDate?: string;
  payDate?: string;
  taxSaving?: number;
  taxSavingOnce?: number;
  taxSavingPer10k?: number;
  star: boolean;
  heart: boolean;
  alertEnabled: boolean;
  status?: EventStatus;
  customSymbol?: string;
  customTitle?: string;
}

export const calendarEvents: CalendarEvent[] = [
  { id: "1",  portfolioName: "배당주", ticker: "APAM",    eventType: "Ex-Div", date: "2026-05-20", shortLabel: "APAM Ex",    dividendAmount: 1.25, currentPrice: 36.8,  annualYield: 13.6, memo: "분기 배당, 전략 미리 확인",   star: true,  heart: false, alertEnabled: true,  status: "declared" },
  { id: "2",  portfolioName: "배당주", ticker: "APAM",    eventType: "Pay",    date: "2026-05-23", shortLabel: "APAM Pay",   dividendAmount: 1.25, currentPrice: 36.8,  annualYield: 13.6, memo: "약 $1.25/주 예상",           star: true,  heart: false, alertEnabled: true,  status: "declared" },
  { id: "3",  portfolioName: "채권성", ticker: "SGOV",    eventType: "Pay",    date: "2026-05-15", shortLabel: "SGOV Pay",   dividendAmount: 0.42, currentPrice: 100.7, annualYield: 5.0,  memo: "월 배당 수령",               star: true,  heart: true,  alertEnabled: true,  status: "declared" },
  { id: "4",  portfolioName: "배당주", ticker: "TROW",    eventType: "Ex-Div", date: "2026-05-28", shortLabel: "TROW Ex",    dividendAmount: 1.24, currentPrice: 102.3, annualYield: 4.8,  memo: "배당금 재투자 고려",          star: false, heart: false, alertEnabled: false, status: "estimated" },
  { id: "5",  portfolioName: "나스닥", ticker: "CHRD",    eventType: "Earn",   date: "2026-05-21", shortLabel: "CHRD Earn",  memo: "WTI 흐름 주목",                                                                            star: false, heart: true,  alertEnabled: false, status: "declared" },
  { id: "6",  portfolioName: "기타",  ticker: "장전체크", eventType: "custom", date: "2026-05-21", shortLabel: "장전 체크",  memo: "WTI, XLF 확인",                                            customTitle: "장전 체크",       star: false, heart: false, alertEnabled: false, status: "declared" },
  { id: "7",  portfolioName: "배당주", ticker: "IVZ",     eventType: "Ex-Div", date: "2026-06-05", shortLabel: "IVZ Ex",     dividendAmount: 0.19, currentPrice: 15.2,  annualYield: 5.0,  memo: "배당 수익률 5% 수준",        star: false, heart: false, alertEnabled: false, status: "estimated" },
  { id: "8",  portfolioName: "기타",  ticker: "메모",     eventType: "custom", date: "2026-05-26", shortLabel: "시장 메모",  memo: "연준 발언 주목",                                            customTitle: "FOMC 체크",       star: false, heart: false, alertEnabled: false, status: "declared" },
  { id: "9",  portfolioName: "배당주", ticker: "CHRD",    eventType: "Ex-Div", date: "2026-06-18", shortLabel: "CHRD Ex",    dividendAmount: 1.25, currentPrice: 118.4, annualYield: 4.2,  memo: "특별배당 가능성",            star: false, heart: true,  alertEnabled: false, status: "estimated" },
  { id: "10", portfolioName: "배당주", ticker: "TROW",    eventType: "Pay",    date: "2026-06-01", shortLabel: "TROW Pay",   dividendAmount: 1.24, currentPrice: 102.3, annualYield: 4.8,                                      star: false, heart: false, alertEnabled: false, status: "estimated" },
  { id: "11", portfolioName: "배당주", ticker: "IVZ",     eventType: "Pay",    date: "2026-06-12", shortLabel: "IVZ Pay",    dividendAmount: 0.19, currentPrice: 15.2,  annualYield: 5.0,                                      star: false, heart: false, alertEnabled: false, status: "estimated" },
  { id: "12", portfolioName: "채권성", ticker: "SGOV",    eventType: "Ex-Div", date: "2026-06-15", shortLabel: "SGOV Ex",    dividendAmount: 0.42, currentPrice: 100.7, annualYield: 5.0,  memo: "6월 배당락",               star: true,  heart: true,  alertEnabled: true,  status: "estimated" },
];

// ── 포트폴리오 티커 ──────────────────────────────────────────────
export interface PortfolioTicker {
  ticker: string;
  name: string;
  portfolioName: string;
  sector: "금융" | "에너지" | "리츠" | "채권" | "기타";
  memo: string;
  star: boolean;
  heart: boolean;
  alertEnabled: boolean;
  relatedEventCount: number;
}

export const portfolioTickers: PortfolioTicker[] = [
  { ticker: "APAM", name: "Artisan Partners Asset Mgmt", portfolioName: "배당주", sector: "금융", memo: "배당락 전날 매도 전략 고려. 분기 배당 수익률 확인 후 결정.", star: true,  heart: false, alertEnabled: true,  relatedEventCount: 4 },
  { ticker: "CHRD", name: "Chord Energy Corp",           portfolioName: "배당주", sector: "에너지", memo: "WTI 흐름 주목. 특별배당 가능성 있음.",                  star: false, heart: true,  alertEnabled: false, relatedEventCount: 2 },
  { ticker: "SGOV", name: "iShares 0-3M Treasury ETF",  portfolioName: "SGOV",  sector: "채권", memo: "단기 유동성 관리용. 현금 대체로 활용 중.",            star: true,  heart: true,  alertEnabled: true,  relatedEventCount: 3 },
  { ticker: "TROW", name: "T. Rowe Price Group",         portfolioName: "배당주", sector: "금융", memo: "배당금 재투자 고려. 장기 보유 목표.",             star: false, heart: false, alertEnabled: false, relatedEventCount: 3 },
  { ticker: "IVZ",  name: "Invesco Ltd",                 portfolioName: "관심종목", sector: "금융", memo: "배당 수익률 5% 수준. 추가 매수 타이밍 검토 중.",             star: false, heart: false, alertEnabled: false, relatedEventCount: 2 },
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



// ── 워치리스트/자산 계정 타입(컴포넌트 호환용) ─────────────────────────
export type StockStatus = "보유중" | "매수 검토중" | "관망";

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  targetBuy?: number;
  targetSell?: number;
  memo?: string;
  status: StockStatus;
  alertTargetPrice: boolean;
  alertDividend: boolean;
  alertMemo: boolean;
}

export type AssetAccountType = "stock" | "cash" | "bond";

export interface AssetAccount {
  id: string;
  name: string;
  type: AssetAccountType;
  balance: number;
  memo?: string;
}

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
    { year: 2024, isaBalance: 10000000, pensionBalance: 5000000, generalBalance: 20000000, dividendBalance: 8000000, total: 43000000 },
    { year: 2026, isaBalance: 12800000, pensionBalance: 7000000, generalBalance: 22000000, dividendBalance: 10200000, total: 52000000 },
    { year: 2028, isaBalance: 16400000, pensionBalance: 9800000, generalBalance: 24000000, dividendBalance: 12800000, total: 63000000 },
    { year: 2030, isaBalance: 21000000, pensionBalance: 13600000, generalBalance: 26800000, dividendBalance: 15600000, total: 77000000 },
    { year: 2034, isaBalance: 32000000, pensionBalance: 22800000, generalBalance: 35100000, dividendBalance: 22100000, total: 112000000 },
    { year: 2040, isaBalance: 46000000, pensionBalance: 34800000, generalBalance: 58700000, dividendBalance: 35500000, total: 175000000 },
    { year: 2044, isaBalance: 41000000, pensionBalance: 38900000, generalBalance: 55300000, dividendBalance: 46800000, total: 182000000 },
  ],
};

export const customLinksData = [
  { id: "1", title: "배당 캘린더", url: "https://www.nasdaq.com/market-activity/dividends" },
  { id: "2", title: "환율 체크", url: "https://finance.yahoo.com/quote/KRW=X" },
  { id: "3", title: "브로커 로그인", url: "https://example.com" },
];

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

// ── 양도세치기 배당시뮬: 백테스트용 원시 이벤트 ────────────────
//   Streamlit `pages_app/3_dividend_sim.py` 와 동등한 계산을 위해
//   ticker별 ex-div 이벤트 + 원시 가격/배당 정보를 보관한다.
//   buyPrice는 D-1 종가, dividendGross는 세전 1주 배당,
//   windowMaxHigh는 매도허용기간 내 일봉 고가 최댓값(기본 sellWindow=0 → ex-div 당일 고가),
//   windowExitClose는 sellWindow 마지막일 종가, recoveryDate는 손익분기점 회복 날짜이다.
//   (실제 yfinance 응답을 모사한 정적 픽스처)
export interface DividendCaptureEvent {
  exDate: string;          // YYYY-MM-DD
  buyPrice: number;        // D-1 종가 ($)
  dividendGross: number;   // 세전 1주 배당 ($)
  windowMaxHigh: number;   // 매도 허용기간 내 일봉 고가 최댓값
  windowExitClose: number; // 매도 허용기간 마지막일 종가
  recoveryDate?: string;   // 손익분기점 첫 회복일 (없으면 "" 또는 미설정)
  recoveryTradingDays?: number;
  recoveryCalendarDays?: number;
}

export const dividendCaptureFixtures: Record<string, DividendCaptureEvent[]> = {
  APAM: [
    { exDate: "2019-02-13", buyPrice: 23.10, dividendGross: 0.69, windowMaxHigh: 23.40, windowExitClose: 22.80, recoveryDate: "2019-02-25", recoveryTradingDays: 8, recoveryCalendarDays: 12 },
    { exDate: "2019-05-14", buyPrice: 26.50, dividendGross: 0.69, windowMaxHigh: 27.10, windowExitClose: 26.40 },
    { exDate: "2019-08-13", buyPrice: 28.80, dividendGross: 0.66, windowMaxHigh: 28.95, windowExitClose: 28.30, recoveryDate: "2019-08-22", recoveryTradingDays: 7, recoveryCalendarDays: 9 },
    { exDate: "2019-11-12", buyPrice: 31.20, dividendGross: 0.69, windowMaxHigh: 31.60, windowExitClose: 30.85 },
    { exDate: "2020-02-12", buyPrice: 33.80, dividendGross: 0.71, windowMaxHigh: 33.40, windowExitClose: 32.10, recoveryDate: "2020-06-08", recoveryTradingDays: 80, recoveryCalendarDays: 117 },
    { exDate: "2020-05-12", buyPrice: 22.90, dividendGross: 0.62, windowMaxHigh: 23.40, windowExitClose: 22.10 },
    { exDate: "2020-08-12", buyPrice: 33.50, dividendGross: 0.61, windowMaxHigh: 33.95, windowExitClose: 32.95 },
    { exDate: "2020-11-12", buyPrice: 44.10, dividendGross: 0.74, windowMaxHigh: 44.85, windowExitClose: 43.40 },
    { exDate: "2021-02-12", buyPrice: 49.20, dividendGross: 0.96, windowMaxHigh: 49.40, windowExitClose: 47.95, recoveryDate: "2021-02-23", recoveryTradingDays: 7, recoveryCalendarDays: 11 },
    { exDate: "2021-03-15", buyPrice: 50.80, dividendGross: 1.40, windowMaxHigh: 51.55, windowExitClose: 49.65 },
    { exDate: "2021-05-13", buyPrice: 53.90, dividendGross: 0.92, windowMaxHigh: 54.45, windowExitClose: 53.20 },
    { exDate: "2021-06-14", buyPrice: 53.10, dividendGross: 1.13, windowMaxHigh: 53.05, windowExitClose: 52.10, recoveryDate: "2021-09-08", recoveryTradingDays: 60, recoveryCalendarDays: 86 },
    { exDate: "2021-08-12", buyPrice: 49.80, dividendGross: 1.02, windowMaxHigh: 50.20, windowExitClose: 49.15 },
    { exDate: "2021-09-13", buyPrice: 47.20, dividendGross: 1.40, windowMaxHigh: 47.95, windowExitClose: 46.70 },
    { exDate: "2021-11-12", buyPrice: 49.60, dividendGross: 0.91, windowMaxHigh: 50.10, windowExitClose: 48.95, recoveryDate: "2021-11-22", recoveryTradingDays: 6, recoveryCalendarDays: 10 },
    { exDate: "2022-02-11", buyPrice: 47.85, dividendGross: 0.97, windowMaxHigh: 47.40, windowExitClose: 45.20, recoveryDate: "2023-04-04", recoveryTradingDays: 285, recoveryCalendarDays: 417 },
    { exDate: "2022-03-14", buyPrice: 41.20, dividendGross: 1.45, windowMaxHigh: 41.55, windowExitClose: 40.10 },
    { exDate: "2022-05-13", buyPrice: 36.40, dividendGross: 0.79, windowMaxHigh: 36.05, windowExitClose: 33.85 },
    { exDate: "2022-06-13", buyPrice: 31.50, dividendGross: 0.97, windowMaxHigh: 32.55, windowExitClose: 31.05 },
    { exDate: "2022-08-12", buyPrice: 32.80, dividendGross: 0.66, windowMaxHigh: 33.10, windowExitClose: 32.05 },
    { exDate: "2022-09-13", buyPrice: 28.30, dividendGross: 1.13, windowMaxHigh: 28.05, windowExitClose: 26.40, recoveryDate: "2023-01-31", recoveryTradingDays: 96, recoveryCalendarDays: 140 },
    { exDate: "2022-11-14", buyPrice: 32.40, dividendGross: 0.66, windowMaxHigh: 32.85, windowExitClose: 31.95 },
    { exDate: "2023-02-13", buyPrice: 36.10, dividendGross: 0.71, windowMaxHigh: 36.40, windowExitClose: 35.30 },
    { exDate: "2023-03-13", buyPrice: 35.20, dividendGross: 1.24, windowMaxHigh: 34.95, windowExitClose: 32.50, recoveryDate: "2023-06-15", recoveryTradingDays: 65, recoveryCalendarDays: 94 },
    { exDate: "2023-05-12", buyPrice: 34.80, dividendGross: 0.62, windowMaxHigh: 35.20, windowExitClose: 34.15 },
    { exDate: "2023-08-11", buyPrice: 39.40, dividendGross: 0.61, windowMaxHigh: 39.85, windowExitClose: 38.95 },
    { exDate: "2023-09-12", buyPrice: 39.95, dividendGross: 1.31, windowMaxHigh: 40.30, windowExitClose: 39.10 },
    { exDate: "2023-11-13", buyPrice: 38.20, dividendGross: 0.66, windowMaxHigh: 38.65, windowExitClose: 37.80, recoveryDate: "2023-11-21", recoveryTradingDays: 6, recoveryCalendarDays: 8 },
    { exDate: "2024-02-12", buyPrice: 41.10, dividendGross: 0.71, windowMaxHigh: 41.55, windowExitClose: 40.50 },
    { exDate: "2024-03-11", buyPrice: 41.85, dividendGross: 1.40, windowMaxHigh: 42.30, windowExitClose: 41.10 },
    { exDate: "2024-05-13", buyPrice: 39.60, dividendGross: 0.71, windowMaxHigh: 40.05, windowExitClose: 39.10 },
    { exDate: "2024-08-12", buyPrice: 41.20, dividendGross: 0.71, windowMaxHigh: 41.55, windowExitClose: 40.30 },
    { exDate: "2024-09-13", buyPrice: 41.80, dividendGross: 1.31, windowMaxHigh: 41.65, windowExitClose: 40.10, recoveryDate: "2024-11-19", recoveryTradingDays: 46, recoveryCalendarDays: 67 },
    { exDate: "2024-11-12", buyPrice: 40.30, dividendGross: 0.71, windowMaxHigh: 40.95, windowExitClose: 39.85 },
    { exDate: "2025-02-12", buyPrice: 37.90, dividendGross: 0.71, windowMaxHigh: 38.20, windowExitClose: 36.85 },
    { exDate: "2025-03-13", buyPrice: 36.20, dividendGross: 1.31, windowMaxHigh: 36.05, windowExitClose: 34.10, recoveryDate: "2025-08-22", recoveryTradingDays: 110, recoveryCalendarDays: 162 },
    { exDate: "2025-05-13", buyPrice: 33.80, dividendGross: 0.68, windowMaxHigh: 34.40, windowExitClose: 33.10 },
    { exDate: "2025-08-13", buyPrice: 36.40, dividendGross: 0.68, windowMaxHigh: 36.95, windowExitClose: 35.85, recoveryDate: "2025-08-21", recoveryTradingDays: 5, recoveryCalendarDays: 8 },
    { exDate: "2025-09-12", buyPrice: 35.90, dividendGross: 1.25, windowMaxHigh: 36.10, windowExitClose: 34.65 },
    { exDate: "2025-11-12", buyPrice: 36.50, dividendGross: 0.68, windowMaxHigh: 37.05, windowExitClose: 36.20 },
    { exDate: "2026-02-12", buyPrice: 36.10, dividendGross: 0.68, windowMaxHigh: 36.55, windowExitClose: 35.65 },
    { exDate: "2026-03-12", buyPrice: 35.40, dividendGross: 1.25, windowMaxHigh: 35.95, windowExitClose: 35.10 },
    { exDate: "2026-05-13", buyPrice: 36.80, dividendGross: 0.68, windowMaxHigh: 37.20, windowExitClose: 36.40 },
  ],
  ARCC: [
    { exDate: "2019-03-13", buyPrice: 17.50, dividendGross: 0.40, windowMaxHigh: 17.65, windowExitClose: 17.25, recoveryDate: "2019-03-21", recoveryTradingDays: 6, recoveryCalendarDays: 8 },
    { exDate: "2019-06-12", buyPrice: 18.10, dividendGross: 0.40, windowMaxHigh: 18.30, windowExitClose: 17.95 },
    { exDate: "2019-09-13", buyPrice: 19.20, dividendGross: 0.40, windowMaxHigh: 19.45, windowExitClose: 18.95, recoveryDate: "2019-09-23", recoveryTradingDays: 7, recoveryCalendarDays: 10 },
    { exDate: "2019-12-12", buyPrice: 18.80, dividendGross: 0.40, windowMaxHigh: 19.05, windowExitClose: 18.50 },
    { exDate: "2020-03-12", buyPrice: 16.20, dividendGross: 0.40, windowMaxHigh: 15.80, windowExitClose: 14.10, recoveryDate: "2020-06-30", recoveryTradingDays: 76, recoveryCalendarDays: 110 },
    { exDate: "2020-06-12", buyPrice: 12.40, dividendGross: 0.40, windowMaxHigh: 12.65, windowExitClose: 12.30 },
    { exDate: "2020-09-15", buyPrice: 14.80, dividendGross: 0.40, windowMaxHigh: 15.05, windowExitClose: 14.60 },
    { exDate: "2020-12-15", buyPrice: 17.40, dividendGross: 0.40, windowMaxHigh: 17.65, windowExitClose: 17.30 },
    { exDate: "2021-03-15", buyPrice: 18.90, dividendGross: 0.40, windowMaxHigh: 19.20, windowExitClose: 18.85 },
    { exDate: "2021-06-15", buyPrice: 19.50, dividendGross: 0.41, windowMaxHigh: 19.85, windowExitClose: 19.40 },
    { exDate: "2021-09-15", buyPrice: 20.40, dividendGross: 0.41, windowMaxHigh: 20.85, windowExitClose: 20.40 },
    { exDate: "2021-12-15", buyPrice: 20.90, dividendGross: 0.43, windowMaxHigh: 21.20, windowExitClose: 20.85 },
    { exDate: "2022-03-15", buyPrice: 19.80, dividendGross: 0.42, windowMaxHigh: 20.05, windowExitClose: 19.55 },
    { exDate: "2022-06-15", buyPrice: 19.10, dividendGross: 0.42, windowMaxHigh: 18.95, windowExitClose: 18.40, recoveryDate: "2022-09-12", recoveryTradingDays: 64, recoveryCalendarDays: 89 },
    { exDate: "2022-09-15", buyPrice: 19.20, dividendGross: 0.42, windowMaxHigh: 19.45, windowExitClose: 19.05 },
    { exDate: "2022-12-15", buyPrice: 19.60, dividendGross: 0.45, windowMaxHigh: 19.95, windowExitClose: 19.55 },
    { exDate: "2023-03-15", buyPrice: 18.40, dividendGross: 0.48, windowMaxHigh: 18.65, windowExitClose: 18.20 },
    { exDate: "2023-06-15", buyPrice: 19.30, dividendGross: 0.48, windowMaxHigh: 19.65, windowExitClose: 19.25 },
    { exDate: "2023-09-15", buyPrice: 19.80, dividendGross: 0.48, windowMaxHigh: 20.10, windowExitClose: 19.65 },
    { exDate: "2023-12-15", buyPrice: 20.40, dividendGross: 0.48, windowMaxHigh: 20.85, windowExitClose: 20.45 },
    { exDate: "2024-03-15", buyPrice: 21.10, dividendGross: 0.48, windowMaxHigh: 21.45, windowExitClose: 21.05 },
    { exDate: "2024-06-14", buyPrice: 20.80, dividendGross: 0.48, windowMaxHigh: 21.10, windowExitClose: 20.65 },
    { exDate: "2024-09-13", buyPrice: 21.50, dividendGross: 0.48, windowMaxHigh: 21.85, windowExitClose: 21.40 },
    { exDate: "2024-12-13", buyPrice: 21.80, dividendGross: 0.48, windowMaxHigh: 22.10, windowExitClose: 21.65 },
    { exDate: "2025-03-14", buyPrice: 21.20, dividendGross: 0.48, windowMaxHigh: 21.45, windowExitClose: 21.05 },
    { exDate: "2025-06-13", buyPrice: 21.60, dividendGross: 0.48, windowMaxHigh: 21.85, windowExitClose: 21.50 },
    { exDate: "2025-09-12", buyPrice: 22.10, dividendGross: 0.48, windowMaxHigh: 22.45, windowExitClose: 22.05 },
    { exDate: "2025-12-12", buyPrice: 22.40, dividendGross: 0.48, windowMaxHigh: 22.75, windowExitClose: 22.30 },
    { exDate: "2026-03-13", buyPrice: 22.10, dividendGross: 0.48, windowMaxHigh: 22.40, windowExitClose: 21.95 },
  ],
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
