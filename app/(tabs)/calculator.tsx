import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { MiniLineChart, type LinePoint } from "@/components/MiniLineChart";
import { ScatterPlot } from "@/components/ScatterPlot";
import { TAB_BAR_SAFE_BOTTOM } from "@/constants/layout";
import { calculatorData } from "@/data/dummyData";
import { computeSwitchRatio } from "@/utils/switchRatioEngine";
import { computeDividendCapture, type DividendCaptureRow } from "@/utils/dividendCaptureEngine";

type CalcMode = "conversion" | "dividendTax";
type DivTaxSortKey = "exDate" | "buyPrice" | "dividendNet" | "breakeven" | "success" | "returnRate" | "recoveryDate";
type SortDir = "asc" | "desc";
type RatioSortDir = SortDir | null;

const MODE_OPTIONS: { key: CalcMode; label: string }[] = [
  { key: "conversion", label: "매도전환계산기" },
  { key: "dividendTax", label: "양도세치기 배당시뮬" },
];

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [mode, setMode] = useState<CalcMode>(params.mode === "dividendTax" ? "dividendTax" : "conversion");
  const [expandedChart, setExpandedChart] = useState<"conversion" | "tax" | null>(null);
  const [convInputs, setConvInputs] = useState(calculatorData.conversionAnalysis.inputs);
  const [taxInputs, setTaxInputs] = useState({
    ticker: calculatorData.dividendTaxSim.inputs.ticker,
    investmentAmount: String(Math.round(calculatorData.dividendTaxSim.inputs.investmentAmount / 10000)),
    buyOffsetDays: "-1",
    holdingDays: String(calculatorData.dividendTaxSim.inputs.holdingDays),
    taxRate: String(calculatorData.dividendTaxSim.inputs.taxRate),
    years: "5",
  });
  const [divTaxSort, setDivTaxSort] = useState<{ key: DivTaxSortKey; dir: SortDir }>({ key: "exDate", dir: "asc" });
  const [conversionRatioSort, setConversionRatioSort] = useState<RatioSortDir>(null);
  const [hasShownApiNotice, setHasShownApiNotice] = useState(false);

  useEffect(() => {
    if (params.mode === "conversion" || params.mode === "dividendTax") {
      setMode(params.mode);
    }
  }, [params.mode]);

  const conversion = useMemo(() => buildConversionView(convInputs), [convInputs]);
  const taxView = useMemo(() => buildTaxView(taxInputs), [taxInputs]);

  const sortedTaxRows = useMemo(() => {
    return [...taxView.tableRows].sort((a, b) => {
      const aValue = a[divTaxSort.key];
      const bValue = b[divTaxSort.key];
      const result = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue));
      return divTaxSort.dir === "asc" ? result : -result;
    });
  }, [divTaxSort, taxView.tableRows]);

  const sortedConversionRows = useMemo(() => {
    if (!conversionRatioSort) return conversion.tableRows;
    return [...conversion.tableRows].sort((a, b) => {
      const result = a.ratio - b.ratio;
      return conversionRatioSort === "asc" ? result : -result;
    });
  }, [conversion.tableRows, conversionRatioSort]);

  const setModeWithUrl = (nextMode: CalcMode) => {
    setMode(nextMode);
    router.setParams({ mode: nextMode });
  };

  const toggleDivTaxSort = (key: DivTaxSortKey) => {
    setDivTaxSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const toggleConversionRatioSort = () => {
    setConversionRatioSort((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // 조회 버튼: 실데이터 API 미연결 상태에서 입력값 normalize + 사용자 안내.
  // - ticker는 trim + uppercase
  // - 첫 클릭에만 Alert를 띄우고, 이후로는 todoText만으로 안내 (UX 보호)
  const handleFetch = (target: CalcMode) => {
    if (target === "conversion") {
      setConvInputs((prev) => ({
        ...prev,
        sellTicker: prev.sellTicker.trim().toUpperCase(),
        buyTicker: prev.buyTicker.trim().toUpperCase(),
        startDate: prev.startDate.trim(),
        endDate: prev.endDate.trim(),
      }));
    } else {
      setTaxInputs((prev) => ({
        ...prev,
        ticker: prev.ticker.trim().toUpperCase(),
      }));
    }
    if (!hasShownApiNotice) {
      Alert.alert(
        "조회",
        "실시간 가격 API는 아직 연결되지 않았어요.\n현재는 입력값 기준 더미 데이터로 화면 흐름만 확인합니다.",
      );
      setHasShownApiNotice(true);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: insets.bottom + TAB_BAR_SAFE_BOTTOM },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.title, { color: colors.text }]}>고라니 계산기</Text>
        <Text style={[styles.subtitle, { color: colors.textSub }]}>더미 데이터로 입력 반응성과 화면 흐름을 먼저 확인해요</Text>
      </View>

      <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {MODE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => setModeWithUrl(option.key)}
            style={[styles.modeBtn, { backgroundColor: mode === option.key ? colors.primary : "transparent" }]}
          >
            <Text style={[styles.modeBtnText, { color: mode === option.key ? "#FFF" : colors.textSub }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "conversion" ? (
        <>
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>입력</Text>
              <TouchableOpacity
                onPress={() => handleFetch("conversion")}
                style={[styles.fetchBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}
              >
                <Feather name="search" size={12} color={colors.primary} />
                <Text style={[styles.fetchBtnText, { color: colors.primary }]}>조회</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputGrid}>
              <InputField label="매도 티커" value={convInputs.sellTicker} onChangeText={(value) => setConvInputs((prev) => ({ ...prev, sellTicker: value.toUpperCase() }))} />
              <InputField label="매수 티커" value={convInputs.buyTicker} onChangeText={(value) => setConvInputs((prev) => ({ ...prev, buyTicker: value.toUpperCase() }))} />
              <InputField label="시작일" value={convInputs.startDate} onChangeText={(value) => setConvInputs((prev) => ({ ...prev, startDate: value }))} />
              <InputField label="종료일" value={convInputs.endDate} onChangeText={(value) => setConvInputs((prev) => ({ ...prev, endDate: value }))} />
            </View>
            <Text style={[styles.todoText, { color: colors.textSub }]}>실시간 가격 API 미연결 · 입력값 기반 더미 데이터로 화면 흐름만 확인합니다.</Text>
          </View>

          <View style={styles.conversionMetricRow}>
            <MetricCard label="현재전환비" value={formatRatio(conversion.currentRatio)} tone={colors.primary} threeCol />
            <MetricCard label="평균전환비" value={formatRatio(conversion.avgRatio)} threeCol />
            <MetricCard label="평균대비차이" value={formatDiffPct(conversion.diffPct)} tone={conversion.diffPct >= 0 ? colors.positive : colors.destructive} threeCol />
          </View>

          <ChartCard title="전환비 추이" subtitle={buildConversionSubtitle(convInputs.sellTicker, convInputs.buyTicker, conversion.usedStart, conversion.usedEnd, conversion.pointCount)} onExpand={() => setExpandedChart("conversion")}>
            <MiniLineChart
              data={conversion.chartData}
              label1="전환비"
              color1={colors.primary}
              height={145}
              averageValue={conversion.avgRatio}
              tooltipLabel="전환비"
              formatValue={(value) => value.toFixed(3)}
              showYAxis
              yAxisTicks={5}
              showRange={false}
            />
          </ChartCard>

          <DataTable title="상세 데이터" maxHeight={382}>
            <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.th, { color: colors.textSub }]}>날짜</Text>
              <Text style={[styles.th, { color: colors.textSub }]}>{convInputs.sellTicker || "매도"}</Text>
              <Text style={[styles.th, { color: colors.textSub }]}>{convInputs.buyTicker || "매수"}</Text>
              <TouchableOpacity onPress={toggleConversionRatioSort} style={styles.thPressable}>
                <Text style={[styles.th, { color: conversionRatioSort ? colors.secondary : colors.textSub }]}>
                  전환비{conversionRatioSort === "asc" ? "↑" : conversionRatioSort === "desc" ? "↓" : ""}
                </Text>
              </TouchableOpacity>
            </View>
            {sortedConversionRows.length === 0 ? (
              <View style={[styles.tr, { borderTopColor: colors.border }]}>
                <Text style={[styles.td, { color: colors.textSub, flex: 4 }]}>
                  선택한 구간에 데이터가 없습니다
                </Text>
              </View>
            ) : (
              sortedConversionRows.map((row, index) => (
                <View key={`${row.date}-${index}`} style={[styles.tr, { borderTopColor: colors.border, backgroundColor: index % 2 === 0 ? "transparent" : colors.muted + "50" }]}>
                  <Text style={[styles.td, { color: colors.textSub }]}>{row.date.slice(2)}</Text>
                  <Text style={[styles.td, { color: colors.text }]}>${row.sellPrice.toFixed(2)}</Text>
                  <Text style={[styles.td, { color: colors.text }]}>${row.buyPrice.toFixed(2)}</Text>
                  <Text style={[styles.td, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{row.ratio.toFixed(3)}</Text>
                </View>
              ))
            )}
          </DataTable>
        </>
      ) : (
        <>
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>입력</Text>
              <TouchableOpacity
                onPress={() => handleFetch("dividendTax")}
                style={[styles.fetchBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}
              >
                <Feather name="search" size={12} color={colors.primary} />
                <Text style={[styles.fetchBtnText, { color: colors.primary }]}>조회</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputGrid}>
              <InputField label="티커" value={taxInputs.ticker} onChangeText={(value) => setTaxInputs((prev) => ({ ...prev, ticker: value.toUpperCase() }))} />
              <InputField label="투자자금(만)" value={taxInputs.investmentAmount} keyboardType="numeric" onChangeText={(value) => setTaxInputs((prev) => ({ ...prev, investmentAmount: onlyNumber(value) }))} />
              <InputField label="매수일(기본 배당락일 D-1)" value={taxInputs.buyOffsetDays} keyboardType="numeric" onChangeText={(value) => setTaxInputs((prev) => ({ ...prev, buyOffsetDays: signedNumber(value) }))} />
              <InputField label="매도 허용기간(일)" value={taxInputs.holdingDays} keyboardType="numeric" onChangeText={(value) => setTaxInputs((prev) => ({ ...prev, holdingDays: onlyNumber(value) }))} />
              <InputField label="배당소득세율(%)" value={taxInputs.taxRate} keyboardType="numeric" onChangeText={(value) => setTaxInputs((prev) => ({ ...prev, taxRate: decimalNumber(value) }))} />
              <PeriodField value={taxInputs.years} onChange={(value) => setTaxInputs((prev) => ({ ...prev, years: value }))} />
            </View>
            <Text style={[styles.todoText, { color: colors.textSub }]}>실시간 배당/시세 API 미연결 · 입력값 기반 더미 결과만 갱신됩니다.</Text>
          </View>

          <View style={styles.taxMetricGrid}>
            <MetricCard label="승률" value={taxView.summary.hasData ? `${taxView.kpis.winRate.toFixed(1)}%` : "-"} tone={colors.positive} compact taxKpi />
            <MetricCard label="성공 평균수익률" value={taxView.summary.hasData ? `${taxView.kpis.avgWinReturn >= 0 ? "+" : ""}${taxView.kpis.avgWinReturn.toFixed(2)}%` : "-"} tone={colors.positive} compact taxKpi />
            <MetricCard label="실패 평균손실률" value={taxView.summary.hasData ? `${taxView.kpis.avgLossReturn.toFixed(2)}%` : "-"} tone={colors.destructive} compact taxKpi />
            <MetricCard label="손익비" value={taxView.summary.hasData ? taxView.kpis.profitLossRatio.toFixed(2) : "-"} tone={colors.primary} compact taxKpi />
            <MetricCard label="기대수익률" value={taxView.summary.hasData ? `${taxView.kpis.expectedReturn >= 0 ? "+" : ""}${taxView.kpis.expectedReturn.toFixed(2)}%` : "-"} tone={colors.primary} compact taxKpi />
            <MetricCard label="1회 절세예상액" value={`${taxView.kpis.taxSavingPerTrade.toLocaleString()}원`} compact taxKpi />
          </View>

          <ChartCard title="수익률 분포" subtitle={buildTaxSubtitle(taxInputs.ticker, taxView.summary)} onExpand={() => setExpandedChart("tax")}>
            <ScatterPlot data={taxView.scatterData} xLabel="기간" yLabel="수익률" height={175} />
          </ChartCard>

          <DataTable title="상세 데이터" maxHeight={382} horizontal>
            <View>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <SortableWideHeader label="배당락일" sortKey="exDate" current={divTaxSort} onPress={toggleDivTaxSort} />
                <SortableWideHeader label="매수가" sortKey="buyPrice" current={divTaxSort} onPress={toggleDivTaxSort} />
                <SortableWideHeader label="세후배당금" sortKey="dividendNet" current={divTaxSort} onPress={toggleDivTaxSort} />
                <SortableWideHeader label="손익분기점" sortKey="breakeven" current={divTaxSort} onPress={toggleDivTaxSort} />
                <SortableWideHeader label="성공여부" sortKey="success" current={divTaxSort} onPress={toggleDivTaxSort} />
                <SortableWideHeader label="수익률" sortKey="returnRate" current={divTaxSort} onPress={toggleDivTaxSort} />
                <SortableWideHeader label="회복일자" sortKey="recoveryDate" current={divTaxSort} onPress={toggleDivTaxSort} />
              </View>
              {sortedTaxRows.length === 0 ? (
                <View style={[styles.tr, { borderTopColor: colors.border }]}>
                  <Text style={[styles.tdWide, { color: colors.textSub, width: 580 }]}>
                    {taxView.summary.message ?? "분석할 수 있는 이벤트가 없습니다"}
                  </Text>
                </View>
              ) : (
                sortedTaxRows.map((row, index) => (
                  <View key={`${row.exDate}-${index}`} style={[styles.tr, { borderTopColor: colors.border, backgroundColor: index % 2 === 0 ? "transparent" : colors.muted + "40" }]}>
                    <Text style={[styles.tdWide, { color: colors.textSub }]}>{row.exDate.slice(2)}</Text>
                    <Text style={[styles.tdWide, { color: colors.text }]}>${row.buyPrice.toFixed(2)}</Text>
                    <Text style={[styles.tdWide, { color: colors.primary }]}>${row.dividendNet.toFixed(4)}</Text>
                    <Text style={[styles.tdWide, { color: colors.text }]}>${row.breakeven.toFixed(2)}</Text>
                    <Text style={[styles.tdWide, { color: row.success ? colors.positive : colors.destructive }]}>{row.success ? "성공" : "실패"}</Text>
                    <Text style={[styles.tdWide, { color: row.returnRate >= 0 ? colors.positive : colors.destructive, fontFamily: "Inter_700Bold" }]}>
                      {row.returnRate >= 0 ? "+" : ""}{row.returnRate.toFixed(2)}%
                    </Text>
                    <Text style={[styles.tdWide, { color: colors.textSub }]}>{formatRecovery(row)}</Text>
                  </View>
                ))
              )}
            </View>
          </DataTable>
        </>
      )}

      <ChartExpandModal
        visible={expandedChart !== null}
        title={expandedChart === "tax" ? "수익률 분포 확대" : "전환비 추이 확대"}
        onClose={() => setExpandedChart(null)}
      >
        {expandedChart === "tax" ? (
          <ScatterPlot data={taxView.scatterData} xLabel="기간" yLabel="수익률" height={260} />
        ) : (
          <MiniLineChart
            data={conversion.chartData}
            label1="전환비"
            color1={colors.primary}
            height={260}
            averageValue={conversion.avgRatio}
            tooltipLabel="전환비"
            formatValue={(value) => value.toFixed(3)}
            showYAxis
            yAxisTicks={5}
            showRange={false}
          />
        )}
      </ChartExpandModal>
    </ScrollView>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  keyboardType,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  suffix?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.inputItem}>
      <Text style={[styles.inputLabel, { color: colors.textSub }]}>{label}</Text>
      <View style={[styles.textInputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholderTextColor={colors.textSub}
          style={[styles.textInput, { color: colors.text }]}
        />
        {suffix ? <Text style={[styles.inputSuffix, { color: colors.textSub }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function StepperField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const colors = useColors();
  return (
    <View style={styles.inputItem}>
      <Text style={[styles.inputLabel, { color: colors.textSub }]}>{label}</Text>
      <View style={[styles.stepper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => onChange(Math.max(1, value - 1))} style={styles.stepBtn}>
          <Feather name="minus" size={13} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.stepValue, { color: colors.text }]}>{value}년</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(10, value + 1))} style={styles.stepBtn}>
          <Feather name="plus" size={13} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PeriodField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const colors = useColors();
  const isMax = value === "max";
  return (
    <View style={styles.inputItem}>
      <Text style={[styles.inputLabel, { color: colors.textSub }]}>조회 기간</Text>
      <View style={styles.periodRow}>
        {(["max", "5"] as const).map((option) => {
          const active = option === "max" ? isMax : !isMax;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onChange(option)}
              style={[
                styles.periodBtn,
                {
                  backgroundColor: active ? colors.primary : colors.muted,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.periodBtnText, { color: active ? "#FFF" : colors.textSub }]}>
                {option === "max" ? "최대" : "5"}
              </Text>
            </TouchableOpacity>
          );
        })}
        {!isMax ? (
          <TextInput
            value={value}
            onChangeText={(next) => onChange(onlyNumber(next) || "5")}
            keyboardType="numeric"
            style={[styles.periodInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.text }]}
          />
        ) : null}
      </View>
    </View>
  );
}

function MetricCard({
  label,
  value,
  tone,
  compact,
  threeCol,
  taxKpi,
}: {
  label: string;
  value: string;
  tone?: string;
  compact?: boolean;
  threeCol?: boolean;
  taxKpi?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[threeCol ? styles.metricCardThree : taxKpi ? styles.metricCardTax : styles.metricCard, { backgroundColor: colors.card, borderColor: tone ? tone + "45" : colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.textSub }]} numberOfLines={1}>{label}</Text>
      <Text style={[threeCol ? styles.metricValueThree : taxKpi ? styles.metricValueTax : compact ? styles.metricValueCompact : styles.metricValue, { color: tone ?? colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function ChartCard({ title, subtitle, onExpand, children }: { title: string; subtitle: string; onExpand: () => void; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.chartSub, { color: colors.textSub }]}>{subtitle}</Text>
        </View>
        <TouchableOpacity onPress={onExpand} style={[styles.expandBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}>
          <Feather name="maximize-2" size={13} color={colors.primary} />
          <Text style={[styles.expandText, { color: colors.primary }]}>확대</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function DataTable({ title, maxHeight, horizontal, children }: { title: string; maxHeight: number; horizontal?: boolean; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text, paddingHorizontal: 14, paddingTop: 14 }]}>{title}</Text>
      <ScrollView style={{ maxHeight }} nestedScrollEnabled showsVerticalScrollIndicator>
        {horizontal ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : children}
      </ScrollView>
    </View>
  );
}

function ChartExpandModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.modalSub, { color: colors.textSub }]}>TODO: 네이티브 자동 가로회전은 추후 적용</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.textSub} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function SortableWideHeader({
  label,
  sortKey,
  current,
  onPress,
}: {
  label: string;
  sortKey: DivTaxSortKey;
  current: { key: DivTaxSortKey; dir: SortDir };
  onPress: (key: DivTaxSortKey) => void;
}) {
  const colors = useColors();
  const mark = current.key === sortKey ? (current.dir === "asc" ? "↑" : "↓") : "";
  return (
    <TouchableOpacity onPress={() => onPress(sortKey)}>
      <Text style={[styles.thWide, { color: current.key === sortKey ? colors.secondary : colors.textSub }]}>
        {label}{mark}
      </Text>
    </TouchableOpacity>
  );
}

function buildConversionView(inputs: typeof calculatorData.conversionAnalysis.inputs) {
  // Streamlit `pages_app/4_conversion_analysis.py` 와 같은 의미로 계산
  //   ratio = sell / buy, average = mean(ratio), latest = last ratio
  // 실제 가격 API는 연결하지 않고 calculatorData 더미 시계열을 사용한다.
  const result = computeSwitchRatio({
    sellTicker: inputs.sellTicker,
    buyTicker: inputs.buyTicker,
    startDate: inputs.startDate,
    endDate: inputs.endDate,
  });
  return {
    chartData: result.chartData as unknown as LinePoint[],
    tableRows: result.tableRows,
    avgRatio: result.avgRatio,
    currentRatio: result.currentRatio,
    diffPct: result.diffPct,
    diffAbs: result.diffAbs,
    usedStart: result.usedStart,
    usedEnd: result.usedEnd,
    pointCount: result.pointCount,
  };
}

function formatRatio(value: number) {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(3);
}

function formatDiffPct(value: number) {
  if (!Number.isFinite(value)) return "-";
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function buildConversionSubtitle(sellTicker: string, buyTicker: string, usedStart: string, usedEnd: string, pointCount: number) {
  const pair = `${sellTicker || "-"} / ${buyTicker || "-"}`;
  if (pointCount === 0 || !usedStart || !usedEnd) return pair;
  return `${pair} · ${usedStart} ~ ${usedEnd}`;
}

function buildTaxView(inputs: {
  ticker: string;
  investmentAmount: string;
  buyOffsetDays: string;
  holdingDays: string;
  taxRate: string;
  years: string;
}) {
  // Streamlit `pages_app/3_dividend_sim.py` 와 같은 의미로 계산
  //   세후배당금 = 세전배당 × (1 - 세율)
  //   손익분기점 = 매수가 - 세후배당
  //   성공 = window 내 일봉 고가 max ≥ 손익분기점 → 수익률 = (세후배당 / 매수가) × 100
  //   실패 = (window 마지막일 종가 + 세후배당 - 매수가) / 매수가 × 100
  //   조회 기간 "max" = 전체, "5" 등 = 마지막 ex-date 기준 N년
  const result = computeDividendCapture({
    ticker: inputs.ticker,
    investmentAmountMan: inputs.investmentAmount,
    taxRatePct: inputs.taxRate,
    sellWindowDays: inputs.holdingDays,
    lookback: inputs.years,
  });

  return {
    tableRows: result.detailRows,
    scatterData: result.scatterPoints,
    kpis: {
      winRate: result.kpis.winRate,
      avgWinReturn: result.kpis.avgWinReturn,
      avgLossReturn: result.kpis.avgLossReturn,
      profitLossRatio: result.kpis.profitLossRatio,
      expectedReturn: result.kpis.expectedReturn,
      taxSavingPerTrade: result.kpis.taxSavingPerTrade,
    },
    summary: {
      totalCount: result.kpis.totalCount,
      successCount: result.kpis.successCount,
      failCount: result.kpis.failCount,
      usedStart: result.usedStart,
      usedEnd: result.usedEnd,
      effectiveLookbackLabel: result.effectiveLookbackLabel,
      ticker: result.ticker,
      hasData: result.hasData,
      message: result.message,
    },
  };
}

function tickerSeed(value: string) {
  // 미사용 함수 (이전 더미 distortion 로직 잔재). Streamlit 기반 실제 계산식으로 교체된 후 미사용.
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 37 - 18;
}

function average(values: number[]) {
  // 미사용 함수 (이전 더미 KPI 계산 잔재). 새 엔진의 mean이 대체.
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatRecovery(row: DividendCaptureRow) {
  if (row.success) return "성공";
  if (!row.recoveryDate) return "-";
  if (row.recoveryDate === "회복불가") return "회복불가";
  return row.recoveryDate;
}

function buildTaxSubtitle(ticker: string, summary: { hasData: boolean; usedStart: string; usedEnd: string; effectiveLookbackLabel: string; totalCount: number }) {
  const head = `${ticker || "-"} · 성공/실패`;
  if (!summary.hasData || summary.totalCount === 0) return head;
  return `${head} · ${summary.usedStart} ~ ${summary.usedEnd}`;
}

function onlyNumber(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function decimalNumber(value: string) {
  return value.replace(/[^0-9.]/g, "");
}

function signedNumber(value: string) {
  const cleaned = value.replace(/[^0-9-]/g, "");
  return cleaned.startsWith("-") ? `-${cleaned.replace(/-/g, "")}` : cleaned.replace(/-/g, "");
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  pageHeader: { gap: 3 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modeRow: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4, borderWidth: 1 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center" },
  modeBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  inputCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  fetchBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  fetchBtnText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  inputGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  inputItem: { width: "47%", gap: 5 },
  inputLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  textInputWrap: { minHeight: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  textInput: { flex: 1, paddingVertical: 7, fontSize: 13, fontFamily: "Inter_700Bold" },
  inputSuffix: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  stepper: { minHeight: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  stepValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  periodBtn: { minWidth: 42, minHeight: 38, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  periodBtnText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  periodInput: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, fontSize: 12, fontFamily: "Inter_700Bold" },
  todoText: { fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular" },
  conversionMetricRow: { flexDirection: "row", gap: 5 },
  taxMetricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: { width: "48%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, gap: 4 },
  metricCardThree: { flex: 1, minWidth: 0, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8, borderWidth: 1.5, gap: 3 },
  metricCardTax: { width: "32%", minWidth: 0, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 8, borderWidth: 1.5, gap: 3 },
  metricLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  metricValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  metricValueCompact: { fontSize: 16, fontFamily: "Inter_700Bold" },
  metricValueThree: { fontSize: 14, fontFamily: "Inter_700Bold" },
  metricValueTax: { fontSize: 13, fontFamily: "Inter_700Bold" },
  chartCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  chartTitleRow: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8, minWidth: 0 },
  chartSub: { flexShrink: 1, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  expandBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  expandText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  tableCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  tableHeader: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  thPressable: { flex: 1 },
  th: { flex: 1, fontSize: 9, fontFamily: "Inter_700Bold", textAlign: "center" },
  thWide: { width: 82, fontSize: 9, fontFamily: "Inter_700Bold", textAlign: "center" },
  tr: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1 },
  td: { flex: 1, fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  tdWide: { width: 82, fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(35, 24, 14, 0.45)", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 760, alignSelf: "center", borderRadius: 18, padding: 16, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  closeBtn: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
