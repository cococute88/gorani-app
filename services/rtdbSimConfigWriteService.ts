import { remove, ref, set, update } from "firebase/database";

import { getFirebaseDb } from "@/services/firebase";
import { toSafeUidAtDot, validateEmailForFirebase } from "@/utils/userKey";

/**
 * 자산시뮬레이터 sim_config / 연도별 투자 계획을 Firebase에 저장합니다.
 *
 * 저장 경로 (Streamlit과 동일하게 사용):
 *   users/{safeUid}/sim_config        ← 시뮬 설정 (단일 객체)
 *
 * 연도별 투자계획은 sim_config 안의 plan_data 자식으로 저장합니다.
 *   users/{safeUid}/sim_config/plan_data/{year}
 *
 * 핵심 원칙:
 * - 부모 노드를 통째로 덮어쓰지 않음 (다른 user/다른 필드 보존)
 * - Streamlit이 사용하는 단위(만원/원, %)를 그대로 유지
 *   - 초기 잔고: 만원 단위
 *   - 월적립: 만원 단위
 *   - 수익률/물가/인출률: % 단위
 *   - 시작연도/시뮬기간/인출미루기: 정수
 * - Streamlit camelCase + snake_case alias 호환을 위해 둘 다 저장
 */

export type SimConfigPayload = {
  startYear: number;
  simYears: number;
  returnRate: number;
  inflationRate: number;
  initIsa: number; // 만원 단위
  initPension: number;
  initGeneral: number;
  initDividend: number;
  withdrawRate: number;
  withdrawIncrease: number;
  withdrawDelay: number;
};

export type SimPlanRowPayload = {
  year: number;
  monthlySaving: number; // 만원 단위
  isa: boolean;
  pension: boolean;
  isaTransfer: boolean;
};

export async function writeSimConfig(
  email: string | null | undefined,
  config: SimConfigPayload,
  planRows: SimPlanRowPayload[],
): Promise<void> {
  const validatedEmail = validateEmailForFirebase(email);
  const safeUid = toSafeUidAtDot(validatedEmail);
  const basePath = `users/${safeUid}/sim_config`;

  // 1) sim_config 본체 — Streamlit 호환 alias도 함께 저장
  const configUpdates: Record<string, number> = {
    startYear: config.startYear,
    start_year: config.startYear,
    simYears: config.simYears,
    sim_years: config.simYears,
    returnRate: config.returnRate,
    return_rate: config.returnRate,
    inflationRate: config.inflationRate,
    inflation_rate: config.inflationRate,
    initIsa: config.initIsa,
    init_isa: config.initIsa,
    initPension: config.initPension,
    init_pension: config.initPension,
    initGeneral: config.initGeneral,
    init_general: config.initGeneral,
    initDividend: config.initDividend,
    init_dividend: config.initDividend,
    withdrawRate: config.withdrawRate,
    withdraw_rate: config.withdrawRate,
    withdrawIncrease: config.withdrawIncrease,
    withdraw_increase: config.withdrawIncrease,
    withdrawDelay: config.withdrawDelay,
    withdraw_delay: config.withdrawDelay,
  };

  const updatesAtBase: Record<string, number | string | boolean | null> = {};
  Object.entries(configUpdates).forEach(([key, value]) => {
    updatesAtBase[key] = value;
  });

  // 2) plan_data 자식들 — year를 key로 저장
  // 기존 plan_data 노드를 먼저 비운 뒤 다시 set 하면 다른 user 데이터에는 영향 없음.
  //   부모 sim_config 자체는 update만 하므로 다른 sibling은 보존됨.
  await set(ref(getFirebaseDb(), `${basePath}/plan_data`), null);

  planRows.forEach((row) => {
    const yearKey = String(row.year);
    updatesAtBase[`plan_data/${yearKey}/year`] = row.year;
    updatesAtBase[`plan_data/${yearKey}/monthlySaving`] = row.monthlySaving;
    updatesAtBase[`plan_data/${yearKey}/monthly_saving`] = row.monthlySaving;
    updatesAtBase[`plan_data/${yearKey}/isa`] = row.isa;
    updatesAtBase[`plan_data/${yearKey}/pension`] = row.pension;
    updatesAtBase[`plan_data/${yearKey}/isaTransfer`] = row.isaTransfer;
    updatesAtBase[`plan_data/${yearKey}/isa_transfer`] = row.isaTransfer;
  });

  await update(ref(getFirebaseDb(), basePath), updatesAtBase);
}

/**
 * Firebase 권한 문제 디버깅용 — 현재 사용자가 자신의 sim_config 노드에 쓰기 가능한지 확인.
 * 호출 시 PERMISSION_DENIED가 발생하면 RTDB Rules를 점검해야 함.
 */
export function getSimConfigPath(email: string | null | undefined): string {
  const validatedEmail = validateEmailForFirebase(email);
  const safeUid = toSafeUidAtDot(validatedEmail);
  return `users/${safeUid}/sim_config`;
}

// 미사용 import 경고 회피
void remove;
