import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface LinePoint {
  label: string;
  value: number;
  value2?: number;
}

interface MiniLineChartProps {
  data: LinePoint[];
  color1?: string;
  color2?: string;
  label1?: string;
  label2?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function MiniLineChart({
  data,
  color1,
  color2,
  label1 = "A",
  label2,
  height = 100,
  formatValue,
}: MiniLineChartProps) {
  const colors = useColors();
  const c1 = color1 ?? colors.primary;
  const c2 = color2 ?? colors.positive;

  const allValues = data.flatMap((d) => [d.value, ...(d.value2 !== undefined ? [d.value2] : [])]);
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const pct = (v: number) => ((v - minVal) / range) * 100;

  const fmt = formatValue ?? ((v: number) => {
    if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
    if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
    return v.toLocaleString();
  });

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: c1 }]} />
          <Text style={[styles.legendText, { color: colors.textSub }]}>{label1}</Text>
        </View>
        {label2 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c2 }]} />
            <Text style={[styles.legendText, { color: colors.textSub }]}>{label2}</Text>
          </View>
        )}
      </View>

      {/* Chart area */}
      <View style={[styles.chartArea, { height }]}>
        {/* Horizontal guide lines */}
        {[0, 25, 50, 75, 100].map((p) => (
          <View
            key={p}
            style={[
              styles.guideLine,
              { bottom: `${p}%` as `${number}%`, borderColor: colors.border },
            ]}
          />
        ))}

        {/* Dots for line 1 */}
        {data.map((pt, i) => (
          <View
            key={`d1-${i}`}
            style={[
              styles.dot,
              {
                left: `${(i / (data.length - 1)) * 92 + 4}%` as `${number}%`,
                bottom: `${pct(pt.value)}%` as `${number}%`,
                backgroundColor: c1,
              },
            ]}
          />
        ))}

        {/* Dots for line 2 */}
        {data.map((pt, i) =>
          pt.value2 !== undefined ? (
            <View
              key={`d2-${i}`}
              style={[
                styles.dot,
                {
                  left: `${(i / (data.length - 1)) * 92 + 4}%` as `${number}%`,
                  bottom: `${pct(pt.value2)}%` as `${number}%`,
                  backgroundColor: c2,
                },
              ]}
            />
          ) : null
        )}
      </View>

      {/* X-axis labels */}
      <View style={styles.xAxis}>
        {data
          .filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1)
          .map((pt, i) => (
            <Text key={i} style={[styles.xLabel, { color: colors.textSub }]}>
              {pt.label}
            </Text>
          ))}
      </View>

      {/* Min / Max indicators */}
      <View style={styles.range}>
        <Text style={[styles.rangeText, { color: colors.textSub }]}>{fmt(minVal)}</Text>
        <Text style={[styles.rangeText, { color: colors.textSub }]}>{fmt(maxVal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  legend: { flexDirection: "row", gap: 12, marginBottom: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  chartArea: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  guideLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderWidth: 0.5,
    borderStyle: "dashed",
  },
  dot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: -3.5,
    marginBottom: -3.5,
  },
  xAxis: { flexDirection: "row", justifyContent: "space-between" },
  xLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  range: { flexDirection: "row", justifyContent: "space-between" },
  rangeText: { fontSize: 9, fontFamily: "Inter_400Regular" },
});
