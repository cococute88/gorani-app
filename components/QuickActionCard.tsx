import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface QuickActionCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}

export function QuickActionCard({ icon, label, onPress }: QuickActionCardProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={22} color={colors.primary} />
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
    minHeight: 80,
    shadowColor: "#3D2B1F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
