import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface CalculatorSelectorCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

export function CalculatorSelectorCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: CalculatorSelectorCardProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: selected ? "#FFFFFF30" : colors.primary + "18" },
        ]}
      >
        <Feather name={icon} size={20} color={selected ? "#FFF" : colors.primary} />
      </View>
      <Text style={[styles.title, { color: selected ? "#FFF" : colors.text }]}>{title}</Text>
      <Text style={[styles.sub, { color: selected ? "#FFFFFF99" : colors.textSub }]}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 8,
    shadowColor: "#3D2B1F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
