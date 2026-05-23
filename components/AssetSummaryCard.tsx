import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface AssetSummaryCardProps {
  totalAssets: number;
  cashRatio: number;
  stockRatio: number;
  bondRatio: number;
}

function formatKRW(amount: number): string {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`;
  return amount.toLocaleString();
}

interface RatioBarProps {
  label: string;
  ratio: number;
  color: string;
}

function RatioBar({ label, ratio, color }: RatioBarProps) {
  const colors = useColors();
  return (
    <View style={styles.ratioItem}>
      <View style={styles.ratioHeader}>
        <View style={[styles.ratioDot, { backgroundColor: color }]} />
        <Text style={[styles.ratioLabel, { color: colors.textSub }]}>{label}</Text>
        <Text style={[styles.ratioValue, { color: colors.text }]}>{ratio}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <View style={[styles.fill, { width: `${ratio}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function AssetSummaryCard({ totalAssets, cashRatio, stockRatio, bondRatio }: AssetSummaryCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.totalLabel, { color: colors.textSub }]}>총 자산 (더미)</Text>
      <Text style={[styles.totalValue, { color: colors.text }]}>
        {formatKRW(totalAssets)}원
      </Text>
      <View style={[styles.separator, { backgroundColor: colors.border }]} />
      <RatioBar label="주식" ratio={stockRatio} color={colors.positive} />
      <RatioBar label="현금" ratio={cashRatio} color={colors.primary} />
      <RatioBar label="채권/SGOV" ratio={bondRatio} color={colors.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 10,
    shadowColor: "#3D2B1F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  totalValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  separator: { height: 1 },
  ratioItem: { gap: 6 },
  ratioHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratioDot: { width: 8, height: 8, borderRadius: 4 },
  ratioLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  ratioValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  track: { height: 6, borderRadius: 6, overflow: "hidden" },
  fill: { height: 6, borderRadius: 6 },
});
