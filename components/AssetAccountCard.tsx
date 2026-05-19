import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AssetAccount } from "@/data/dummyData";
import { useColors } from "@/hooks/useColors";

interface AssetAccountCardProps {
  account: AssetAccount;
  ratio: number;
}

const TYPE_ICONS: Record<AssetAccount["type"], keyof typeof Feather.glyphMap> = {
  stock: "trending-up",
  cash: "credit-card",
  bond: "shield",
};

function formatKRW(amount: number): string {
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만원`;
  return `${amount.toLocaleString()}원`;
}

export function AssetAccountCard({ account, ratio }: AssetAccountCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Feather name={TYPE_ICONS[account.type]} size={16} color={colors.primary} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.name, { color: colors.text }]}>{account.name}</Text>
          {account.memo ? (
            <Text style={[styles.memo, { color: colors.textSub }]} numberOfLines={1}>
              {account.memo}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>
          <Text style={[styles.balance, { color: colors.text }]}>{formatKRW(account.balance)}</Text>
          <Text style={[styles.ratio, { color: colors.textSub }]}>{ratio.toFixed(1)}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#3D2B1F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memo: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  right: { alignItems: "flex-end", gap: 2 },
  balance: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ratio: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
