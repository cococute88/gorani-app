import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

export interface MultiLineSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  values: number[];
}

interface MultiLineChartProps {
  labels: string[];
  series: MultiLineSeries[];
  height?: number;
  formatValue?: (v: number) => string;
  retireIndex?: number;
}

export function MultiLineChart({
  labels,
  series,
  height = 150,
  formatValue,
  retireIndex,
}: MultiLineChartProps) {
  const colors = useColors();
  const dataLen = labels.length;

  const allValues = series.flatMap((s) => s.values);
  const dataMax = Math.max(...allValues, 1);
  const dataMin = Math.min(...allValues, 0);
  const dataRange = dataMax - dataMin || Math.max(Math.abs(dataMax) * 0.1, 0.001);
  const maxVal = dataMax + dataRange * 0.08;
  // Fix negative axis: if all data is non-negative, don't show negative axis
  const minVal = dataMin >= 0 ? Math.max(0, dataMin - dataRange * 0.08) : dataMin - dataRange * 0.08;
  const range = maxVal - minVal || 1;

  const chartW = 320;
  const chartH = height;
  const padX = 12;
  const padY = 10;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;

  const yAxisTicks = 5;
  const yTicks = Array.from({ length: yAxisTicks }, (_, i) => {
    const ratio = i / (yAxisTicks - 1);
    return { value: maxVal - range * ratio, y: padY + innerH * ratio };
  });

  const fmt = formatValue ?? ((v: number) => {
    if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
    if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
    return v.toLocaleString();
  });

  const point = (v: number, i: number) => {
    const divisor = Math.max(dataLen - 1, 1);
    const x = padX + (i / divisor) * innerW;
    const y = padY + (1 - (v - minVal) / range) * innerH;
    return { x, y };
  };

  const retireX = retireIndex !== undefined && retireIndex >= 0 && retireIndex < dataLen
    ? point(0, retireIndex).x
    : null;

  return (
    <View style={mStyles.container}>
      {/* Legend */}
      <View style={mStyles.legend}>
        {series.map((s) => (
          <View key={s.key} style={mStyles.legendItem}>
            <Svg width={18} height={6}>
              <Line
                x1={0}
                y1={3}
                x2={18}
                y2={3}
                stroke={s.color}
                strokeWidth={s.dashed ? 1.8 : 2.4}
                strokeDasharray={s.dashed ? "3 2" : undefined}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={[mStyles.legendText, { color: colors.textSub }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={mStyles.chartRow}>
        <View style={[mStyles.yAxis, { height }]}>
          {yTicks.map((tick, i) => (
            <Text key={i} style={[mStyles.yAxisText, { color: colors.textSub }]}>
              {fmt(tick.value)}
            </Text>
          ))}
        </View>
        <View style={[mStyles.chartArea, { height }]}>
          <Svg width="100%" height={height} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
            {yTicks.map((tick, i) => (
              <Line key={i} x1={0} x2={chartW} y1={tick.y} y2={tick.y} stroke={colors.border} strokeDasharray="4 4" strokeWidth={0.8} />
            ))}
            {retireX !== null && (
              <>
                <Line x1={retireX} x2={retireX} y1={padY} y2={chartH - padY} stroke="#8B7355" strokeDasharray="5 3" strokeWidth={1.5} />
                <SvgText x={retireX + 3} y={padY + 10} fontSize={8} fill="#8B7355" fontWeight="bold">은퇴</SvgText>
              </>
            )}
            {series.map((s) => {
              const pts = s.values.map((v, i) => point(v, i));
              const polyStr = pts.map((p) => `${p.x},${p.y}`).join(" ");
              return (
                <Polyline
                  key={s.key}
                  points={polyStr}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.dashed ? 1.8 : 2.2}
                  strokeDasharray={s.dashed ? "5 3" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            {series.map((s) => {
              const pts = s.values.map((v, i) => point(v, i));
              return pts.map((p, i) => (
                <Circle key={`${s.key}-${i}`} cx={p.x} cy={p.y} r={2} fill={s.color} />
              ));
            })}
          </Svg>
        </View>
      </View>

      {/* X-axis labels */}
      <View style={mStyles.xAxis}>
        {labels
          .filter((_, i) => i % Math.ceil(dataLen / 5) === 0 || i === dataLen - 1)
          .map((label, i) => (
            <Text key={i} style={[mStyles.xLabel, { color: colors.textSub }]}>{label}</Text>
          ))}
      </View>
    </View>
  );
}

const mStyles = StyleSheet.create({
  container: { gap: 4 },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 4, marginBottom: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontSize: 9, fontFamily: "Inter_400Regular" },
  chartRow: { flexDirection: "row", alignItems: "stretch", gap: 4 },
  yAxis: { width: 38, justifyContent: "space-between", alignItems: "flex-end", paddingVertical: 4 },
  yAxisText: { fontSize: 7, fontFamily: "Inter_400Regular" },
  chartArea: { flex: 1, borderRadius: 8, overflow: "hidden" },
  xAxis: { flexDirection: "row", justifyContent: "space-between", paddingLeft: 42 },
  xLabel: { fontSize: 8, fontFamily: "Inter_400Regular" },
});
