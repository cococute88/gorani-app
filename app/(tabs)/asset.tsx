import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";
import { MiniBarChart } from "@/components/MiniBarChart";
import { assetMonthlyData, formatKRW, AssetMonthly } from "@/data/dummyData";

const TAG_COLORS: Record<string, string> = {
  cash: "#C9A96E",
  bond: "#8B6F47",
  stock: "#6AAB82",
  dividend: "#E07B6A",
  other: "#9E8878",
};

export default function AssetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [selectedIdx, setSelectedIdx] = useState(assetMonthlyData.length - 1);
  const data: AssetMonthly = assetMonthlyData[selectedIdx];
  const prevData: AssetMonthly | null = selectedIdx > 0 ? assetMonthlyData[selectedIdx - 1] : null;

  const changeAmt = data.changeFromPrev;
  const isPositive = changeAmt >= 0;

  const trendItems = assetMonthlyData.map((d) => ({
    label: d.displayLabel,
    value: d.totalAsset,
    color: colors.primary,
  }));

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
        <Text style={[styles.title, { color: colors.text }]}>자산 트래커</Text>
        <Text style={[styles.subtitle, { color: colors.textSub }]}>월별 집계 현황이에요 (더미 데이터)</Text>
      </View>

      {/* 월 선택 칩 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.monthChips}>
          {assetMonthlyData.map((d, i) => (
            <TouchableOpacity
              key={d.month}
              onPress={() => setSelectedIdx(i)}
              style={[
                styles.monthChip,
                {
                  backgroundColor: i === selectedIdx ? colors.primary : colors.card,
                  borderColor: i === selectedIdx ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.monthChipText, { color: i === selectedIdx ? "#FFF" : colors.textSub }]}>
                {d.displayLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 총자산 + 전월 대비 */}
      <View style={styles.topCards}>
        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border, flex: 1.5 }]}>
          <Text style={[styles.totalLabel, { color: colors.textSub }]}>{data.month} 총 자산</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>{formatKRW(data.totalAsset)}</Text>
          {data.memo ? (
            <Text style={[styles.totalMemo, { color: colors.textSub }]} numberOfLines={1}>{data.memo}</Text>
          ) : null}
        </View>
        <View style={[styles.changeCard, { backgroundColor: isPositive ? colors.positive + "14" : colors.destructive + "14", borderColor: isPositive ? colors.positive + "40" : colors.destructive + "40", flex: 1 }]}>
          <Text style={[styles.changeLabel, { color: colors.textSub }]}>전월 대비</Text>
          <Text style={[styles.changeValue, { color: isPositive ? colors.positive : colors.destructive }]}>
            {isPositive ? "+" : ""}{formatKRW(changeAmt)}
          </Text>
          <View style={[styles.changeIcon]}>
            <Feather name={isPositive ? "trending-up" : "trending-down"} size={20} color={isPositive ? colors.positive : colors.destructive} />
          </View>
        </View>
      </View>

      {/* 자산군별 비중 */}
      <View style={styles.section}>
        <SectionHeader title="자산군별 비중" subtitle="태그 기준 분류" />
        <View style={[styles.tagCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {data.tags.map((tag, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.tagDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.tagRow}>
                <View style={styles.tagLeft}>
                  <View style={[styles.tagDot, { backgroundColor: TAG_COLORS[tag.category] ?? colors.primary }]} />
                  <Text style={[styles.tagName, { color: colors.text }]}>{tag.name}</Text>
                </View>
                <View style={styles.tagRight}>
                  <Text style={[styles.tagAmount, { color: colors.text }]}>{formatKRW(tag.amount)}</Text>
                  <View style={[styles.ratioBg, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.ratioFill,
                        { width: `${tag.ratio}%` as `${number}%`, backgroundColor: TAG_COLORS[tag.category] ?? colors.primary },
                      ]}
                    />
                  </View>
                  <Text style={[styles.ratioText, { color: colors.textSub }]}>{tag.ratio.toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 기간별 추이 그래프 */}
      <View style={styles.section}>
        <SectionHeader title="기간별 추이" subtitle="총 자산 변화" />
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MiniBarChart
            data={trendItems}
            height={100}
            showValues={false}
            formatValue={(v) => formatKRW(v)}
          />
          {/* 선택 월 강조 표시 */}
          <View style={styles.selectedInfo}>
            <View style={[styles.selectedDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.selectedInfoText, { color: colors.textSub }]}>
              현재 선택: {data.displayLabel} — {formatKRW(data.totalAsset)}
            </Text>
          </View>
        </View>
      </View>

      {/* 원문 붙여넣기 Placeholder */}
      <View style={[styles.pasteCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="file-text" size={16} color={colors.textSub} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.pasteTitle, { color: colors.text }]}>원문 자산 입력</Text>
          <Text style={[styles.pasteSub, { color: colors.textSub }]}>
            자산 텍스트 붙여넣기 / 삭제 기능은 추후 Codex 연결 예정이에요
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.border} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  pageHeader: { gap: 3 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  monthChips: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  monthChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  topCards: { flexDirection: "row", gap: 10 },
  totalCard: {
    borderRadius: 16, padding: 16, borderWidth: 1, gap: 6,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  totalLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  totalValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  totalMemo: { fontSize: 11, fontFamily: "Inter_400Regular" },
  changeCard: {
    borderRadius: 16, padding: 16, borderWidth: 1, gap: 4, justifyContent: "center",
  },
  changeLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  changeValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  changeIcon: { marginTop: 4 },
  section: { gap: 12 },
  tagCard: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  tagDivider: { height: 1, marginHorizontal: 14 },
  tagRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11 },
  tagLeft: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1 },
  tagDot: { width: 10, height: 10, borderRadius: 5 },
  tagName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  tagRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  tagAmount: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 70, textAlign: "right" },
  ratioBg: { width: 60, height: 6, borderRadius: 6, overflow: "hidden" },
  ratioFill: { height: 6, borderRadius: 6 },
  ratioText: { fontSize: 11, fontFamily: "Inter_400Regular", width: 38, textAlign: "right" },
  chartCard: {
    borderRadius: 14, padding: 14, borderWidth: 1, gap: 10,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  selectedInfo: { flexDirection: "row", alignItems: "center", gap: 7 },
  selectedDot: { width: 8, height: 8, borderRadius: 4 },
  selectedInfoText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pasteCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  pasteTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  pasteSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
