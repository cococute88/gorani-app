import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface MiniBarChartProps {
  data: BarItem[];
  height?: number;
  showValues?: boolean;
  formatValue?: (v: number) => string;
}

export function MiniBarChart({
  data,
  height = 110,
  showValues = true,
  formatValue,
}: MiniBarChartProps) {
  const colors = useColors();
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const fmt = formatValue ?? ((v) => v.toLocaleString());

  return (
    <View style={[styles.container, { height: height + 36 }]}>
      <View style={[styles.chart, { height }]}>
        {data.map((item, i) => {
          const pct = item.value / maxVal;
          return (
            <View key={i} style={styles.barWrapper}>
              {showValues && (
                <Text style={[styles.valueLabel, { color: colors.textSub }]} numberOfLines={1}>
                  {fmt(item.value)}
                </Text>
              )}
              <View style={[styles.barTrack, { height: height - 20, backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.round(pct * 100)}%` as `${number}%`,
                      backgroundColor: item.color ?? colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.axisLabel, { color: colors.textSub }]} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    paddingBottom: 20,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    justifyContent: "flex-end",
  },
  valueLabel: { fontSize: 8, fontFamily: "Inter_400Regular", textAlign: "center" },
  barTrack: {
    width: "100%",
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: { width: "100%", borderRadius: 4 },
  axisLabel: { fontSize: 8, fontFamily: "Inter_400Regular", textAlign: "center" },
});
