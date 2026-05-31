import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface ScatterPoint {
  id: string;
  x: number;  // 0-100
  y: number;  // 0-100
  success: boolean;
  label?: string;
  tooltip?: string;
}

interface ScatterPlotProps {
  data: ScatterPoint[];
  height?: number;
  xLabel?: string;
  yLabel?: string;
}

export function ScatterPlot({ data, height = 160, xLabel = "기간", yLabel = "수익률" }: ScatterPlotProps) {
  const colors = useColors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const successCount = data.filter((d) => d.success).length;
  const failCount = data.length - successCount;
  const selected = data.find((point) => point.id === selectedId);
  const xAxisLabels = buildXAxisLabels(data);

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
          <Text style={[styles.legendText, { color: colors.textSub }]}>성공 ({successCount})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
          <Text style={[styles.legendText, { color: colors.textSub }]}>실패 ({failCount})</Text>
        </View>
      </View>

      <View style={styles.plotWrap}>
        {/* Y axis label */}
        <Text style={[styles.yLabel, { color: colors.textSub }]}>{yLabel}</Text>

        {/* Plot area */}
        <View style={[styles.plot, { height, backgroundColor: colors.muted + "60" }]}>
          {/* Guide lines */}
          {[25, 50, 75].map((p) => (
            <View
              key={p}
              style={[
                styles.guideLine,
                { bottom: `${p}%` as `${number}%`, borderColor: colors.border },
              ]}
            />
          ))}
          {[25, 50, 75].map((p) => (
            <View
              key={p}
              style={[
                styles.guideVLine,
                { left: `${p}%` as `${number}%`, borderColor: colors.border },
              ]}
            />
          ))}

          {/* Average line at y=50 */}
          <View style={[styles.avgLine, { backgroundColor: colors.primary + "60" }]} />

          {/* Scatter dots */}
          {data.map((pt) => (
            <Pressable
              key={pt.id}
              onPress={() => setSelectedId(pt.id)}
              onHoverIn={() => setSelectedId(pt.id)}
              style={[
                styles.dot,
                {
                  left: `${pt.x}%` as `${number}%`,
                  bottom: `${pt.y}%` as `${number}%`,
                  backgroundColor: pt.success ? colors.positive : colors.destructive,
                },
              ]}
            />
          ))}
          {selected ? (
            <View
              pointerEvents="none"
              style={[
                styles.tooltip,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  left: `${Math.min(Math.max(selected.x, 18), 62)}%` as `${number}%`,
                  top: selected.y > 58 ? 12 : height - 48,
                },
              ]}
            >
              <Text style={[styles.tooltipText, { color: colors.text }]}>
                {selected.tooltip ?? `${selected.label ?? selected.id} · 수익률 ${selected.y.toFixed(1)}% · ${selected.success ? "성공" : "실패"}`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* X axis */}
        {xAxisLabels.length > 0 ? (
          <View style={styles.xTickRow}>
            {xAxisLabels.map((label) => (
              <Text key={label} style={[styles.xTickText, { color: colors.textSub }]}>
                {label}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={[styles.xLabel, { color: colors.textSub }]}>{xLabel}</Text>
      </View>
    </View>
  );
}

function buildXAxisLabels(data: ScatterPoint[]) {
  const labels = data
    .map((point) => formatAxisDate(point.label))
    .filter((label): label is string => Boolean(label));
  const uniqueLabels = Array.from(new Set(labels));
  if (uniqueLabels.length <= 5) return uniqueLabels;
  const step = Math.ceil(uniqueLabels.length / 5);
  return uniqueLabels.filter((_, index) => index % step === 0 || index === uniqueLabels.length - 1);
}

function formatAxisDate(label?: string) {
  if (!label) return null;
  const match = label.match(/^(\d{2}|\d{4})-(\d{2})/);
  if (!match) return null;
  const year = match[1].slice(-2);
  return `${year}-${match[2]}`;
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  legend: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  plotWrap: { gap: 4 },
  yLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  plot: { position: "relative", borderRadius: 8, overflow: "hidden" },
  guideLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderWidth: 0.5,
    borderStyle: "dashed",
  },
  guideVLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    borderWidth: 0.5,
    borderStyle: "dashed",
  },
  avgLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    bottom: "50%",
  },
  dot: {
    position: "absolute",
    width: 15,
    height: 15,
    borderRadius: 8,
    marginLeft: -7.5,
    marginBottom: -7.5,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  tooltip: {
    position: "absolute",
    maxWidth: 210,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: "#3D2B1F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  xTickRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  xTickText: { fontSize: 9, fontFamily: "Inter_500Medium" },
  xLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
});
