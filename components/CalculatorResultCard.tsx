import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ResultRow {
  label: string;
  value: string;
  highlight?: boolean;
}

interface CalculatorResultCardProps {
  title: string;
  rows: ResultRow[];
  note?: string;
}

export function CalculatorResultCard({ title, rows, note }: CalculatorResultCardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" },
      ]}
    >
      <View style={styles.header}>
        <Feather name="trending-up" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.secondary }]}>{title}</Text>
      </View>
      {rows.map((row, i) => (
        <View
          key={i}
          style={[
            styles.row,
            i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.textSub }]}>{row.label}</Text>
          <Text
            style={[
              styles.value,
              { color: row.highlight ? colors.positive : colors.text },
            ]}
          >
            {row.value}
          </Text>
        </View>
      ))}
      {note && (
        <View style={[styles.noteWrap, { backgroundColor: colors.muted }]}>
          <Feather name="info" size={12} color={colors.textSub} />
          <Text style={[styles.note, { color: colors.textSub }]}>{note}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  value: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  noteWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
  },
  note: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    flex: 1,
  },
});
