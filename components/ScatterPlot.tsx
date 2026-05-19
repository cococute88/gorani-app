import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface ScatterPoint {
  id: string;
  x: number;  // 0-100
  y: number;  // 0-100
  success: boolean;
  label?: string;
}

interface ScatterPlotProps {
  data: ScatterPoint[];
  height?: number;
  xLabel?: string;
  yLabel?: string;
}

export function ScatterPlot({ data, height = 160, xLabel = "기간", yLabel = "수익률" }: ScatterPlotProps) {
  const colors = useColors();
  const successCount = data.filter((d) => d.success).length;
  const failCount = data.length - successCount;

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
            <View
              key={pt.id}
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
        </View>

        {/* X axis */}
        <Text style={[styles.xLabel, { color: colors.textSub }]}>{xLabel}</Text>
      </View>
    </View>
  );
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
    width: 9,
    height: 9,
    borderRadius: 5,
    marginLeft: -4.5,
    marginBottom: -4.5,
  },
  xLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
});
