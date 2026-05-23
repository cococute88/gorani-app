import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

export interface LinePoint {
  label: string;
  value: number;
  value2?: number;
  tooltip?: string;
}

interface MiniLineChartProps {
  data: LinePoint[];
  color1?: string;
  color2?: string;
  label1?: string;
  label2?: string;
  height?: number;
  formatValue?: (v: number) => string;
  averageValue?: number;
  averageLabel?: string;
  showArea?: boolean;
  tooltipLabel?: string;
  showYAxis?: boolean;
  yAxisTicks?: number;
  showRange?: boolean;
}

export function MiniLineChart({
  data,
  color1,
  color2,
  label1 = "A",
  label2,
  height = 100,
  formatValue,
  averageValue,
  averageLabel,
  showArea = true,
  tooltipLabel = label1,
  showYAxis = false,
  yAxisTicks = 5,
  showRange = true,
}: MiniLineChartProps) {
  const colors = useColors();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const c1 = color1 ?? colors.primary;
  const c2 = color2 ?? colors.positive;

  const allValues = data.flatMap((d) => [d.value, ...(d.value2 !== undefined ? [d.value2] : [])]);
  const rawMax = Math.max(...allValues, 1);
  const rawMin = Math.min(...allValues, 0);
  const dataMax = Math.max(...allValues);
  const dataMin = Math.min(...allValues);
  const dataRange = dataMax - dataMin || Math.max(Math.abs(dataMax) * 0.1, 0.001);
  const maxVal = showYAxis ? dataMax + dataRange * 0.08 : rawMax;
  const minVal = showYAxis ? dataMin - dataRange * 0.08 : rawMin;
  const range = maxVal - minVal || 1;

  const chartW = 320;
  const chartH = height;
  const padX = 12;
  const padY = 10;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;

  const point = (v: number, i: number) => {
    const divisor = Math.max(data.length - 1, 1);
    const x = padX + (i / divisor) * innerW;
    const y = padY + (1 - (v - minVal) / range) * innerH;
    return { x, y };
  };

  const points1 = data.map((pt, i) => point(pt.value, i));
  const points2 = data.map((pt, i) => (pt.value2 !== undefined ? point(pt.value2, i) : null)).filter(Boolean) as { x: number; y: number }[];
  const polyline1 = points1.map((p) => `${p.x},${p.y}`).join(" ");
  const polyline2 = points2.map((p) => `${p.x},${p.y}`).join(" ");
  const area1 = `${padX},${chartH - padY} ${polyline1} ${chartW - padX},${chartH - padY}`;
  const avgY = averageValue === undefined ? null : point(averageValue, 0).y;
  const tickCount = Math.max(2, yAxisTicks);
  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const ratio = i / (tickCount - 1);
    return {
      ratio,
      value: maxVal - range * ratio,
      y: padY + innerH * ratio,
    };
  });

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

      <View style={styles.chartRow}>
        {showYAxis ? (
          <View style={[styles.yAxis, { height }]}>
            {yTicks.map((tick) => (
              <Text key={tick.ratio} style={[styles.yAxisText, { color: colors.textSub }]}>
                {fmt(tick.value)}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={[styles.chartArea, { height }]}>
          <Svg width="100%" height={height} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
            {yTicks.map((tick) => (
              <Line
                key={tick.ratio}
                x1={0}
                x2={chartW}
                y1={tick.y}
                y2={tick.y}
                stroke={colors.border}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            ))}
            {showArea && <Polygon points={area1} fill={c1} opacity={0.1} />}
            {avgY !== null && (
              <Line x1={padX} x2={chartW - padX} y1={avgY} y2={avgY} stroke={colors.secondary} strokeDasharray="6 4" strokeWidth={1.4} />
            )}
            <Polyline points={polyline1} fill="none" stroke={c1} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            {polyline2 ? <Polyline points={polyline2} fill="none" stroke={c2} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /> : null}
            {points1.map((p, i) => <Circle key={`d1-${i}`} cx={p.x} cy={p.y} r={3.5} fill={c1} />)}
            {points2.map((p, i) => <Circle key={`d2-${i}`} cx={p.x} cy={p.y} r={3.2} fill={c2} />)}
          </Svg>
          {data.map((pt, i) => {
            const p = points1[i];
            return (
              <Pressable
                key={`hit-${i}`}
                onPress={() => setSelectedIdx(i)}
                onHoverIn={() => setSelectedIdx(i)}
                style={[
                  styles.hitPoint,
                  {
                    left: `${(p.x / chartW) * 100}%` as `${number}%`,
                    top: `${(p.y / chartH) * 100}%` as `${number}%`,
                  },
                ]}
              />
            );
          })}
          {selectedIdx !== null && data[selectedIdx] && (
            <View
              pointerEvents="none"
              style={[
                styles.tooltip,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  left: `${Math.min(Math.max((points1[selectedIdx].x / chartW) * 100, 18), 66)}%` as `${number}%`,
                  top: points1[selectedIdx].y < chartH / 2 ? 42 : 8,
                },
              ]}
            >
              <Text style={[styles.tooltipText, { color: colors.text }]}>
                {data[selectedIdx].tooltip ?? `${data[selectedIdx].label} · ${tooltipLabel} ${fmt(data[selectedIdx].value)}`}
              </Text>
            </View>
          )}
        </View>
      </View>
      {averageValue !== undefined && averageLabel ? (
        <Text style={[styles.avgLabel, { color: colors.secondary }]}>{averageLabel}</Text>
      ) : null}

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

      {showRange ? (
        <View style={styles.range}>
          <Text style={[styles.rangeText, { color: colors.textSub }]}>{fmt(minVal)}</Text>
          <Text style={[styles.rangeText, { color: colors.textSub }]}>{fmt(maxVal)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  legend: { flexDirection: "row", gap: 12, marginBottom: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  chartRow: { flexDirection: "row", alignItems: "stretch", gap: 4 },
  yAxis: { width: 34, justifyContent: "space-between", alignItems: "flex-end", paddingVertical: 4 },
  yAxisText: { fontSize: 8, fontFamily: "Inter_400Regular" },
  chartArea: {
    flex: 1,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  hitPoint: {
    position: "absolute",
    width: 32,
    height: 32,
    marginLeft: -16,
    marginTop: -16,
    borderRadius: 16,
  },
  tooltip: {
    position: "absolute",
    maxWidth: 190,
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
  avgLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", alignSelf: "flex-end" },
  xAxis: { flexDirection: "row", justifyContent: "space-between" },
  xLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  range: { flexDirection: "row", justifyContent: "space-between" },
  rangeText: { fontSize: 9, fontFamily: "Inter_400Regular" },
});
