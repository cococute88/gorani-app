import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";
import { MiniLineChart } from "@/components/MiniLineChart";
import { ScatterPlot } from "@/components/ScatterPlot";
import { calculatorData } from "@/data/dummyData";

type CalcMode = "conversion" | "dividendTax";

function KpiRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={styles.kpiRow}>
      <Text style={[styles.kpiLabel, { color: colors.textSub }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: color ?? colors.text }]}>{value}</Text>
    </View>
  );
}

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [mode, setMode] = useState<CalcMode>("conversion");

  const conv = calculatorData.conversionAnalysis;
  const divTax = calculatorData.dividendTaxSim;

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
        <Text style={[styles.title, { color: colors.text }]}>고라니 계산기</Text>
        <Text style={[styles.subtitle, { color: colors.textSub }]}>더미 기반 참고용 계산이에요</Text>
      </View>

      {/* 모드 선택 탭 */}
      <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { key: "conversion" as const, label: "매도전환계산기" },
          { key: "dividendTax" as const, label: "양도세치기 배당시뮬" },
        ].map((m) => (
          <TouchableOpacity
            key={m.key}
            onPress={() => setMode(m.key)}
            style={[styles.modeBtn, { backgroundColor: mode === m.key ? colors.primary : "transparent" }]}
          >
            <Text style={[styles.modeBtnText, { color: mode === m.key ? "#FFF" : colors.textSub }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ────────── A. 매도전환계산기 ────────── */}
      {mode === "conversion" && (
        <>
          {/* 입력 요약 카드 */}
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>입력 요약</Text>
            <View style={styles.inputGrid}>
              {[
                { label: "매도 티커", value: conv.inputs.sellTicker },
                { label: "매수 티커", value: conv.inputs.buyTicker },
                { label: "시작일", value: conv.inputs.startDate },
                { label: "종료일", value: conv.inputs.endDate },
              ].map((item, i) => (
                <View key={i} style={styles.inputItem}>
                  <Text style={[styles.inputLabel, { color: colors.textSub }]}>{item.label}</Text>
                  <Text style={[styles.inputValue, { color: colors.text }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* KPI 카드 */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>결과 지표</Text>
            <KpiRow label="매도 티커 시작가" value={conv.kpis.sellTickerStart} />
            <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
            <KpiRow label="매수 티커 시작가" value={conv.kpis.buyTickerStart} />
            <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
            <KpiRow label="현재 전환비" value={conv.kpis.currentRatio} color={colors.primary} />
            <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
            <KpiRow label="평균 전환비" value={conv.kpis.avgRatio} />
            <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
            <KpiRow label="평균 대비 차이" value={conv.kpis.diffFromAvg} color={colors.positive} />
          </View>

          {/* 전환비 그래프 */}
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader title="전환비 추이" subtitle={`${conv.inputs.sellTicker} / ${conv.inputs.buyTicker}`} />
            <MiniLineChart
              data={conv.ratioTrend.map((d) => ({ label: d.date, value: d.ratio }))}
              label1="전환비"
              color1={colors.primary}
              height={120}
              formatValue={(v) => v.toFixed(3)}
            />
            <View style={[styles.avgLine, { borderColor: colors.secondary }]}>
              <Text style={[styles.avgLineText, { color: colors.secondary }]}>
                ── 평균 {conv.kpis.avgRatio}
              </Text>
            </View>
          </View>

          {/* 상세 테이블 */}
          <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>상세 데이터</Text>
            <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
              {["날짜", conv.inputs.sellTicker, conv.inputs.buyTicker, "전환비"].map((h) => (
                <Text key={h} style={[styles.th, { color: colors.textSub }]}>{h}</Text>
              ))}
            </View>
            {conv.tableRows.map((row, i) => (
              <View key={i} style={[styles.tr, { borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "50" }]}>
                <Text style={[styles.td, { color: colors.textSub }]}>{row.date.slice(2)}</Text>
                <Text style={[styles.td, { color: colors.text }]}>${row.sellPrice}</Text>
                <Text style={[styles.td, { color: colors.text }]}>${row.buyPrice}</Text>
                <Text style={[styles.td, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{row.ratio.toFixed(3)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ────────── B. 양도세치기 배당시뮬 ────────── */}
      {mode === "dividendTax" && (
        <>
          {/* 입력 요약 */}
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>입력 요약</Text>
            <View style={styles.inputGrid}>
              {[
                { label: "티커", value: divTax.inputs.ticker },
                { label: "투자자금", value: `${(divTax.inputs.investmentAmount / 10000).toFixed(0)}만원` },
                { label: "매수 기준", value: divTax.inputs.buyBasis },
                { label: "배당소득세율", value: `${divTax.inputs.taxRate}%` },
              ].map((item, i) => (
                <View key={i} style={styles.inputItem}>
                  <Text style={[styles.inputLabel, { color: colors.textSub }]}>{item.label}</Text>
                  <Text style={[styles.inputValue, { color: colors.text }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* KPI 카드 6개 */}
          <View style={[styles.kpiGrid6, { gap: 8 }]}>
            {[
              { label: "승률", value: divTax.kpis.winRate, color: colors.positive },
              { label: "성공 평균수익률", value: divTax.kpis.avgWinReturn, color: colors.positive },
              { label: "실패 평균손실률", value: divTax.kpis.avgLossReturn, color: colors.destructive },
              { label: "손익비", value: divTax.kpis.profitLossRatio, color: colors.primary },
              { label: "기대수익률", value: divTax.kpis.expectedReturn, color: colors.primary },
              { label: "1회 절세예상액", value: divTax.kpis.taxSavingPerTrade },
            ].map((item, i) => (
              <View key={i} style={[styles.kpi6Card, { backgroundColor: colors.card, borderColor: item.color ? item.color + "40" : colors.border }]}>
                <Text style={[styles.kpi6Label, { color: colors.textSub }]}>{item.label}</Text>
                <Text style={[styles.kpi6Value, { color: item.color ?? colors.text }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* 산점도 */}
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader title="수익률 분포" subtitle="성공/실패 산점도" />
            <ScatterPlot
              data={divTax.scatterData}
              xLabel="기간 →"
              yLabel="수익률"
              height={160}
            />
          </View>

          {/* 상세 테이블 */}
          <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>상세 데이터</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                  {["배당락일", "매수가", "세후배당", "손익분기", "성공", "수익률"].map((h) => (
                    <Text key={h} style={[styles.thWide, { color: colors.textSub }]}>{h}</Text>
                  ))}
                </View>
                {divTax.tableRows.map((row, i) => (
                  <View key={i} style={[styles.tr, { borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "40" }]}>
                    <Text style={[styles.tdWide, { color: colors.textSub }]}>{row.date.slice(2)}</Text>
                    <Text style={[styles.tdWide, { color: colors.text }]}>${row.buyPrice}</Text>
                    <Text style={[styles.tdWide, { color: colors.primary }]}>${row.dividendNet}</Text>
                    <Text style={[styles.tdWide, { color: colors.text }]}>${row.breakeven}</Text>
                    <Text style={[styles.tdWide, { color: row.success ? colors.positive : colors.destructive }]}>
                      {row.success ? "✓" : "✗"}
                    </Text>
                    <Text style={[styles.tdWide, { color: row.success ? colors.positive : colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
                      {row.returnRate}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <Text style={[styles.disclaimer, { color: colors.textSub }]}>
              * 정확한 세금 계산은 증권사·세무 기준을 확인해주세용. 더미 참고용이에요.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  pageHeader: { gap: 3 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modeRow: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4, borderWidth: 1 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center" },
  modeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  inputCard: {
    borderRadius: 14, padding: 14, borderWidth: 1, gap: 12,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  inputGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  inputItem: { width: "47%", gap: 3 },
  inputLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  inputValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  kpiCard: {
    borderRadius: 14, padding: 14, borderWidth: 1, gap: 0,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  kpiRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  kpiLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  kpiValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  kpiDivider: { height: 1 },
  chartCard: {
    borderRadius: 14, padding: 14, borderWidth: 1, gap: 12,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  avgLine: { borderWidth: 1, borderRadius: 8, padding: 7, borderStyle: "dashed" },
  avgLineText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  kpiGrid6: { flexDirection: "row", flexWrap: "wrap" },
  kpi6Card: { width: "47%", margin: "1.5%", borderRadius: 12, padding: 12, borderWidth: 1.5, gap: 5 },
  kpi6Label: { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 14 },
  kpi6Value: { fontSize: 17, fontFamily: "Inter_700Bold" },
  tableCard: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  tableHeader: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  th: { flex: 1, fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  thWide: { width: 72, fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  tr: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1 },
  td: { flex: 1, fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  tdWide: { width: 72, fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  disclaimer: { fontSize: 10, fontFamily: "Inter_400Regular", padding: 10, textAlign: "center" },
});
