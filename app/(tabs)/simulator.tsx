import React, { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";
import { MultiLineChart } from "@/components/MultiLineChart";
import { TAB_BAR_SAFE_BOTTOM } from "@/constants/layout";
import { simulatorConfig, formatKRW } from "@/data/dummyData";
import { useAuth } from "@/hooks/useAuth";
import { useSimConfigQuery } from "@/hooks/useRtdbData";
import { normalizeSimConfig } from "@/utils/normalizeSimConfig";
import {
  runSimulation,
  type EngineInput,
  type EnginePlanRow,
  type PlanResultRow,
  type WithdrawalResultRow,
  type DividendAccountResultRow,
} from "@/utils/simulatorEngine";

type SimTab = "balance" | "dividend" | "plan" | "withdrawal" | "divAccount";
type SortDirection = "asc" | "desc" | null;
type TableSort = { column: string | null; direction: SortDirection };

const SIM_TABS: { key: SimTab; label: string }[] = [
  { key: "balance", label: "잔고 추이" },
  { key: "dividend", label: "배당금 추이" },
  { key: "plan", label: "적립 현황" },
  { key: "withdrawal", label: "절세계좌 인출" },
  { key: "divAccount", label: "배당 위탁잔고" },
];

type SimConfig = typeof simulatorConfig;
type ConfigKey = keyof SimConfig;
type InvestmentPlanRow = {
  year: number;
  monthlySaving: string;
  isa: boolean;
  pension: boolean;
  isaTransfer: boolean;
};
const MONEY_CONFIG_KEYS: ConfigKey[] = ["initIsa", "initPension", "initGeneral", "initDividend"];
const TABLE_ROW_HEIGHT = 34;
const TABLE_HEADER_HEIGHT = 34;
const TABLE_MIN_HEIGHT = TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * 10;
const INVEST_PLAN_YEAR_COL_WIDTH = 48;
const INVEST_PLAN_MONTHLY_COL_WIDTH = 78;

function ConfigRow({
  label,
  value,
  editing,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.cfgRow}>
      <Text style={[styles.cfgLabel, { color: colors.textSub }]}>{label}</Text>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={colors.textSub}
          style={[styles.cfgInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
        />
      ) : (
        <Text style={[styles.cfgValue, { color: colors.text }]}>{value}</Text>
      )}
    </View>
  );
}

export default function SimulatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const simConfigQuery = useSimConfigQuery(user?.email);
  const firebaseSimConfig = useMemo(
    () => normalizeSimConfig(simConfigQuery.data),
    [simConfigQuery.data],
  );
  const hasLoginEmail = Boolean(user?.email);
  const isUsingFirebaseSimConfig = hasLoginEmail && simConfigQuery.isSuccess && firebaseSimConfig.hasRemoteData;
  const boundConfig = isUsingFirebaseSimConfig ? firebaseSimConfig.config : simulatorConfig;
  const boundPlanRows = useMemo(
    () => (isUsingFirebaseSimConfig ? firebaseSimConfig.planRows : createInvestmentPlanRows(simulatorConfig)),
    [firebaseSimConfig.planRows, isUsingFirebaseSimConfig],
  );
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [activeTab, setActiveTab] = useState<SimTab>("balance");
  const [cfg, setCfg] = useState<SimConfig>(simulatorConfig);
  const [editing, setEditing] = useState(false);
  const [draftCfg, setDraftCfg] = useState<Record<ConfigKey, string>>(
    Object.fromEntries(
      Object.entries(simulatorConfig).map(([key, value]) => [key, toConfigInputValue(key as ConfigKey, value)]),
    ) as Record<ConfigKey, string>,
  );
  const [tableSorts, setTableSorts] = useState<Partial<Record<SimTab, TableSort>>>({});
  const [investmentPlanRows, setInvestmentPlanRows] = useState<InvestmentPlanRow[]>(() => createInvestmentPlanRows(simulatorConfig));
  const [showBalanceDetail, setShowBalanceDetail] = useState(false);
  const [showDividendDetail, setShowDividendDetail] = useState(false);
  const [balanceDetailSort, setBalanceDetailSort] = useState<TableSort>({ column: null, direction: null });
  const [dividendDetailSort, setDividendDetailSort] = useState<TableSort>({ column: null, direction: null });

  useEffect(() => {
    setCfg(boundConfig);
    setDraftCfg(toConfigDraft(boundConfig));
    setInvestmentPlanRows(boundPlanRows);
    setEditing(false);
  }, [boundConfig, boundPlanRows]);

  const res = useMemo(() => {
    const planRowsForEngine: EnginePlanRow[] = investmentPlanRows.map((row) => ({
      year: row.year,
      monthlySaving: row.monthlySaving,
      isa: row.isa,
      pension: row.pension,
      isaTransfer: row.isaTransfer,
    }));
    const input: EngineInput = {
      startYear: cfg.startYear,
      simYears: cfg.simYears,
      returnRate: cfg.returnRate,
      inflationRate: cfg.inflationRate,
      initIsa: cfg.initIsa,
      initPension: cfg.initPension,
      initGeneral: cfg.initGeneral,
      initDividend: cfg.initDividend,
      withdrawRate: cfg.withdrawRate,
      withdrawIncrease: cfg.withdrawIncrease,
      withdrawDelay: cfg.withdrawDelay,
      planRows: planRowsForEngine,
    };
    return runSimulation(input);
  }, [cfg, investmentPlanRows]);
  const kpis = res.kpis;
  const planRows = useMemo(
    () => sortRows(buildPeriodPlanRows(res.planData, cfg, investmentPlanRows), tableSorts.plan),
    [cfg, investmentPlanRows, res.planData, tableSorts.plan],
  );
  const withdrawalRows = useMemo(
    () => sortRows(buildPeriodWithdrawalRows(res.withdrawalTable, cfg), tableSorts.withdrawal),
    [cfg, res.withdrawalTable, tableSorts.withdrawal],
  );
  const divAccountRows = useMemo(
    () => sortRows(buildPeriodDividendAccountRows(res.dividendAccountTable, cfg), tableSorts.divAccount),
    [cfg, res.dividendAccountTable, tableSorts.divAccount],
  );

  const toggleTableSort = (tab: SimTab, column: string) => {
    setTableSorts((prev) => {
      const current = prev[tab];
      const nextDirection: SortDirection = current?.column !== column
        ? "asc"
        : current.direction === "asc"
        ? "desc"
        : current.direction === "desc"
        ? null
        : "asc";
      return { ...prev, [tab]: { column: nextDirection ? column : null, direction: nextDirection } };
    });
  };

  const KPI_ITEMS = [
    { label: "최종명목", value: formatKRW(kpis.finalNominalBalance), color: colors.positive },
    { label: "최종실질", value: formatKRW(kpis.finalRealBalance), color: colors.primary },
    { label: "합산명목", value: formatKRW(kpis.combinedNominalBalance) },
    { label: "합산실질", value: formatKRW(kpis.combinedRealBalance) },
    { label: "은퇴년도", value: String(kpis.retirementYear), color: colors.secondary },
    { label: "연금한도", value: formatKRW(kpis.pensionLimit) },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: insets.bottom + TAB_BAR_SAFE_BOTTOM },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.title, { color: colors.text }]}>자산 시뮬레이터</Text>
        <Text style={[styles.subtitle, { color: colors.textSub }]}>Streamlit 로직 기준으로 계산된 시뮬 결과에요</Text>
        <Text style={[styles.sourceText, { color: colors.textSub }]}>
          {getSimConfigSourceText({
            hasLoginEmail,
            isLoading: simConfigQuery.isLoading,
            isUsingFirebaseSimConfig,
            isEmpty: hasLoginEmail && simConfigQuery.isSuccess && !firebaseSimConfig.hasRemoteData,
            isError: hasLoginEmail && simConfigQuery.isError,
          })}
        </Text>
      </View>

      <View style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.configTitleRow}>
          <Text style={[styles.configTitle, { color: colors.text }]}>시뮬 설정 (단위: 만원)</Text>
          <TouchableOpacity
            onPress={() => {
              setDraftCfg(Object.fromEntries(Object.entries(cfg).map(([key, value]) => [key, toConfigInputValue(key as ConfigKey, value)])) as Record<ConfigKey, string>);
              setEditing((value) => !value);
            }}
            style={[styles.editBtn, { backgroundColor: colors.primary + "16" }]}
          >
            <Feather name="edit-2" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.cfgGrid}>
          <View style={styles.cfgCol}>
            <ConfigField label="시작연도" field="startYear" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} suffix="년" />
            <ConfigField label="시뮬기간(년)" field="simYears" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} />
            <ConfigField label="수익률(%)" field="returnRate" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} />
            <ConfigField label="물가상승률(%)" field="inflationRate" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} />
            <ConfigField label="인출미루기(년)" field="withdrawDelay" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} prefix="+" />
          </View>
          <View style={[styles.cfgDivider, { backgroundColor: colors.border }]} />
          <View style={styles.cfgCol}>
            <ConfigField label="초기ISA잔고" field="initIsa" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} format="krw" />
            <ConfigField label="초기연금저축" field="initPension" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} format="krw" />
            <ConfigField label="초기일반계좌" field="initGeneral" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} format="krw" />
            <ConfigField label="초기배당계좌" field="initDividend" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} format="krw" />
            <ConfigField label="인출률(%)" field="withdrawRate" cfg={cfg} draftCfg={draftCfg} editing={editing} setDraftCfg={setDraftCfg} />
          </View>
        </View>
        {editing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              onPress={() => {
                setDraftCfg(Object.fromEntries(Object.entries(cfg).map(([key, value]) => [key, toConfigInputValue(key as ConfigKey, value)])) as Record<ConfigKey, string>);
                setEditing(false);
              }}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.textSub }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCfg((prev) => {
                  const next = { ...prev };
                  (Object.keys(draftCfg) as ConfigKey[]).forEach((key) => {
                    const value = Number(draftCfg[key]);
                    next[key] = Number.isFinite(value) ? value : prev[key];
                    if (MONEY_CONFIG_KEYS.includes(key) && Number.isFinite(value)) {
                      next[key] = value * 10000;
                    }
                  });
                  return next;
                });
                setEditing(false);
              }}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.saveText}>저장</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.investPlanCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.investPlanTitle, { color: colors.text }]}>년도별 투자 계획</Text>
        <View style={styles.investPlanTable}>
          <View style={[styles.investPlanHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.investPlanYearCol}>
              <Text style={[styles.investPlanTh, { color: colors.textSub }]}>년도</Text>
            </View>
            <View style={styles.investPlanMonthlyCol}>
              <Text style={[styles.investPlanTh, { color: colors.textSub }]}>월적립(만)</Text>
            </View>
            <View style={styles.investPlanCheckCol}>
              <Text style={[styles.investPlanThCompact, { color: colors.textSub }]}>ISA</Text>
            </View>
            <View style={styles.investPlanCheckCol}>
              <Text style={[styles.investPlanThCompact, { color: colors.textSub }]}>연금</Text>
            </View>
            <View style={styles.investPlanCheckCol}>
              <Text style={[styles.investPlanThCompact, { color: colors.textSub }]}>ISA이전</Text>
            </View>
          </View>
          <ScrollView style={styles.investPlanBodyScroll} nestedScrollEnabled showsVerticalScrollIndicator>
            {investmentPlanRows.map((row, index) => (
              <View
                key={row.year}
                style={[
                  styles.investPlanRow,
                  {
                    borderTopColor: colors.border,
                    backgroundColor: index % 2 === 0 ? "transparent" : colors.muted + "40",
                  },
                ]}
              >
                <View style={styles.investPlanYearCol}>
                  <Text style={[styles.investPlanYear, { color: colors.secondary }]}>{row.year}</Text>
                </View>
                <View style={styles.investPlanMonthlyCol}>
                  <TextInput
                    value={row.monthlySaving}
                    onChangeText={(value) => updatePlanRow(setInvestmentPlanRows, index, { monthlySaving: value.replace(/[^0-9]/g, "") })}
                    keyboardType="numeric"
                    style={[styles.investPlanInput, { color: colors.text, backgroundColor: colors.muted, borderColor: colors.border }]}
                  />
                </View>
                <View style={styles.investPlanCheckCol}>
                  <PlanCheckButton active={row.isa} onPress={() => updatePlanRow(setInvestmentPlanRows, index, { isa: !row.isa })} />
                </View>
                <View style={styles.investPlanCheckCol}>
                  <PlanCheckButton active={row.pension} onPress={() => updatePlanRow(setInvestmentPlanRows, index, { pension: !row.pension })} />
                </View>
                <View style={styles.investPlanCheckCol}>
                  <PlanCheckButton active={row.isaTransfer} onPress={() => updatePlanRow(setInvestmentPlanRows, index, { isaTransfer: !row.isaTransfer })} />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* KPI 카드 6개 */}
      <View style={styles.section}>
        <SectionHeader title="핵심 지표" />
        <View style={styles.kpiGrid}>
          {KPI_ITEMS.map((item, i) => (
            <View key={i} style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: item.color ? item.color + "40" : colors.border }]}>
              <Text style={[styles.kpiLabel, { color: colors.textSub }]}>{item.label}</Text>
              <Text style={[styles.kpiValue, { color: item.color ?? colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 탭 선택 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tabRow}>
          {SIM_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: activeTab === tab.key ? colors.primary : colors.card,
                  borderColor: activeTab === tab.key ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab.key ? "#FFF" : colors.textSub }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 탭 내용 */}
      {activeTab === "balance" && (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>잔고 추이 (절세 / 위탁 / 합산)</Text>
          <MultiLineChart
            labels={res.balanceTrend.map((d) => String(d.year))}
            series={[
              { key: "taxNom", label: "절세전체잔고(명목)", color: "#2F80ED", values: res.balanceTrend.map((d) => d.nominal) },
              { key: "taxReal", label: "절세전체잔고(실질)", color: "#2F80ED", dashed: true, values: res.balanceTrend.map((d) => d.real) },
              { key: "divNom", label: "배당용위탁잔고(명목)", color: "#219653", values: res.balanceTrend.map((d) => d.divNominal) },
              { key: "divReal", label: "배당용위탁잔고(실질)", color: "#219653", dashed: true, values: res.balanceTrend.map((d) => d.divReal) },
              { key: "combNom", label: "합산 명목 잔고(절세+위탁)", color: "#8A5CF6", values: res.balanceTrend.map((d) => d.combinedNominal) },
              { key: "combReal", label: "합산 실질 잔고(절세+위탁)", color: "#8A5CF6", dashed: true, values: res.balanceTrend.map((d) => d.combinedReal) },
            ]}
            height={160}
            formatValue={(v) => formatKRW(v)}
            retireIndex={res.balanceTrend.findIndex((d) => d.year === res.kpis.retirementYear)}
          />
          <TouchableOpacity
            onPress={() => setShowBalanceDetail((v) => !v)}
            style={[styles.detailToggleBtn, { backgroundColor: showBalanceDetail ? colors.primary : colors.muted, borderColor: colors.border }]}
          >
            <Text style={[styles.detailToggleText, { color: showBalanceDetail ? "#FFF" : colors.textSub }]}>
              {showBalanceDetail ? "상세보기 닫기" : "상세보기"}
            </Text>
          </TouchableOpacity>
          {showBalanceDetail && (
            <View style={styles.detailTableWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View style={[styles.wideHeader, { borderBottomColor: colors.border }]}>
                    <WideSortHeader label="연도" column="year" sort={balanceDetailSort} onPress={() => setBalanceDetailSort((prev) => toggleDetailSort(prev, "year"))} width={48} />
                    <WideSortHeader label="절세명목" column="nominal" sort={balanceDetailSort} onPress={() => setBalanceDetailSort((prev) => toggleDetailSort(prev, "nominal"))} />
                    <WideSortHeader label="절세실질" column="real" sort={balanceDetailSort} onPress={() => setBalanceDetailSort((prev) => toggleDetailSort(prev, "real"))} />
                    <WideSortHeader label="위탁명목" column="divNominal" sort={balanceDetailSort} onPress={() => setBalanceDetailSort((prev) => toggleDetailSort(prev, "divNominal"))} />
                    <WideSortHeader label="위탁실질" column="divReal" sort={balanceDetailSort} onPress={() => setBalanceDetailSort((prev) => toggleDetailSort(prev, "divReal"))} />
                    <WideSortHeader label="합산명목" column="combinedNominal" sort={balanceDetailSort} onPress={() => setBalanceDetailSort((prev) => toggleDetailSort(prev, "combinedNominal"))} />
                    <WideSortHeader label="합산실질" column="combinedReal" sort={balanceDetailSort} onPress={() => setBalanceDetailSort((prev) => toggleDetailSort(prev, "combinedReal"))} />
                  </View>
                  <ScrollView style={styles.wideTableScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                    {sortRows(res.balanceTrend, balanceDetailSort).map((row, i) => (
                      <View key={row.year} style={[styles.wideRow, { borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "50" }]}>
                        <Text style={[styles.wideTd, styles.wideTdYear, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>{row.year}</Text>
                        <Text style={[styles.wideTd, { color: "#2F80ED" }]}>{formatKRW(row.nominal)}</Text>
                        <Text style={[styles.wideTd, { color: "#2F80ED" }]}>{formatKRW(row.real)}</Text>
                        <Text style={[styles.wideTd, { color: "#219653" }]}>{formatKRW(row.divNominal)}</Text>
                        <Text style={[styles.wideTd, { color: "#219653" }]}>{formatKRW(row.divReal)}</Text>
                        <Text style={[styles.wideTd, { color: "#8A5CF6", fontFamily: "Inter_600SemiBold" }]}>{formatKRW(row.combinedNominal)}</Text>
                        <Text style={[styles.wideTd, { color: "#8A5CF6", fontFamily: "Inter_600SemiBold" }]}>{formatKRW(row.combinedReal)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {activeTab === "dividend" && (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>배당금 추이 (월 수익)</Text>
          <MultiLineChart
            labels={res.dividendTrend.map((d) => String(d.year))}
            series={[
              { key: "penNom", label: "절세 월인출금(명목)", color: "#2F80ED", values: res.dividendTrend.map((d) => d.pensionMonthly) },
              { key: "penReal", label: "절세 월인출금(실질)", color: "#2F80ED", dashed: true, values: res.dividendTrend.map((d) => d.pensionMonthlyReal) },
              { key: "brkNom", label: "위탁 월배당금(명목)", color: "#219653", values: res.dividendTrend.map((d) => d.brokerageMonthly) },
              { key: "brkReal", label: "위탁 월배당금(실질)", color: "#219653", dashed: true, values: res.dividendTrend.map((d) => d.brokerageMonthlyReal) },
              { key: "totNom", label: "합산 월수익(명목)", color: "#8A5CF6", values: res.dividendTrend.map((d) => d.total) },
              { key: "totReal", label: "합산 월수익(실질)", color: "#8A5CF6", dashed: true, values: res.dividendTrend.map((d) => d.totalReal) },
            ]}
            height={160}
            formatValue={(v) => formatKRW(v)}
            retireIndex={res.dividendTrend.findIndex((d) => d.year === res.kpis.retirementYear)}
          />
          <TouchableOpacity
            onPress={() => setShowDividendDetail((v) => !v)}
            style={[styles.detailToggleBtn, { backgroundColor: showDividendDetail ? colors.primary : colors.muted, borderColor: colors.border }]}
          >
            <Text style={[styles.detailToggleText, { color: showDividendDetail ? "#FFF" : colors.textSub }]}>
              {showDividendDetail ? "상세보기 닫기" : "상세보기"}
            </Text>
          </TouchableOpacity>
          {showDividendDetail && (
            <View style={styles.detailTableWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View style={[styles.wideHeader, { borderBottomColor: colors.border }]}>
                    <WideSortHeader label="연도" column="year" sort={dividendDetailSort} onPress={() => setDividendDetailSort((prev) => toggleDetailSort(prev, "year"))} width={48} />
                    <WideSortHeader label="절세명목" column="pensionMonthly" sort={dividendDetailSort} onPress={() => setDividendDetailSort((prev) => toggleDetailSort(prev, "pensionMonthly"))} />
                    <WideSortHeader label="절세실질" column="pensionMonthlyReal" sort={dividendDetailSort} onPress={() => setDividendDetailSort((prev) => toggleDetailSort(prev, "pensionMonthlyReal"))} />
                    <WideSortHeader label="위탁명목" column="brokerageMonthly" sort={dividendDetailSort} onPress={() => setDividendDetailSort((prev) => toggleDetailSort(prev, "brokerageMonthly"))} />
                    <WideSortHeader label="위탁실질" column="brokerageMonthlyReal" sort={dividendDetailSort} onPress={() => setDividendDetailSort((prev) => toggleDetailSort(prev, "brokerageMonthlyReal"))} />
                    <WideSortHeader label="합산명목" column="total" sort={dividendDetailSort} onPress={() => setDividendDetailSort((prev) => toggleDetailSort(prev, "total"))} />
                    <WideSortHeader label="합산실질" column="totalReal" sort={dividendDetailSort} onPress={() => setDividendDetailSort((prev) => toggleDetailSort(prev, "totalReal"))} />
                  </View>
                  <ScrollView style={styles.wideTableScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                    {sortRows(res.dividendTrend, dividendDetailSort).map((row, i) => (
                      <View key={row.year} style={[styles.wideRow, { borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "50" }]}>
                        <Text style={[styles.wideTd, styles.wideTdYear, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>{row.year}</Text>
                        <Text style={[styles.wideTd, { color: "#2F80ED" }]}>{formatKRW(row.pensionMonthly)}</Text>
                        <Text style={[styles.wideTd, { color: "#2F80ED" }]}>{formatKRW(row.pensionMonthlyReal)}</Text>
                        <Text style={[styles.wideTd, { color: "#219653" }]}>{formatKRW(row.brokerageMonthly)}</Text>
                        <Text style={[styles.wideTd, { color: "#219653" }]}>{formatKRW(row.brokerageMonthlyReal)}</Text>
                        <Text style={[styles.wideTd, { color: "#8A5CF6", fontFamily: "Inter_600SemiBold" }]}>{formatKRW(row.total)}</Text>
                        <Text style={[styles.wideTd, { color: "#8A5CF6", fontFamily: "Inter_600SemiBold" }]}>{formatKRW(row.totalReal)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {activeTab === "plan" && (
        <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <SortHeader label="연도" column="year" sort={tableSorts.plan} onPress={() => toggleTableSort("plan", "year")} />
            <SortHeader label="기초잔고" column="startBalance" sort={tableSorts.plan} onPress={() => toggleTableSort("plan", "startBalance")} />
            <SortHeader label="적립" column="contribution" sort={tableSorts.plan} onPress={() => toggleTableSort("plan", "contribution")} />
            <SortHeader label="배당" column="dividendIncome" sort={tableSorts.plan} onPress={() => toggleTableSort("plan", "dividendIncome")} />
            <SortHeader label="기말잔고" column="endBalance" sort={tableSorts.plan} onPress={() => toggleTableSort("plan", "endBalance")} />
          </View>
          <ScrollView style={styles.tableScroll} nestedScrollEnabled showsVerticalScrollIndicator>
            {planRows.map((row, i) => (
              <View key={`${row.year}-${i}`} style={[styles.tr, { borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "50" }]}>
                <Text style={[styles.td, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>{row.year}</Text>
                <Text style={[styles.td, { color: colors.textSub }]}>{formatKRW(row.startBalance)}</Text>
                <Text style={[styles.td, { color: colors.positive }]}>{formatKRW(row.contribution)}</Text>
                <Text style={[styles.td, { color: colors.primary }]}>{formatKRW(row.dividendIncome)}</Text>
                <Text style={[styles.td, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{formatKRW(row.endBalance)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {activeTab === "withdrawal" && (
        <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <SortHeader label="연도" column="year" sort={tableSorts.withdrawal} onPress={() => toggleTableSort("withdrawal", "year")} />
            <SortHeader label="ISA 인출" column="isaWithdrawal" sort={tableSorts.withdrawal} onPress={() => toggleTableSort("withdrawal", "isaWithdrawal")} />
            <SortHeader label="연금 인출" column="pensionWithdrawal" sort={tableSorts.withdrawal} onPress={() => toggleTableSort("withdrawal", "pensionWithdrawal")} />
            <SortHeader label="합계" column="totalWithdrawal" sort={tableSorts.withdrawal} onPress={() => toggleTableSort("withdrawal", "totalWithdrawal")} />
          </View>
          <ScrollView style={styles.tableScroll} nestedScrollEnabled showsVerticalScrollIndicator>
            {withdrawalRows.map((row, i) => (
              <View key={`${row.year}-${i}`} style={[styles.tr, { borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "50" }]}>
                <Text style={[styles.td, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>{row.year}</Text>
                <Text style={[styles.td, { color: colors.primary }]}>{formatKRW(row.isaWithdrawal)}</Text>
                <Text style={[styles.td, { color: colors.positive }]}>{formatKRW(row.pensionWithdrawal)}</Text>
                <Text style={[styles.td, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{formatKRW(row.totalWithdrawal)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {activeTab === "divAccount" && (
        <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={[styles.wideHeader, { borderBottomColor: colors.border }]}>
                <WideSortHeader label="연도" column="year" sort={tableSorts.divAccount} onPress={() => toggleTableSort("divAccount", "year")} width={48} />
                <WideSortHeader label="ISA" column="isaBalance" sort={tableSorts.divAccount} onPress={() => toggleTableSort("divAccount", "isaBalance")} />
                <WideSortHeader label="연금저축" column="pensionBalance" sort={tableSorts.divAccount} onPress={() => toggleTableSort("divAccount", "pensionBalance")} />
                <WideSortHeader label="일반계좌" column="generalBalance" sort={tableSorts.divAccount} onPress={() => toggleTableSort("divAccount", "generalBalance")} />
                <WideSortHeader label="배당계좌" column="dividendBalance" sort={tableSorts.divAccount} onPress={() => toggleTableSort("divAccount", "dividendBalance")} />
                <WideSortHeader label="합계" column="total" sort={tableSorts.divAccount} onPress={() => toggleTableSort("divAccount", "total")} />
              </View>
              <ScrollView style={styles.wideTableScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                {divAccountRows.map((row, index) => (
                  <View key={`${row.year}-${index}`} style={[styles.wideRow, { borderTopColor: colors.border, backgroundColor: index % 2 === 0 ? "transparent" : colors.muted + "50" }]}>
                    <Text style={[styles.wideTd, styles.wideTdYear, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>{row.year}</Text>
                    <Text style={[styles.wideTd, { color: colors.textSub }]}>{formatKRW(row.isaBalance)}</Text>
                    <Text style={[styles.wideTd, { color: colors.textSub }]}>{formatKRW(row.pensionBalance)}</Text>
                    <Text style={[styles.wideTd, { color: colors.textSub }]}>{formatKRW(row.generalBalance)}</Text>
                    <Text style={[styles.wideTd, { color: colors.primary }]}>{formatKRW(row.dividendBalance)}</Text>
                    <Text style={[styles.wideTd, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{formatKRW(row.total)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

function ConfigField({
  label,
  field,
  cfg,
  draftCfg,
  editing,
  setDraftCfg,
  prefix = "",
  suffix = "",
  format,
}: {
  label: string;
  field: ConfigKey;
  cfg: SimConfig;
  draftCfg: Record<ConfigKey, string>;
  editing: boolean;
  setDraftCfg: React.Dispatch<React.SetStateAction<Record<ConfigKey, string>>>;
  prefix?: string;
  suffix?: string;
  format?: "krw";
}) {
  const display = format === "krw" ? formatKRW(cfg[field]) : `${prefix}${cfg[field]}${suffix}`;
  return (
    <ConfigRow
      label={label}
      value={editing ? draftCfg[field] : display}
      editing={editing}
      onChangeText={(value) => setDraftCfg((prev) => ({ ...prev, [field]: value }))}
      placeholder={format === "krw" ? "예: 1000" : undefined}
    />
  );
}

function PlanCheckButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.planCheckBtn,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      {active ? <Feather name="check" size={13} color="#FFF" /> : null}
    </TouchableOpacity>
  );
}

function createInvestmentPlanRows(config: SimConfig): InvestmentPlanRow[] {
  const years = Array.from({ length: Math.max(10, config.simYears) }, (_, index) => config.startYear + index);
  return years.map((year, index) => ({
    year,
    monthlySaving: index === 0 ? "280" : index < 5 ? "200" : "0",
    isa: false,
    pension: false,
    isaTransfer: false,
  }));
}

function getSimulationYears(config: SimConfig) {
  return Array.from({ length: Math.max(1, config.simYears) }, (_, index) => config.startYear + index);
}

function buildPeriodPlanRows(rows: PlanResultRow[], config: SimConfig, _investmentRows: InvestmentPlanRow[]): PlanResultRow[] {
  const rowsByYear = new Map(rows.map((row) => [row.year, row]));
  return getSimulationYears(config).map((year) => {
    const existing = rowsByYear.get(year);
    if (existing) return existing;
    return {
      year,
      status: "적립",
      startBalance: 0,
      contribution: 0,
      dividendIncome: 0,
      endBalance: 0,
    };
  });
}

function buildPeriodWithdrawalRows(rows: WithdrawalResultRow[], config: SimConfig): WithdrawalResultRow[] {
  const rowsByYear = new Map(rows.map((row) => [row.year, row]));
  return getSimulationYears(config).map((year) => rowsByYear.get(year) ?? {
    year,
    isaWithdrawal: 0,
    pensionWithdrawal: 0,
    totalWithdrawal: 0,
  });
}

function buildPeriodDividendAccountRows(rows: DividendAccountResultRow[], config: SimConfig): DividendAccountResultRow[] {
  const rowsByYear = new Map(rows.map((row) => [row.year, row]));
  return getSimulationYears(config).map((year) => rowsByYear.get(year) ?? {
    year,
    isaBalance: 0,
    pensionBalance: 0,
    generalBalance: 0,
    dividendBalance: 0,
    total: 0,
  });
}

function updatePlanRow(
  setRows: React.Dispatch<React.SetStateAction<InvestmentPlanRow[]>>,
  index: number,
  patch: Partial<InvestmentPlanRow>,
) {
  setRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
}

function toConfigInputValue(key: ConfigKey, value: number) {
  if (MONEY_CONFIG_KEYS.includes(key)) {
    return String(Math.round(value / 10000));
  }
  return String(value);
}

function toConfigDraft(config: SimConfig) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, toConfigInputValue(key as ConfigKey, value)]),
  ) as Record<ConfigKey, string>;
}

function getSimConfigSourceText({
  hasLoginEmail,
  isLoading,
  isUsingFirebaseSimConfig,
  isEmpty,
  isError,
}: {
  hasLoginEmail: boolean;
  isLoading: boolean;
  isUsingFirebaseSimConfig: boolean;
  isEmpty: boolean;
  isError: boolean;
}) {
  if (!hasLoginEmail) return "로컬 더미 설정 사용 중";
  if (isLoading) return "Firebase 시뮬 설정 읽는 중 · 로컬 더미 표시 중";
  if (isUsingFirebaseSimConfig) return "Firebase 시뮬 설정 사용 중 · 변경은 기기 내 표시만 반영";
  if (isEmpty) return "등록된 Firebase 시뮬 설정 없음 · 로컬 더미 사용 중";
  if (isError) return "시뮬 설정 읽기 실패 · 로컬 더미 사용 중";
  return "로컬 더미 설정 사용 중";
}

function toggleDetailSort(prev: TableSort, column: string): TableSort {
  const nextDirection: SortDirection = prev.column !== column
    ? "asc"
    : prev.direction === "asc"
    ? "desc"
    : prev.direction === "desc"
    ? null
    : "asc";
  return { column: nextDirection ? column : null, direction: nextDirection };
}

function sortRows<T>(rows: T[], sort?: TableSort) {
  if (!sort?.column || !sort.direction) return rows;
  const key = sort.column as keyof T;
  return [...rows].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    const result = typeof aValue === "number" && typeof bValue === "number"
      ? aValue - bValue
      : String(aValue).localeCompare(String(bValue));
    return sort.direction === "asc" ? result : -result;
  });
}

function sortMark(sort: TableSort | undefined, column: string) {
  if (sort?.column !== column || !sort.direction) return "";
  return sort.direction === "asc" ? "▲" : "▼";
}

function SortHeader({
  label,
  column,
  sort,
  onPress,
}: {
  label: string;
  column: string;
  sort?: TableSort;
  onPress: () => void;
}) {
  const colors = useColors();
  const active = sort?.column === column && !!sort.direction;
  return (
    <TouchableOpacity onPress={onPress} style={styles.thBtn}>
      <Text style={[styles.th, { color: active ? colors.secondary : colors.textSub }]}>
        {label}{sortMark(sort, column)}
      </Text>
    </TouchableOpacity>
  );
}

function WideSortHeader({
  label,
  column,
  sort,
  onPress,
  width,
}: {
  label: string;
  column: string;
  sort?: TableSort;
  onPress: () => void;
  width?: number;
}) {
  const colors = useColors();
  const active = sort?.column === column && !!sort.direction;
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={[styles.wideTh, width !== undefined ? { width } : null, { color: active ? colors.secondary : colors.textSub }]}>
        {label}{sortMark(sort, column)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  pageHeader: { gap: 3 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sourceText: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 3 },
  configCard: {
    borderRadius: 16, padding: 16, borderWidth: 1,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  configTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  configTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  editBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  cfgGrid: { flexDirection: "row", gap: 0 },
  cfgCol: { flex: 1, gap: 8 },
  cfgDivider: { width: 1, marginHorizontal: 14 },
  cfgRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cfgLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cfgValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cfgInput: { width: 70, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8 },
  cancelText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  saveBtn: { borderRadius: 10, paddingHorizontal: 15, paddingVertical: 8 },
  saveText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  investPlanCard: {
    borderRadius: 14, padding: 14, borderWidth: 1, gap: 10,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  investPlanTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  investPlanTable: { width: "100%" },
  investPlanHeader: { minHeight: 34, flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1 },
  investPlanBodyScroll: { height: 204 },
  investPlanRow: { minHeight: 34, flexDirection: "row", alignItems: "center", paddingVertical: 3, borderTopWidth: 1 },
  investPlanYearCol: { width: INVEST_PLAN_YEAR_COL_WIDTH, alignItems: "center", justifyContent: "center" },
  investPlanMonthlyCol: { width: INVEST_PLAN_MONTHLY_COL_WIDTH, alignItems: "center", justifyContent: "center" },
  investPlanCheckCol: { flex: 1, minWidth: 42, alignItems: "center", justifyContent: "center" },
  investPlanTh: { fontSize: 10, fontFamily: "Inter_700Bold", textAlign: "center" },
  investPlanThCompact: { fontSize: 9, fontFamily: "Inter_700Bold", textAlign: "center" },
  investPlanYear: { fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "center" },
  investPlanInput: { width: 70, height: 30, borderWidth: 1, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 0, fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  planCheckBtn: { width: 42, height: 28, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  section: { gap: 12 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  kpiCard: {
    width: "31.5%", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 9, borderWidth: 1.5, gap: 4,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  kpiLabel: { fontSize: 9, fontFamily: "Inter_500Medium", lineHeight: 12 },
  kpiValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 7, paddingVertical: 2 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chartCard: {
    borderRadius: 14, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24, borderWidth: 1, gap: 12,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  chartTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  detailToggleBtn: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  detailToggleText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  detailTableWrap: { marginTop: 8 },
  dividendLegend: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  tableCard: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  tableHeader: { minHeight: TABLE_HEADER_HEIGHT, flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, alignItems: "center" },
  tableScroll: { height: TABLE_ROW_HEIGHT * 10 },
  wideTableScroll: { height: TABLE_ROW_HEIGHT * 10 },
  thBtn: { flex: 1 },
  th: { flex: 1, fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  tr: { minHeight: TABLE_ROW_HEIGHT, flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, alignItems: "center" },
  td: { flex: 1, fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  wideHeader: { minHeight: TABLE_HEADER_HEIGHT, flexDirection: "row", paddingHorizontal: 4, paddingVertical: 8, borderBottomWidth: 1, alignItems: "center" },
  wideRow: { minHeight: TABLE_ROW_HEIGHT, flexDirection: "row", paddingHorizontal: 4, paddingVertical: 8, borderTopWidth: 1, alignItems: "center" },
  wideTh: { width: 64, fontSize: 9, fontFamily: "Inter_700Bold", textAlign: "center", paddingHorizontal: 2 },
  wideTd: { width: 64, fontSize: 8, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 2 },
  wideTdYear: { width: 48 },
});
