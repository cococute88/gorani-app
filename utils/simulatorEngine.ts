// ─────────────────────────────────────────────────────────────────
//  자산 시뮬레이터 계산 엔진 (Streamlit `logic/simulator.py` 이식)
//  - 내부 계산 단위는 만원 (Streamlit과 동일)
//  - 외부 입출력은 모바일 앱 컨벤션을 따름:
//      * 금액 필드 (initIsa, initPension, ...)는 원 (KRW)
//      * 비율 필드 (returnRate, inflationRate, ...)는 % 단위 숫자 (예: 6.0)
//      * planRows.monthlySaving 은 만원 단위 (Streamlit 화면값과 동일)
//  - 결과 금액도 원 (KRW) 단위로 반환하여 기존 formatKRW가 그대로 동작
// ─────────────────────────────────────────────────────────────────

export type EngineStatus = "적립" | "은퇴" | "인출";

export interface EnginePlanRow {
  year: number;
  monthlySaving: string | number; // 만원
  isa: boolean;
  pension: boolean;
  isaTransfer: boolean;
}

export interface EngineInput {
  startYear: number;
  simYears: number;
  returnRate: number; // %
  inflationRate: number; // %
  initIsa: number; // 원
  initPension: number; // 원
  initGeneral: number; // 원
  initDividend: number; // 원
  withdrawRate: number; // %
  withdrawIncrease: number; // %
  withdrawDelay: number; // 년
  planRows: EnginePlanRow[];
}

export interface BalanceTrendRow {
  year: number;
  nominal: number; // 원 (절세전체 명목)
  real: number; // 원 (절세전체 실질)
  divNominal: number; // 원 (배당위탁 명목)
  divReal: number; // 원 (배당위탁 실질)
  combinedNominal: number; // 원 (합산 명목)
  combinedReal: number; // 원 (합산 실질)
}

export interface DividendTrendRow {
  year: number;
  pensionMonthly: number; // 원 (월 절세계좌 인출액 - 명목)
  pensionMonthlyReal: number; // 원 (월 절세계좌 인출액 - 실질)
  brokerageMonthly: number; // 원 (월 위탁 배당금 - 명목)
  brokerageMonthlyReal: number; // 원 (월 위탁 배당금 - 실질)
  total: number; // 원 (합산 명목)
  totalReal: number; // 원 (합산 실질)
}

export interface PlanResultRow {
  year: number;
  status: EngineStatus;
  startBalance: number; // 원 (전년 명목 잔고 합계)
  contribution: number; // 원 (절세계좌 + 일반)
  dividendIncome: number; // 원 (위탁 배당 + 절세 인출)
  endBalance: number; // 원 (당해 명목 잔고 합계)
}

export interface WithdrawalResultRow {
  year: number;
  isaWithdrawal: number; // 원 (그로스)
  pensionWithdrawal: number; // 원 (그로스)
  totalWithdrawal: number; // 원
}

export interface DividendAccountResultRow {
  year: number;
  isaBalance: number; // 원
  pensionBalance: number; // 원
  generalBalance: number; // 원
  dividendBalance: number; // 원
  total: number; // 원
}

export interface EngineKpis {
  finalNominalBalance: number; // 원 (절세 + 일반)
  finalRealBalance: number; // 원
  combinedNominalBalance: number; // 원 (절세 + 배당 위탁)
  combinedRealBalance: number; // 원
  retirementYear: number;
  pensionLimit: number; // 원
}

export interface EngineOutput {
  kpis: EngineKpis;
  balanceTrend: BalanceTrendRow[];
  dividendTrend: DividendTrendRow[];
  planData: PlanResultRow[];
  withdrawalTable: WithdrawalResultRow[];
  dividendAccountTable: DividendAccountResultRow[];
}

const KRW_PER_MAN = 10_000;
const ISA_LIMIT_MAN = 2000;
const PENSION_LIMIT_MAN = 1800;
const PENSION_LIMIT_TRANSFER_MAN = 3800;
const ISA_TOTAL_LIMIT_UNTIL_2050_MAN = 10_000;
const RETIRE_TRIGGER_ANNUAL_MAN = 1000; // Streamlit assign_statuses

// ── 내부 모델 (만원 단위) ─────────────────────────────────────────
type Cfg = {
  startYear: number;
  simYears: number;
  initIsa: number;
  initPension: number;
  initGeneral: number;
  initDividend: number;
  returnRate: number; // decimal
  inflationRate: number; // decimal
  withdrawRate: number; // decimal
  withdrawIncrease: number; // decimal
  withdrawDelay: number;
};

type PlanInternal = {
  year: number;
  monthly: number; // 만원
  pensionCheck: boolean;
  isaCheck: boolean;
  isaTransfer: boolean;
  status: EngineStatus;
};

type YearResult = {
  year: number;
  status: EngineStatus;
  pensionDeposit: number;
  pensionBalance: number; // 원금 누계 기준 (수익 미반영)
  isaDeposit: number;
  isaBalance: number;
  generalDeposit: number;
  generalBalance: number;
  totalBalance: number;
  fromPrevGeneralForPension: number;
  fromPrevGeneralForIsa: number;
  isaTransferred: number;
  totalPensionDeposit: number;
  totalIsaDeposit: number;
  // 수익 반영 후 명목 잔고
  pensionNominal: number;
  isaNominal: number;
  generalNominal: number;
  totalNominal: number;
};

type WithdrawRow = {
  year: number;
  periodLabel: string;
  isDelay: boolean;
  isaGross: number;
  isaNet: number;
  isaBalance: number;
  pensionGross: number;
  pensionNet: number;
  pensionBalance: number;
  totalNet: number;
  monthlyNet: number;
  monthlyNetReal: number;
};

type WithdrawPlan = {
  retireYear: number;
  actualStartYear: number;
  rows: WithdrawRow[];
};

// ─────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────
export function runSimulation(input: EngineInput): EngineOutput {
  const cfg = toInternalCfg(input);
  const plans = buildPlans(cfg, input.planRows);
  assignStatuses(plans);

  const results = simulateDeposits(cfg, plans);
  applyReturns(cfg, results);
  const realData = getRealBalances(cfg, results);
  const retireIdx = findRetireIndex(plans);
  const withdrawPlan = simulateTaxAccountWithdraw(cfg, results, retireIdx);

  // 위탁(배당) 계좌: Streamlit pages_app/1_asset_simulator.py 의 처리 그대로 이식
  const wdR = cfg.withdrawRate;
  const ret = cfg.returnRate;
  const inf = cfg.inflationRate;
  const startY = cfg.startYear;

  let currentDivBal = cfg.initDividend; // 만원
  const taxBalNom: number[] = [];
  const taxBalReal: number[] = [];
  const divBalNom: number[] = [];
  const divBalReal: number[] = [];
  const taxMNet: number[] = [];
  const taxMNetReal: number[] = [];
  const divMNet: number[] = [];
  const divMNetReal: number[] = [];

  const planRowsByYear = new Map<number, WithdrawRow>();
  if (withdrawPlan) {
    withdrawPlan.rows.forEach((row) => planRowsByYear.set(row.year, row));
  }

  for (const r of results) {
    const y = r.year;
    const isWd = r.status === "인출";
    const growth = currentDivBal * ret;
    const afterG = currentDivBal + growth;

    let grossDiv = 0;
    if (isWd) {
      grossDiv = currentDivBal * wdR;
      currentDivBal = Math.max(0, afterG - grossDiv);
    } else {
      currentDivBal = afterG;
    }

    const netDiv = grossDiv * 0.85; // 위탁 배당 세후 (원천 15% 가정)
    const discount = Math.pow(1 + inf, y - startY);
    const safeDiscount = discount > 0 ? discount : 1;

    const dmNet = netDiv / 12;
    const dmReal = (netDiv / safeDiscount) / 12;
    divBalNom.push(currentDivBal);
    divBalReal.push(currentDivBal / safeDiscount);
    divMNet.push(dmNet);

    const pr = planRowsByYear.get(y);
    let tmNet = 0;
    let tNom = 0;
    if (pr) {
      tmNet = pr.isDelay ? 0 : pr.monthlyNet;
      tNom = pr.isaBalance + pr.pensionBalance;
    } else {
      tNom = r.isaNominal + r.pensionNominal;
    }
    taxBalNom.push(tNom);
    taxBalReal.push(tNom / safeDiscount);
    taxMNet.push(tmNet);
    taxMNetReal.push(tmNet / safeDiscount);
    divMNetReal.push(dmReal);
  }

  // ── KPI ────────────────────────────────────────────────────────
  const last = results[results.length - 1];
  const lastReal = realData[realData.length - 1];
  const finalNominalMan = last ? last.totalNominal : 0;
  const finalRealMan = lastReal ? lastReal.totalReal : 0;
  const combinedNominalMan = (taxBalNom[taxBalNom.length - 1] ?? 0) + (divBalNom[divBalNom.length - 1] ?? 0);
  const combinedRealMan = (taxBalReal[taxBalReal.length - 1] ?? 0) + (divBalReal[divBalReal.length - 1] ?? 0);
  const retirementYear = retireIdx >= 0 ? plans[retireIdx].year : 0;
  const pensionLimitMan = cfg.initPension + (last?.totalPensionDeposit ?? 0);

  // ── balanceTrend (그래프) ─────────────────────────────────────
  const balanceTrend: BalanceTrendRow[] = results.map((r, i) => {
    const taxNom = taxBalNom[i] ?? 0;
    const taxReal = taxBalReal[i] ?? 0;
    const dNom = divBalNom[i] ?? 0;
    const dReal = divBalReal[i] ?? 0;
    return {
      year: r.year,
      nominal: toKrw(taxNom),
      real: toKrw(taxReal),
      divNominal: toKrw(dNom),
      divReal: toKrw(dReal),
      combinedNominal: toKrw(taxNom + dNom),
      combinedReal: toKrw(taxReal + dReal),
    };
  });

  // ── dividendTrend (그래프) ────────────────────────────────────
  const dividendTrend: DividendTrendRow[] = results.map((r, i) => {
    const pensionMonthly = taxMNet[i] ?? 0; // 만원
    const pensionMonthlyReal = taxMNetReal[i] ?? 0; // 만원
    const brokerageMonthly = divMNet[i] ?? 0; // 만원
    const brokerageMonthlyReal = divMNetReal[i] ?? 0; // 만원
    return {
      year: r.year,
      pensionMonthly: toKrw(pensionMonthly),
      pensionMonthlyReal: toKrw(pensionMonthlyReal),
      brokerageMonthly: toKrw(brokerageMonthly),
      brokerageMonthlyReal: toKrw(brokerageMonthlyReal),
      total: toKrw(pensionMonthly + brokerageMonthly),
      totalReal: toKrw(pensionMonthlyReal + brokerageMonthlyReal),
    };
  });

  // ── planData (적립 현황 표) ───────────────────────────────────
  const planData: PlanResultRow[] = results.map((r, i) => {
    const prev = i > 0 ? results[i - 1] : null;
    const startBalanceMan = prev ? prev.totalNominal : cfg.initIsa + cfg.initPension + cfg.initGeneral;
    const contributionMan = r.pensionDeposit + r.isaDeposit + r.generalDeposit;
    const taxNetMan = (taxMNet[i] ?? 0) * 12;
    const divNetMan = (divMNet[i] ?? 0) * 12;
    return {
      year: r.year,
      status: r.status,
      startBalance: toKrw(startBalanceMan),
      contribution: toKrw(contributionMan),
      dividendIncome: toKrw(taxNetMan + divNetMan),
      endBalance: toKrw(r.totalNominal),
    };
  });

  // ── withdrawalTable (절세계좌 인출 표) ────────────────────────
  const withdrawalTable: WithdrawalResultRow[] = results.map((r) => {
    const wr = planRowsByYear.get(r.year);
    if (!wr || wr.isDelay) {
      return {
        year: r.year,
        isaWithdrawal: 0,
        pensionWithdrawal: 0,
        totalWithdrawal: 0,
      };
    }
    return {
      year: r.year,
      isaWithdrawal: toKrw(wr.isaGross),
      pensionWithdrawal: toKrw(wr.pensionGross),
      totalWithdrawal: toKrw(wr.isaGross + wr.pensionGross),
    };
  });

  // ── dividendAccountTable (배당 위탁잔고 / 잔고 통합 표) ───────
  const dividendAccountTable: DividendAccountResultRow[] = results.map((r, i) => {
    const isaBalanceMan = r.isaNominal;
    const pensionBalanceMan = r.pensionNominal;
    const generalBalanceMan = r.generalNominal;
    const dividendBalanceMan = divBalNom[i] ?? 0;
    return {
      year: r.year,
      isaBalance: toKrw(isaBalanceMan),
      pensionBalance: toKrw(pensionBalanceMan),
      generalBalance: toKrw(generalBalanceMan),
      dividendBalance: toKrw(dividendBalanceMan),
      total: toKrw(isaBalanceMan + pensionBalanceMan + generalBalanceMan + dividendBalanceMan),
    };
  });

  return {
    kpis: {
      finalNominalBalance: toKrw(finalNominalMan),
      finalRealBalance: toKrw(finalRealMan),
      combinedNominalBalance: toKrw(combinedNominalMan),
      combinedRealBalance: toKrw(combinedRealMan),
      retirementYear,
      pensionLimit: toKrw(pensionLimitMan),
    },
    balanceTrend,
    dividendTrend,
    planData,
    withdrawalTable,
    dividendAccountTable,
  };
}

// ─────────────────────────────────────────────────────────────────
//  내부 헬퍼
// ─────────────────────────────────────────────────────────────────
function toInternalCfg(input: EngineInput): Cfg {
  const startYear = clampInt(input.startYear, 1900, 2200, 2024);
  const simYears = clampInt(input.simYears, 1, 100, 1);
  return {
    startYear,
    simYears,
    initIsa: krwToMan(input.initIsa),
    initPension: krwToMan(input.initPension),
    initGeneral: krwToMan(input.initGeneral),
    initDividend: krwToMan(input.initDividend),
    returnRate: pctToDecimal(input.returnRate),
    inflationRate: pctToDecimal(input.inflationRate),
    withdrawRate: pctToDecimal(input.withdrawRate),
    withdrawIncrease: pctToDecimal(input.withdrawIncrease),
    withdrawDelay: clampInt(input.withdrawDelay, 0, 30, 1),
  };
}

function buildPlans(cfg: Cfg, rows: EnginePlanRow[]): PlanInternal[] {
  const byYear = new Map<number, EnginePlanRow>();
  rows.forEach((row) => {
    if (Number.isFinite(row.year)) byYear.set(row.year, row);
  });
  return Array.from({ length: cfg.simYears }, (_, i) => {
    const year = cfg.startYear + i;
    const row = byYear.get(year);
    return {
      year,
      monthly: parseMonthly(row?.monthlySaving),
      pensionCheck: Boolean(row?.pension),
      isaCheck: Boolean(row?.isa),
      isaTransfer: Boolean(row?.isaTransfer),
      status: "적립" as EngineStatus,
    };
  });
}

function assignStatuses(plans: PlanInternal[]) {
  let retireFound = false;
  for (const p of plans) {
    const annual = p.monthly * 12;
    if (!retireFound && annual < RETIRE_TRIGGER_ANNUAL_MAN) {
      p.status = "은퇴";
      retireFound = true;
    } else if (retireFound) {
      p.status = "인출";
    } else {
      p.status = "적립";
    }
  }
}

function findRetireIndex(plans: PlanInternal[]) {
  for (let i = 0; i < plans.length; i += 1) {
    if (plans[i].status === "은퇴") return i;
  }
  return -1;
}

function simulateDeposits(cfg: Cfg, plans: PlanInternal[]): YearResult[] {
  const results: YearResult[] = [];
  let prevIsa = cfg.initIsa;
  let prevPension = cfg.initPension;
  let prevGeneral = cfg.initGeneral;
  let totalPensionDep = 0;
  let totalIsaDep = 0;

  for (const p of plans) {
    const isRetiredOrAfter = p.status === "은퇴" || p.status === "인출";
    const isAfterRetire = p.status === "인출";

    let annual = p.monthly * 12;
    let pensionDep = 0;
    let isaDep = 0;
    let generalDep = 0;
    let fromPrevGPension = 0;
    let fromPrevGIsa = 0;

    let isaTransferred = 0;
    if (p.isaTransfer && prevIsa > 0) {
      isaTransferred = prevIsa;
      prevPension += prevIsa;
      prevIsa = 0;
    }

    const pensionLimit = p.isaTransfer ? PENSION_LIMIT_TRANSFER_MAN : PENSION_LIMIT_MAN;
    const isaLimit = ISA_LIMIT_MAN;

    if (!isAfterRetire) {
      if (p.pensionCheck && !isRetiredOrAfter) {
        if (annual >= pensionLimit) {
          pensionDep = pensionLimit;
          annual -= pensionLimit;
        } else {
          pensionDep = annual;
          const needed = pensionLimit - annual;
          if (prevGeneral >= needed) {
            fromPrevGPension = needed;
            pensionDep = pensionLimit;
            prevGeneral -= needed;
          } else {
            fromPrevGPension = prevGeneral;
            pensionDep += prevGeneral;
            prevGeneral = 0;
          }
          annual = 0;
        }
      }

      if (p.isaCheck) {
        if (isRetiredOrAfter) {
          if (prevGeneral >= isaLimit) {
            fromPrevGIsa = isaLimit;
            isaDep = isaLimit;
            prevGeneral -= isaLimit;
          } else {
            fromPrevGIsa = prevGeneral;
            isaDep = prevGeneral;
            prevGeneral = 0;
          }
          const remain = Math.min(annual, isaLimit - isaDep);
          isaDep += remain;
          annual -= remain;
        } else {
          if (annual >= isaLimit) {
            isaDep = isaLimit;
            annual -= isaLimit;
          } else {
            isaDep = annual;
            const needed = isaLimit - annual;
            if (prevGeneral >= needed) {
              fromPrevGIsa = needed;
              isaDep = isaLimit;
              prevGeneral -= needed;
            } else {
              fromPrevGIsa = prevGeneral;
              isaDep += prevGeneral;
              prevGeneral = 0;
            }
            annual = 0;
          }
        }
      }
      generalDep = annual;
    } else {
      // 인출 단계: ISA만 일반 → ISA 이동 가능, 그 외 적립 없음
      if (p.isaCheck) {
        if (prevGeneral >= isaLimit) {
          fromPrevGIsa = isaLimit;
          isaDep = isaLimit;
          prevGeneral -= isaLimit;
        } else {
          fromPrevGIsa = prevGeneral;
          isaDep = prevGeneral;
          prevGeneral = 0;
        }
        const remain = Math.min(annual, isaLimit - isaDep);
        isaDep += remain;
        annual -= remain;
      }
      generalDep = annual;
    }

    const pensionBalance = prevPension + pensionDep;
    const isaBalance = prevIsa + isaDep;
    const generalBalance = prevGeneral + generalDep;

    totalPensionDep += pensionDep;
    totalIsaDep += isaDep;

    results.push({
      year: p.year,
      status: p.status,
      pensionDeposit: pensionDep,
      pensionBalance,
      isaDeposit: isaDep,
      isaBalance,
      generalDeposit: generalDep,
      generalBalance,
      totalBalance: pensionBalance + isaBalance + generalBalance,
      fromPrevGeneralForPension: fromPrevGPension,
      fromPrevGeneralForIsa: fromPrevGIsa,
      isaTransferred,
      totalPensionDeposit: totalPensionDep,
      totalIsaDeposit: totalIsaDep,
      pensionNominal: 0,
      isaNominal: 0,
      generalNominal: 0,
      totalNominal: 0,
    });

    prevPension = pensionBalance;
    prevIsa = isaBalance;
    prevGeneral = generalBalance;
  }

  return results;
}

function applyReturns(cfg: Cfg, results: YearResult[]) {
  let pensionN = 0;
  let isaN = 0;
  let generalN = 0;

  for (let i = 0; i < results.length; i += 1) {
    const r = results[i];
    if (i === 0) {
      pensionN = cfg.initPension * (1 + cfg.returnRate) + r.pensionDeposit;
      isaN = cfg.initIsa * (1 + cfg.returnRate) + r.isaDeposit;
      generalN = cfg.initGeneral * (1 + cfg.returnRate) + r.generalDeposit;
      if (r.isaTransferred > 0) {
        pensionN += r.isaTransferred * (1 + cfg.returnRate);
        isaN = r.isaDeposit;
      }
    } else {
      pensionN = pensionN * (1 + cfg.returnRate) + r.pensionDeposit;
      isaN = isaN * (1 + cfg.returnRate) + r.isaDeposit;
      generalN = generalN * (1 + cfg.returnRate) + r.generalDeposit;
      if (r.isaTransferred > 0) {
        pensionN += r.isaTransferred * (1 + cfg.returnRate);
        isaN = r.isaDeposit;
      }
    }
    r.pensionNominal = pensionN;
    r.isaNominal = isaN;
    r.generalNominal = generalN;
    r.totalNominal = pensionN + isaN + generalN;
  }
}

function getRealBalances(cfg: Cfg, results: YearResult[]) {
  let cum = 1;
  return results.map((r) => {
    cum *= 1 + cfg.inflationRate;
    return {
      year: r.year,
      pensionReal: cum > 0 ? r.pensionNominal / cum : 0,
      isaReal: cum > 0 ? r.isaNominal / cum : 0,
      generalReal: cum > 0 ? r.generalNominal / cum : 0,
      totalReal: cum > 0 ? r.totalNominal / cum : 0,
      cumInflation: cum,
    };
  });
}

// ── 인출 시뮬: 이분탐색 ───────────────────────────────────────────
function calcFirstByLimit(totalLimit: number, years: number, effRate: number) {
  if (years <= 0) return 0;
  if (effRate === 0) return totalLimit / years;
  const factor = (Math.pow(1 + effRate, years) - 1) / effRate;
  return factor === 0 ? 0 : totalLimit / factor;
}

function findOptimal(
  initialBalance: number,
  returnRate: number,
  effRate: number,
  years: number,
  limit: number,
  additionalDeposits: number[] = [],
) {
  if (years <= 0) return 0;
  const high0 = calcFirstByLimit(limit, years, effRate);
  let low = 0;
  let high = high0;
  let optimal = 0;

  for (let iter = 0; iter < 50; iter += 1) {
    const mid = (low + high) / 2;
    let balance = initialBalance;
    let totalW = 0;
    let prevW = 0;
    let valid = true;

    for (let y = 0; y < years; y += 1) {
      balance *= 1 + returnRate;
      if (additionalDeposits[y]) balance += additionalDeposits[y];

      let withdraw = mid * Math.pow(1 + effRate, y);
      if (totalW + withdraw > limit) withdraw = Math.max(0, limit - totalW);
      if (withdraw > balance) {
        valid = false;
        break;
      }
      if (withdraw < prevW - 0.001) {
        valid = false;
        break;
      }
      balance -= withdraw;
      totalW += withdraw;
      prevW = withdraw;
    }

    if (valid) {
      optimal = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return optimal;
}

function simulateTaxAccountWithdraw(cfg: Cfg, results: YearResult[], retireIdx: number): WithdrawPlan | null {
  if (retireIdx < 0) return null;
  const delay = Math.max(1, Math.min(15, cfg.withdrawDelay));
  const actualStartIdx = retireIdx + delay;
  if (actualStartIdx >= results.length) return null;

  const retireYear = results[retireIdx].year;
  const actualStartYear = results[actualStartIdx].year;

  let isaAtStart = results[retireIdx].isaNominal || results[retireIdx].isaBalance;
  let penAtStart = results[retireIdx].pensionNominal || results[retireIdx].pensionBalance;
  for (let d = retireIdx + 1; d <= retireIdx + delay; d += 1) {
    if (d < results.length) {
      isaAtStart *= 1 + cfg.returnRate;
      penAtStart *= 1 + cfg.returnRate;
      isaAtStart += results[d].isaDeposit;
    }
  }

  const pensionDepositLimit = cfg.initPension + results[retireIdx].totalPensionDeposit;
  const isaLimitUntil2050 = ISA_TOTAL_LIMIT_UNTIL_2050_MAN;
  const yearsUntil2050 = Math.max(0, 2050 - actualStartYear + 1);

  const isaEffRate = (1 + cfg.withdrawIncrease) * (1 + cfg.inflationRate) - 1;
  const pensionEffRate = cfg.withdrawIncrease;

  const isaAdditional: number[] = [];
  for (let i = actualStartIdx; i < results.length; i += 1) {
    if (results[i].year > 2050) break;
    isaAdditional.push(results[i].isaDeposit);
  }

  const isaFirst = findOptimal(isaAtStart, cfg.returnRate, isaEffRate, yearsUntil2050, isaLimitUntil2050, isaAdditional);
  const pensionFirst = findOptimal(penAtStart, cfg.returnRate, pensionEffRate, yearsUntil2050, pensionDepositLimit);

  const plan: WithdrawPlan = { retireYear, actualStartYear, rows: [] };

  let pensionBalance = results[retireIdx].pensionNominal || results[retireIdx].pensionBalance;
  let isaBalance = results[retireIdx].isaNominal || results[retireIdx].isaBalance;
  let totalWIsa = 0;
  let totalWPen = 0;
  let isa2051Base = 0;
  let pen2051Base = 0;
  let prevIsaW = 0;
  let prevPenW = 0;

  let cumInflation = 1;
  for (let i = 0; i <= retireIdx; i += 1) cumInflation *= 1 + cfg.inflationRate;

  for (let i = retireIdx + 1; i < results.length; i += 1) {
    const r = results[i];
    const year = r.year;
    cumInflation *= 1 + cfg.inflationRate;

    pensionBalance *= 1 + cfg.returnRate;
    isaBalance *= 1 + cfg.returnRate;
    isaBalance += r.isaDeposit;

    const isDelay = i < actualStartIdx;
    let isaG = 0;
    let penG = 0;
    let isaN = 0;
    let penN = 0;
    let isaTax = 0;
    let penTax = 0;
    let period = "";

    if (isDelay) {
      period = "대기";
    } else if (year <= 2050) {
      period = "~2050";
      const yfs = i - actualStartIdx;

      isaG = isaFirst * Math.pow(1 + isaEffRate, yfs);
      if (totalWIsa + isaG > isaLimitUntil2050) {
        isaG = Math.max(0, isaLimitUntil2050 - totalWIsa);
      }
      if (isaG < prevIsaW && prevIsaW > 0) isaG = prevIsaW;
      isaG = Math.min(isaG, isaBalance * cfg.withdrawRate);
      isaG = Math.min(isaG, isaBalance);

      penG = pensionFirst * Math.pow(1 + pensionEffRate, yfs);
      if (totalWPen + penG > pensionDepositLimit) {
        penG = Math.max(0, pensionDepositLimit - totalWPen);
      }
      if (penG < prevPenW && prevPenW > 0) penG = prevPenW;
      penG = Math.min(penG, pensionBalance * cfg.withdrawRate);
      penG = Math.min(penG, pensionBalance);

      isaN = isaG;
      penN = penG;
    } else {
      period = "2051~";
      isaTax = 0.099;
      penTax = 0.055;
      const yf2051 = year - 2051;

      if (yf2051 === 0) {
        isa2051Base = isaBalance * cfg.withdrawRate;
        pen2051Base = pensionBalance * cfg.withdrawRate;
        isaG = isa2051Base;
        penG = pen2051Base;
      } else {
        isaG = isa2051Base * Math.pow(1 + cfg.withdrawIncrease, yf2051);
        penG = pen2051Base * Math.pow(1 + cfg.withdrawIncrease, yf2051);
      }
      isaG = Math.min(isaG, isaBalance);
      penG = Math.min(penG, pensionBalance);
      isaN = isaG * (1 - isaTax);
      penN = penG * (1 - penTax);
    }

    if (!isDelay) {
      prevIsaW = isaG;
      prevPenW = penG;
    }

    isaBalance = Math.max(0, isaBalance - isaG);
    pensionBalance = Math.max(0, pensionBalance - penG);
    totalWIsa += isaG;
    totalWPen += penG;

    const totalNet = isaN + penN;
    const monthlyNet = totalNet / 12;
    const monthlyNetReal = cumInflation > 0 ? monthlyNet / cumInflation : 0;

    plan.rows.push({
      year,
      periodLabel: period,
      isDelay,
      isaGross: isaG,
      isaNet: isaN,
      isaBalance,
      pensionGross: penG,
      pensionNet: penN,
      pensionBalance,
      totalNet,
      monthlyNet,
      monthlyNetReal,
    });
  }

  return plan;
}

// ─────────────────────────────────────────────────────────────────
//  안전 변환 헬퍼
// ─────────────────────────────────────────────────────────────────
function krwToMan(value: unknown): number {
  const n = toFiniteNumber(value);
  return n / KRW_PER_MAN;
}

function pctToDecimal(value: unknown): number {
  const n = toFiniteNumber(value);
  return n / 100;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function parseMonthly(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toKrw(manwon: number): number {
  if (!Number.isFinite(manwon)) return 0;
  return Math.round(manwon * KRW_PER_MAN);
}
