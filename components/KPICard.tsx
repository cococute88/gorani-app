import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
}

export function KPICard({ label, value, sub, valueColor }: KPICardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSub }]} numberOfLines={2}>{label}</Text>
      <Text style={[styles.value, { color: valueColor ?? colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={[styles.sub, { color: colors.textSub }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 4,
    flex: 1,
    shadowColor: "#3D2B1F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  value: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
