import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface DividendItemProps {
  name: string;
  ticker: string;
  exDividendDate: string;
  daysUntil: number;
  memo: string;
}

export function DividendItem({
  name,
  ticker,
  exDividendDate,
  daysUntil,
  memo,
}: DividendItemProps) {
  const colors = useColors();
  const isUrgent = daysUntil <= 3;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: colors.card,
          borderColor: isUrgent ? colors.primary : colors.border,
          borderWidth: isUrgent ? 2 : 1,
        },
      ]}
    >
      <View style={styles.left}>
        <View style={styles.tickerRow}>
          <View
            style={[styles.tickerBadge, { backgroundColor: colors.primary + "1A" }]}
          >
            <Text style={[styles.ticker, { color: colors.secondary }]}>{ticker}</Text>
          </View>
          {isUrgent && (
            <View style={[styles.urgentBadge, { backgroundColor: colors.destructive + "20" }]}>
              <Text style={[styles.urgentText, { color: colors.destructive }]}>긴급</Text>
            </View>
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        {memo ? (
          <Text style={[styles.memo, { color: colors.textSub }]} numberOfLines={1}>
            {memo}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={[styles.date, { color: colors.text }]}>{formatDate(exDividendDate)}</Text>
        <View
          style={[
            styles.dDayBadge,
            {
              backgroundColor: isUrgent
                ? colors.destructive
                : colors.primary + "22",
            },
          ]}
        >
          <Text
            style={[
              styles.dDay,
              {
                color: isUrgent ? "#FFFFFF" : colors.secondary,
              },
            ]}
          >
            D-{daysUntil}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#3D2B1F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  tickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticker: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  urgentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  memo: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  date: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  dDayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dDay: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
