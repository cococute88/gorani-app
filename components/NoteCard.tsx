import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface NoteCardProps {
  title: string;
  content: string;
  updatedAt: string;
}

export function NoteCard({ title, content, updatedAt }: NoteCardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Feather name="file-text" size={14} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.content, { color: colors.textSub }]} numberOfLines={2}>
        {content}
      </Text>
      <Text style={[styles.date, { color: colors.border }]}>{updatedAt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
    shadowColor: "#3D2B1F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
