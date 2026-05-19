import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";
import { MiniLineChart } from "@/components/MiniLineChart";
import { MiniBarChart } from "@/components/MiniBarChart";
import { simulatorConfig, simulatorResults, formatKRW } from "@/data/dummyData";

type SimTab = "balance" | "dividend" | "plan" | "withdrawal" | "divAccount";

const SIM_TABS: { key: SimTab; label: string }[] = [
  { key: "balance", label: "잔고 추이" },
  { key: "dividend", label: "배당금 추이" },
  { key: "plan", label: "적립 현황" },
  { key: "withdrawal", label: "절세계좌 인출" },
  { key: "divAccount", label: "배당 위탁잔고" },
];

function ConfigRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.cfgRow}>
      <Text style={[styles.cfgLabel, { color: colors.textSub }]}>{label}</Text>
      <Text style={[styles.cfgValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function SimulatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [activeTab, setActiveTab] = useState<SimTab>("balance");

  const cfg = simulatorConfig;
  const res = simulatorResults;
  const kpis = res.kpis;

  const KPI_ITEMS = [
    { label: "최종 명목 잔고", value: formatKRW(kpis.finalNominalBalance), color: colors.positive },
    { label: "최종 실질 잔고", value: formatKRW(kpis.finalRealBalance), color: colors.primary },
    { label: "합산 명목 잔고", value: formatKRW(kpis.combinedNominalBalance) },
    { label: "합산 실질 잔고", value: formatKRW(kpis.combinedRealBalance) },
    { label: "은퇴년도", value: String(kpis.retirementYear), color: colors.secondary },
    { label: "연금저축 한도", value: formatKRW(kpis.pensionLimit) },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.title, { color: colors.text }]}>자산 시뮬레이터</Text>
        <Text style={[styles.subtitle, { color: colors.textSub }]}>읽기 전용 더미 시뮬 결과에요</Text>
      </View>

      {/* 입력 요약 카드 */}
      <View style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.configTitle, { color: colors.text }]}>시뮬 설정 요약</Text>
        <View style={styles.cfgGrid}>
          <View style={styles.cfgCol}>
            <ConfigRow label="시작연도" value={`${cfg.startYear}년`} />
            <ConfigRow label="시뮬기간" value={`${cfg.simYears}년`} />
            <ConfigRow label="수익률" value={`${cfg.returnRate}%`} />
            <ConfigRow label="물가상승률" value={`${cfg.inflationRate}%`} />
            <ConfigRow label="인출 시작" value={`+${cfg.withdrawDelay}년`} />
          </View>
          <View style={[styles.cfgDivider, { backgroundColor: colors.border }]} />
          <View style={styles.cfgCol}>
            <ConfigRow label="ISA 초기" value={formatKRW(cfg.initIsa)} />
            <ConfigRow label="연금저축" value={formatKRW(cfg.initPension)} />
            <ConfigRow label="일반 계좌" value={formatKRW(cfg.initGeneral)} />
            <ConfigRow label="배당 계좌" value={formatKRW(cfg.initDividend)} />
            <ConfigRow label="인출률" value={`${cfg.withdrawRate}%`} />
          </View>
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
          <Text style={[styles.chartTitle, { color: colors.text }]}>잔고 추이 (명목 vs 실질)</Text>
          <MiniLineChart
            data={res.balanceTrend.map((d) => ({ label: String(d.year), value: d.nominal, value2: d.real }))}
            label1="명목 잔고"
            label2="실질 잔고"
            color1={colors.positive}
            color2={colors.primary}
            height={130}
            formatValue={(v) => formatKRW(v)}
          />
        </View>
      )}

      {activeTab === "dividend" && (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>배당금 추이 (월 수익)</Text>
          <MiniBarChart
            data={res.dividendTrend.map((d) => ({
              label: String(d.year),
              value: d.total,
              color: colors.positive,
            }))}
            height={110}
            formatValue={(v) => `${(v / 10000).toFixed(0)}만`}
          />
          <View style={styles.dividendLegend}>
            {[{ c: colors.primary, l: "연금" }, { c: colors.positive, l: "위탁" }, { c: colors.secondary, l: "합산" }].map((item, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.c }]} />
                <Text style={[styles.legendText, { color: colors.textSub }]}>{item.l}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {activeTab === "plan" && (
        <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>연도별 적립 현황</Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            {["연도", "기초잔고", "적립", "배당", "기말잔고"].map((h) => (
              <Text key={h} style={[styles.th, { color: colors.textSub }]}>{h}</Text>
            ))}
          </View>
          {res.planData.map((row, i) => (
            <View key={i} style={[styles.tr, { borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "50" }]}>
              <Text style={[styles.td, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>{row.year}</Text>
              <Text style={[styles.td, { color: colors.textSub }]}>{formatKRW(row.startBalance)}</Text>
              <Text style={[styles.td, { color: colors.positive }]}>{formatKRW(row.contribution)}</Text>
              <Text style={[styles.td, { color: colors.primary }]}>{formatKRW(row.dividendIncome)}</Text>
              <Text style={[styles.td, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{formatKRW(row.endBalance)}</Text>
            </View>
          ))}
        </View>
      )}

      {activeTab === "withdrawal" && (
        <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>절세계좌 인출 현황</Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            {["연도", "ISA 인출", "연금 인출", "합계"].map((h) => (
              <Text key={h} style={[styles.th, { color: colors.textSub }]}>{h}</Text>
            ))}
          </View>
          {res.withdrawalTable.map((row, i) => (
            <View key={i} style={[styles.tr, { borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "50" }]}>
              <Text style={[styles.td, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>{row.year}</Text>
              <Text style={[styles.td, { color: colors.primary }]}>{formatKRW(row.isaWithdrawal)}</Text>
              <Text style={[styles.td, { color: colors.positive }]}>{formatKRW(row.pensionWithdrawal)}</Text>
              <Text style={[styles.td, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{formatKRW(row.totalWithdrawal)}</Text>
            </View>
          ))}
        </View>
      )}

      {activeTab === "divAccount" && (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>배당용 위탁 잔고 추이</Text>
          <MiniLineChart
            data={res.dividendAccountTable.map((d) => ({ label: String(d.year), value: d.balance, value2: d.dividendMonthly * 12 }))}
            label1="위탁 잔고"
            label2="연간 배당금"
            color1={colors.primary}
            color2={colors.positive}
            height={120}
            formatValue={(v) => formatKRW(v)}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  pageHeader: { gap: 3 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  configCard: {
    borderRadius: 16, padding: 16, borderWidth: 1,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  configTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 12 },
  cfgGrid: { flexDirection: "row", gap: 0 },
  cfgCol: { flex: 1, gap: 8 },
  cfgDivider: { width: 1, marginHorizontal: 14 },
  cfgRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cfgLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cfgValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  section: { gap: 12 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  kpiCard: {
    width: "47%", borderRadius: 14, padding: 14, borderWidth: 1.5, gap: 5,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  kpiLabel: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  kpiValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 7, paddingVertical: 2 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chartCard: {
    borderRadius: 14, padding: 14, borderWidth: 1, gap: 12,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  chartTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dividendLegend: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  tableCard: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  tableHeader: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  th: { flex: 1, fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  tr: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1 },
  td: { flex: 1, fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
});
