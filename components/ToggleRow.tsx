import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ToggleRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}

export function ToggleRow({ icon, label, sub, value, onValueChange }: ToggleRowProps) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: colors.textSub }]}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
