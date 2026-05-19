import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Badge } from "./Badge";
import { useColors } from "@/hooks/useColors";

interface StockCardProps {
  name: string;
  ticker: string;
  status: string;
  targetBuy: number;
  targetSell: number;
  currentPrice: number;
  memo: string;
  alertTargetPrice?: boolean;
  alertDividend?: boolean;
  alertMemo?: boolean;
  onPress?: () => void;
}

export function StockCard({
  name,
  ticker,
  status,
  targetBuy,
  targetSell,
  currentPrice,
  memo,
  alertTargetPrice,
  alertDividend,
  alertMemo,
  onPress,
}: StockCardProps) {
  const colors = useColors();
  const isAboveBuy = currentPrice > 0 && currentPrice >= targetBuy;
  const activeAlerts = [alertTargetPrice, alertDividend, alertMemo].filter(Boolean).length;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.tickerBadge, { backgroundColor: colors.primary + "1A" }]}>
            <Text style={[styles.ticker, { color: colors.secondary }]}>{ticker}</Text>
          </View>
          <Badge label={status} />
        </View>
        <View style={styles.headerRight}>
          {activeAlerts > 0 && (
            <View style={[styles.alertPill, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="bell" size={11} color={colors.primary} />
              <Text style={[styles.alertPillText, { color: colors.primary }]}>{activeAlerts}</Text>
            </View>
          )}
          <Feather name="edit-2" size={15} color={colors.textSub} />
        </View>
      </View>

      {/* 종목명 */}
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>

      {/* 가격 행 */}
      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={[styles.priceLabel, { color: colors.textSub }]}>목표 매수가</Text>
          <Text style={[styles.priceValue, { color: colors.positive }]}>
            {targetBuy > 0 ? `$${targetBuy.toFixed(2)}` : "미설정"}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.priceItem}>
          <Text style={[styles.priceLabel, { color: colors.textSub }]}>목표 매도가</Text>
          <Text style={[styles.priceValue, { color: colors.destructive }]}>
            {targetSell > 0 ? `$${targetSell.toFixed(2)}` : "미설정"}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.priceItem}>
          <Text style={[styles.priceLabel, { color: colors.textSub }]}>현재(더미)</Text>
          <Text style={[styles.priceValue, { color: isAboveBuy ? colors.positive : colors.text }]}>
            {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "-"}
          </Text>
        </View>
      </View>

      {/* 알림 상태 행 */}
      {(alertTargetPrice || alertDividend || alertMemo) && (
        <View style={[styles.alertRow, { backgroundColor: colors.muted }]}>
          <Feather name="bell" size={11} color={colors.textSub} />
          <Text style={[styles.alertText, { color: colors.textSub }]}>알림: </Text>
          {alertTargetPrice && <Text style={[styles.alertTag, { color: colors.secondary }]}>목표가 </Text>}
          {alertDividend && <Text style={[styles.alertTag, { color: colors.secondary }]}>배당락 </Text>}
          {alertMemo && <Text style={[styles.alertTag, { color: colors.secondary }]}>메모</Text>}
        </View>
      )}

      {/* 메모 */}
      {memo ? (
        <View style={[styles.memoWrap, { backgroundColor: colors.muted }]}>
          <Feather name="edit-3" size={12} color={colors.textSub} />
          <Text style={[styles.memo, { color: colors.textSub }]} numberOfLines={1}>{memo}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, borderWidth: 1, gap: 10,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  tickerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ticker: { fontSize: 12, fontFamily: "Inter_700Bold" },
  alertPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  alertPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  priceRow: { flexDirection: "row", alignItems: "center" },
  priceItem: { flex: 1, alignItems: "center", gap: 4 },
  priceLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  divider: { width: 1, height: 32, marginHorizontal: 4 },
  alertRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexWrap: "wrap" },
  alertText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  alertTag: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  memoWrap: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  memo: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
});
