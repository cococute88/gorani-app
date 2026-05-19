import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type BadgeVariant = "보유중" | "매수 검토중" | "관망";

interface BadgeProps {
  label: BadgeVariant | string;
}

export function Badge({ label }: BadgeProps) {
  const colors = useColors();

  const getBadgeColor = () => {
    switch (label) {
      case "보유중":
        return { bg: colors.positive + "22", text: colors.positive };
      case "매수 검토중":
        return { bg: colors.primary + "22", text: colors.secondary };
      case "관망":
        return { bg: colors.muted, text: colors.textSub };
      default:
        return { bg: colors.muted, text: colors.textSub };
    }
  };

  const badgeColor = getBadgeColor();

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor.bg }]}>
      <Text style={[styles.text, { color: badgeColor.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
