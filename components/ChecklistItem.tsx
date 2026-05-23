import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

interface ChecklistItemProps {
  text: string;
  checked: boolean;
  onToggle: () => void;
}

export function ChecklistItem({ text, checked, onToggle }: ChecklistItemProps) {
  const colors = useColors();

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <TouchableOpacity
      onPress={handleToggle}
      activeOpacity={0.7}
      style={[
        styles.item,
        {
          backgroundColor: checked ? colors.positive + "10" : colors.card,
          borderColor: checked ? colors.positive + "40" : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? colors.positive : "transparent",
            borderColor: checked ? colors.positive : colors.border,
          },
        ]}
      >
        {checked && <Feather name="check" size={14} color="#FFFFFF" />}
      </View>
      <Text
        style={[
          styles.text,
          {
            color: checked ? colors.textSub : colors.text,
            textDecorationLine: checked ? "line-through" : "none",
          },
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});
