import React, { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";
import { TAB_BAR_SAFE_BOTTOM } from "@/constants/layout";
import { assetMonthlyData, formatKRW, AssetMonthly } from "@/data/dummyData";
import { useAuth } from "@/hooks/useAuth";
import { useTrackerQuery } from "@/hooks/useRtdbData";
import { normalizeTracker, type TrackerTickerBreakdown } from "@/utils/normalizeTracker";

const STREAMLIT_ASSET_COLORS = {
  cash: "#7CB342",
  dollar: "#2E7D32",
  leverage: "#8D2A1F",
  nasdaq: "#E53935",
  spy: "#FB8C00",
  dividend: "#FDD835",
} as const;

const OTHER_ASSET_COLORS = ["#3182F6", "#7E57C2", "#26A69A", "#EC407A", "#5C6BC0", "#42A5F5", "#5E35B1", "#00897B"];

type AssetViewMode = "category" | "ticker";
type StreamlitAssetType = "cash" | "dollar" | "leverage" | "nasdaq" | "spy" | "dividend" | "other";
type StreamlitSuperGroup = "spy_div" | "cash_dol" | "lev_nas" | "other_grp";

type BreakdownItem = {
  name: string;
  amount: number;
  ratio: number;
  color: string;
};

type StackDatum = {
  label: string;
  values: Record<string, number>;
};

const EMPTY_ASSET_MONTH: AssetMonthly = {
  month: "",
  displayLabel: "-",
  totalAsset: 0,
  changeFromPrev: 0,
  tags: [],
};

const CATEGORY_COLORS: Record<string, string> = {
  "현금": STREAMLIT_ASSET_COLORS.cash,
  "달러": STREAMLIT_ASSET_COLORS.dollar,
  "SGOV/채권성": STREAMLIT_ASSET_COLORS.cash,
  "나스닥": STREAMLIT_ASSET_COLORS.nasdaq,
  "SPY": STREAMLIT_ASSET_COLORS.spy,
  "배당주": STREAMLIT_ASSET_COLORS.dividend,
  "기타": OTHER_ASSET_COLORS[0] ?? "#3182F6",
};

const TICKER_COLORS: Record<string, string> = {
  "현금": STREAMLIT_ASSET_COLORS.cash,
  "달러": STREAMLIT_ASSET_COLORS.dollar,
  "기타": OTHER_ASSET_COLORS[0] ?? "#3182F6",
  "SGOV": STREAMLIT_ASSET_COLORS.cash,
  "SPY": STREAMLIT_ASSET_COLORS.spy,
  "VOO": STREAMLIT_ASSET_COLORS.spy,
  "IVV": STREAMLIT_ASSET_COLORS.spy,
  "SPLG": STREAMLIT_ASSET_COLORS.spy,
  "QQQ": STREAMLIT_ASSET_COLORS.nasdaq,
  "QQQM": STREAMLIT_ASSET_COLORS.nasdaq,
  "TQQQ": STREAMLIT_ASSET_COLORS.leverage,
  "QLD": STREAMLIT_ASSET_COLORS.leverage,
  "SCHD": STREAMLIT_ASSET_COLORS.dividend,
  "MSFT": STREAMLIT_ASSET_COLORS.dividend,
  "AAPL": STREAMLIT_ASSET_COLORS.dividend,
  "VYM": STREAMLIT_ASSET_COLORS.dividend,
  "DGRO": STREAMLIT_ASSET_COLORS.dividend,
  "KO": STREAMLIT_ASSET_COLORS.dividend,
  "JNJ": STREAMLIT_ASSET_COLORS.dividend,
  "PG": STREAMLIT_ASSET_COLORS.dividend,
  "VTI": STREAMLIT_ASSET_COLORS.dividend,
  "VTV": STREAMLIT_ASSET_COLORS.dividend,
  "VUG": STREAMLIT_ASSET_COLORS.dividend,
  "DIA": STREAMLIT_ASSET_COLORS.dividend,
};

const TICKER_BREAKDOWN_BY_MONTH: Record<string, { name: string; amount: number }[]> = {
  "2026-01": [
    { name: "현금", amount: 2200000 },
    { name: "달러", amount: 1500000 },
    { name: "SGOV", amount: 3000000 },
    { name: "SPY", amount: 2000000 },
    { name: "QQQ", amount: 1550000 },
    { name: "QLD", amount: 1150000 },
    { name: "SCHD", amount: 1000000 },
    { name: "APAM", amount: 850000 },
    { name: "TROW", amount: 650000 },
    { name: "기타", amount: 900000 },
  ],
  "2026-02": [
    { name: "현금", amount: 2100000 },
    { name: "달러", amount: 1600000 },
    { name: "SGOV", amount: 3100000 },
    { name: "SPY", amount: 2100000 },
    { name: "QQQ", amount: 1700000 },
    { name: "QLD", amount: 1200000 },
    { name: "SCHD", amount: 1000000 },
    { name: "APAM", amount: 850000 },
    { name: "TROW", amount: 650000 },
    { name: "기타", amount: 900000 },
  ],
  "2026-03": [
    { name: "현금", amount: 2000000 },
    { name: "달러", amount: 1700000 },
    { name: "SGOV", amount: 3200000 },
    { name: "SPY", amount: 2200000 },
    { name: "QQQ", amount: 1800000 },
    { name: "QLD", amount: 1300000 },
    { name: "SCHD", amount: 1100000 },
    { name: "APAM", amount: 900000 },
    { name: "TROW", amount: 700000 },
    { name: "기타", amount: 700000 },
  ],
  "2026-04": [
    { name: "현금", amount: 2500000 },
    { name: "달러", amount: 1500000 },
    { name: "SGOV", amount: 3100000 },
    { name: "SPY", amount: 2000000 },
    { name: "QQQ", amount: 1500000 },
    { name: "QLD", amount: 1200000 },
    { name: "SCHD", amount: 1050000 },
    { name: "APAM", amount: 850000 },
    { name: "TROW", amount: 650000 },
    { name: "기타", amount: 750000 },
  ],
  "2026-05": [
    { name: "현금", amount: 2500000 },
    { name: "달러", amount: 1800000 },
    { name: "SGOV", amount: 3200000 },
    { name: "SPY", amount: 2200000 },
    { name: "QQQ", amount: 1800000 },
    { name: "QLD", amount: 1400000 },
    { name: "SCHD", amount: 1100000 },
    { name: "APAM", amount: 850000 },
    { name: "TROW", amount: 650000 },
    { name: "기타", amount: 500000 },
  ],
};

export default function AssetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const trackerQuery = useTrackerQuery(user?.email);
  const firebaseTracker = useMemo(
    () => normalizeTracker(trackerQuery.data),
    [trackerQuery.data],
  );
  const hasLoginEmail = Boolean(user?.email);
  const isUsingFirebaseTracker = hasLoginEmail && trackerQuery.isSuccess && firebaseTracker.months.length > 0;
  const isFirebaseTrackerEmpty = hasLoginEmail && trackerQuery.isSuccess && firebaseTracker.months.length === 0;
  const isFirebaseTrackerFailed = hasLoginEmail && trackerQuery.isError;
  const trackerMonthlyData = isUsingFirebaseTracker
    ? firebaseTracker.months
    : isFirebaseTrackerEmpty
      ? []
      : assetMonthlyData;
  const trackerTickerBreakdown = isUsingFirebaseTracker
    ? firebaseTracker.tickerBreakdownByMonth
    : TICKER_BREAKDOWN_BY_MONTH;
  const trackerSourceText = getTrackerSourceText({
    hasLoginEmail,
    isLoading: trackerQuery.isLoading,
    isUsingFirebaseTracker,
    isFirebaseTrackerEmpty,
    isFirebaseTrackerFailed,
  });
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [selectedIdx, setSelectedIdx] = useState(assetMonthlyData.length - 1);
  const [viewMode, setViewMode] = useState<AssetViewMode>("category");
  const [monthlyRawData, setMonthlyRawData] = useState<Record<string, string>>({});
  const [rawModalVisible, setRawModalVisible] = useState(false);
  const [rawDraft, setRawDraft] = useState("");
  const [selectedSliceKey, setSelectedSliceKey] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIdx(Math.max(trackerMonthlyData.length - 1, 0));
    setSelectedSliceKey(null);
  }, [isFirebaseTrackerEmpty, isUsingFirebaseTracker, trackerMonthlyData.length]);

  const hasTrackerRows = trackerMonthlyData.length > 0;
  const safeSelectedIdx = trackerMonthlyData.length > 0 ? Math.min(selectedIdx, trackerMonthlyData.length - 1) : 0;
  const data: AssetMonthly = trackerMonthlyData[safeSelectedIdx] ?? EMPTY_ASSET_MONTH;
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(data), [data]);
  const tickerBreakdown = useMemo(() => getTickerBreakdown(data, trackerTickerBreakdown), [data, trackerTickerBreakdown]);
  const breakdown = viewMode === "category" ? categoryBreakdown : tickerBreakdown;
  const stackedData = useMemo(
    () => getStackedData(viewMode, trackerMonthlyData, trackerTickerBreakdown),
    [trackerMonthlyData, trackerTickerBreakdown, viewMode],
  );
  const stackKeys = useMemo(() => getStackKeys(stackedData, breakdown), [breakdown, stackedData]);
  const colorMap = useMemo(() => buildColorMap(stackKeys), [stackKeys]);
  const rawDataKey = data?.displayLabel ?? "-";

  const openRawModal = () => {
    setRawDraft(monthlyRawData[rawDataKey] ?? "");
    setRawModalVisible(true);
  };

  const saveRawData = () => {
    // TODO: 파싱 연결 예정
    setMonthlyRawData((prev) => ({ ...prev, [rawDataKey]: rawDraft }));
    setRawModalVisible(false);
  };

  const toggleSlice = (key: string) => {
    setSelectedSliceKey((prev) => (prev === key ? null : key));
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
      <View style={styles.pageHeaderRow}>
        <View style={styles.pageHeaderText}>
          <Text style={[styles.title, { color: colors.text }]}>자산 트래커</Text>
          <Text style={[styles.subtitle, { color: colors.textSub }]}>월별 자산 비중과 흐름을 더미 데이터로 확인해요</Text>
        </View>
        <TouchableOpacity onPress={openRawModal} style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="settings" size={18} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sourceText, { color: colors.textSub }]}>{trackerSourceText}</Text>

      <Modal visible={rawModalVisible} transparent animationType="slide" onRequestClose={() => setRawModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.rawModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.rawModalTitle, { color: colors.text }]}>{rawDataKey} 자산 내역 등록/수정</Text>
            <TextInput
              value={rawDraft}
              onChangeText={setRawDraft}
              multiline
              textAlignVertical="top"
              placeholder="자산 원문 텍스트를 붙여넣으세요"
              placeholderTextColor={colors.textSub}
              style={[styles.rawInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <Text style={[styles.rawHelp, { color: colors.textSub }]}>※ 실제 파싱 연결은 추후 구현 예정</Text>
            <View style={styles.rawActions}>
              <TouchableOpacity onPress={() => setRawModalVisible(false)} style={[styles.rawCancelBtn, { backgroundColor: colors.muted }]}>
                <Text style={[styles.rawCancelText, { color: colors.textSub }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveRawData} style={[styles.rawSaveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.rawSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.monthChips}>
          {trackerMonthlyData.map((item, index) => (
            <TouchableOpacity
              key={item.month}
              onPress={() => {
                setSelectedIdx(index);
                setSelectedSliceKey(null);
              }}
              style={[
                styles.monthChip,
                {
                  backgroundColor: index === selectedIdx ? colors.primary : colors.card,
                  borderColor: index === selectedIdx ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.monthChipText, { color: index === selectedIdx ? "#FFF" : colors.textSub }]}>
                {item.displayLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {!hasTrackerRows && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>등록된 자산 데이터가 없어요</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSub }]}>Firebase tracker 읽기는 성공했지만 표시할 월별 자산 스냅샷이 없습니다.</Text>
        </View>
      )}

      <View style={[styles.modeToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        {(["category", "ticker"] as AssetViewMode[]).map((mode) => {
          const active = viewMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => {
                setViewMode(mode);
                setSelectedSliceKey(null);
              }}
              style={[
                styles.modeButton,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.modeButtonText, { color: active ? "#FFF" : colors.textSub }]}>
                {mode === "category" ? "자산군별" : "종목별"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.donutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <DonutChart items={breakdown} total={data.totalAsset} selectedKey={selectedSliceKey} onSelectItem={toggleSlice} />
        <View style={styles.legendWrap}>
          {breakdown.map((item) => (
            <TouchableOpacity
              key={item.name}
              onPress={() => toggleSlice(item.name)}
              activeOpacity={0.75}
              style={[
                styles.legendItem,
                selectedSliceKey === item.name && { backgroundColor: item.color + "18", borderColor: item.color + "55" },
              ]}
            >
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: colors.textSub }]} numberOfLines={2}>
                {item.name} {item.ratio.toFixed(1)}%({formatCompactAssetAmount(item.amount)})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="비중 리스트" subtitle="종목 또는 항목 단위 비중" />
        <View style={[styles.tagCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {breakdown.map((item, index) => (
            <View key={item.name}>
              {index > 0 && <View style={[styles.tagDivider, { backgroundColor: colors.border }]} />}
              <TouchableOpacity
                onPress={() => toggleSlice(item.name)}
                activeOpacity={0.72}
                style={[
                  styles.tagRow,
                  selectedSliceKey === item.name && {
                    backgroundColor: item.color + "20",
                  },
                ]}
              >
                <View style={styles.tagLeft}>
                  <View
                    style={[
                      styles.tagDot,
                      {
                        backgroundColor: item.color,
                        borderColor: selectedSliceKey === item.name ? item.color : "transparent",
                      },
                      selectedSliceKey === item.name && styles.tagDotActive,
                    ]}
                  />
                  <Text style={[selectedSliceKey === item.name ? styles.tagNameActive : styles.tagName, { color: colors.text }]}>{item.name}</Text>
                </View>
                <View style={styles.tagRight}>
                  <Text style={[styles.tagAmount, { color: colors.text }]}>{formatKRW(item.amount)}</Text>
                  <View style={[styles.ratioBg, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.ratioFill,
                        { width: `${Math.min(item.ratio, 100)}%` as `${number}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.ratioText, { color: colors.textSub }]}>{item.ratio.toFixed(1)}%</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="기간별 추이"
          subtitle={viewMode === "category" ? "자산군별 누적 흐름" : "종목별 누적 흐름"}
        />
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <StackedAreaChart
            data={stackedData}
            keys={stackKeys}
            colorsByKey={colorMap}
            height={196}
            gridColor={colors.border}
            axisColor={colors.textSub}
            selectedKey={selectedSliceKey}
          />
          <View style={styles.stackLegendWrap}>
            {stackKeys.map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleSlice(key)}
                activeOpacity={0.75}
                style={[
                  styles.stackLegendItem,
                  selectedSliceKey === key && { backgroundColor: (colorMap[key] ?? colorForName(key)) + "18" },
                ]}
              >
                <View style={[styles.legendDot, { backgroundColor: colorMap[key] ?? colorForName(key) }]} />
                <Text style={[styles.legendText, { color: colors.textSub }]} numberOfLines={1}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedSliceKey && (
            <SelectedItemPeriodDetail
              selectedKey={selectedSliceKey}
              stackedData={stackedData}
              trackerMonthlyData={trackerMonthlyData}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function SelectedItemPeriodDetail({
  selectedKey,
  stackedData,
  trackerMonthlyData,
}: {
  selectedKey: string;
  stackedData: StackDatum[];
  trackerMonthlyData: AssetMonthly[];
}) {
  const colors = useColors();
  const rows = stackedData.map((datum, idx) => {
    const amount = datum.values[selectedKey] ?? 0;
    const totalAsset = trackerMonthlyData[idx]?.totalAsset ?? 0;
    const ratio = totalAsset > 0 ? (amount / totalAsset) * 100 : 0;
    return { label: datum.label, amount, ratio };
  });

  if (rows.length === 0 || rows.every((r) => r.amount === 0)) {
    return (
      <View style={detailStyles.container}>
        <Text style={[detailStyles.title, { color: colors.text }]}>선택 항목 기간별 상세</Text>
        <Text style={[detailStyles.emptyText, { color: colors.textSub }]}>선택 항목의 기간별 데이터가 없어요</Text>
      </View>
    );
  }

  return (
    <View style={detailStyles.container}>
      <Text style={[detailStyles.title, { color: colors.text }]}>선택 항목 기간별 상세</Text>
      <Text style={[detailStyles.subtitle, { color: colors.textSub }]}>각 월 총자산 대비 비중이에요</Text>
      <View style={[detailStyles.headerRow, { borderBottomColor: colors.border }]}>
        <Text style={[detailStyles.headerCell, { color: colors.textSub, flex: 1 }]}>기간</Text>
        <Text style={[detailStyles.headerCell, { color: colors.textSub, flex: 1.2, textAlign: "right" }]}>금액</Text>
        <Text style={[detailStyles.headerCell, { color: colors.textSub, flex: 0.8, textAlign: "right" }]}>비중</Text>
      </View>
      <ScrollView style={detailStyles.scroll} nestedScrollEnabled showsVerticalScrollIndicator>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[detailStyles.row, { borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "30" }]}
          >
            <Text style={[detailStyles.cell, { color: colors.secondary, flex: 1 }]}>{row.label}</Text>
            <Text style={[detailStyles.cell, { color: colors.text, flex: 1.2, textAlign: "right" }]}>{formatCompactAssetAmount(row.amount)}</Text>
            <Text style={[detailStyles.cell, { color: colors.textSub, flex: 0.8, textAlign: "right" }]}>{row.ratio.toFixed(1)}%</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  container: { marginTop: 12, gap: 4 },
  title: { fontSize: 12, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 4 },
  emptyText: { fontSize: 11, fontFamily: "Inter_400Regular", paddingVertical: 8 },
  headerRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, paddingHorizontal: 4 },
  headerCell: { fontSize: 10, fontFamily: "Inter_700Bold" },
  scroll: { maxHeight: 200 },
  row: { flexDirection: "row", paddingVertical: 6, borderTopWidth: 1, paddingHorizontal: 4 },
  cell: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

function getCategoryBreakdown(data: AssetMonthly): BreakdownItem[] {
  return sortBreakdownItems(data.tags.map((tag) => ({
    name: tag.name,
    amount: tag.amount,
    ratio: tag.ratio,
    color: CATEGORY_COLORS[tag.name] ?? colorForName(tag.name),
  })));
}

function getTickerBreakdown(data: AssetMonthly, tickerBreakdownByMonth: TrackerTickerBreakdown): BreakdownItem[] {
  const rows = tickerBreakdownByMonth[data.month] ?? [];
  return sortBreakdownItems(rows.map((item) => ({
    name: item.name,
    amount: item.amount,
    ratio: data.totalAsset ? (item.amount / data.totalAsset) * 100 : 0,
    color: TICKER_COLORS[item.name] ?? colorForName(item.name),
  })));
}

function getStackedData(mode: AssetViewMode, months: AssetMonthly[], tickerBreakdownByMonth: TrackerTickerBreakdown): StackDatum[] {
  return months.map((item) => {
    const breakdown = mode === "category" ? getCategoryBreakdown(item) : getTickerBreakdown(item, tickerBreakdownByMonth);
    return {
      label: item.displayLabel,
      values: breakdown.reduce<Record<string, number>>((acc, part) => {
        acc[part.name] = part.amount;
        return acc;
      }, {}),
    };
  });
}

function getStackKeys(stackedData: StackDatum[], currentBreakdown: BreakdownItem[]) {
  const totals = new Map<string, number>();
  stackedData.forEach((row) => {
    Object.entries(row.values).forEach(([key, amount]) => {
      totals.set(key, (totals.get(key) ?? 0) + amount);
    });
  });
  currentBreakdown.forEach((item) => {
    if (!totals.has(item.name)) {
      totals.set(item.name, item.amount);
    }
  });
  return sortBreakdownItems(Array.from(totals, ([name, amount]) => ({ name, amount }))).map((item) => item.name);
}

function buildColorMap(keys: string[]) {
  return keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = (CATEGORY_COLORS[key] ?? TICKER_COLORS[key] ?? colorForName(key));
    return acc;
  }, {});
}

function getAssetType(name: string): StreamlitAssetType {
  const upper = name.trim().toUpperCase();
  const lower = name.trim().toLowerCase();

  if (/(현금|예금|적금|채권|연두|cash|krw|sgov|cma|mmf|rp)/i.test(name)) {
    return "cash";
  }
  if (/(달러|usd|dollar)/i.test(name)) {
    return "dollar";
  }
  if (["TQQQ", "QLD", "UPRO", "SOXL", "TECL", "FNGU", "BULZ", "SSO"].includes(upper) || /레버리지|2x|3x/.test(lower)) {
    return "leverage";
  }
  if (["QQQ", "QQQM"].includes(upper) || /나스닥|nasdaq/.test(lower)) {
    return "nasdaq";
  }
  if (["SPY", "VOO", "IVV", "SPLG"].includes(upper) || /s&p|sp500|snp/.test(lower)) {
    return "spy";
  }
  if (
    ["MSFT", "SCHD", "VYM", "DGRO", "AAPL", "KO", "JNJ", "PG", "VTI", "VTV", "VUG", "DIA"].includes(upper) ||
    /배당|dividend/.test(lower)
  ) {
    return "dividend";
  }

  return "other";
}

function getSuperGroup(type: StreamlitAssetType): StreamlitSuperGroup {
  if (type === "spy" || type === "dividend") return "spy_div";
  if (type === "cash" || type === "dollar") return "cash_dol";
  if (type === "leverage" || type === "nasdaq") return "lev_nas";
  return "other_grp";
}

function sortBreakdownItems<T extends { name: string; amount: number }>(entries: T[]) {
  const superGroupTotals = new Map<StreamlitSuperGroup, number>();
  const typeTotals = new Map<StreamlitAssetType, number>();

  entries.forEach((item) => {
    const type = getAssetType(item.name);
    const group = getSuperGroup(type);
    superGroupTotals.set(group, (superGroupTotals.get(group) ?? 0) + item.amount);
    typeTotals.set(type, (typeTotals.get(type) ?? 0) + item.amount);
  });

  return [...entries].sort((a, b) => {
    const aType = getAssetType(a.name);
    const bType = getAssetType(b.name);
    const groupDiff = (superGroupTotals.get(getSuperGroup(bType)) ?? 0) - (superGroupTotals.get(getSuperGroup(aType)) ?? 0);
    if (groupDiff !== 0) return groupDiff;
    const typeDiff = (typeTotals.get(bType) ?? 0) - (typeTotals.get(aType) ?? 0);
    if (typeDiff !== 0) return typeDiff;
    return b.amount - a.amount || a.name.localeCompare(b.name);
  });
}

function colorForName(name: string) {
  const type = getAssetType(name);
  if (type !== "other") {
    return STREAMLIT_ASSET_COLORS[type];
  }

  const sum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return OTHER_ASSET_COLORS[sum % OTHER_ASSET_COLORS.length] ?? OTHER_ASSET_COLORS[0];
}

function formatCompactAssetAmount(amount: number) {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (amount >= 10000) {
    return `${Math.round(amount / 10000)}만`;
  }
  return `${Math.round(amount).toLocaleString()}원`;
}

function getTrackerSourceText({
  hasLoginEmail,
  isLoading,
  isUsingFirebaseTracker,
  isFirebaseTrackerEmpty,
  isFirebaseTrackerFailed,
}: {
  hasLoginEmail: boolean;
  isLoading: boolean;
  isUsingFirebaseTracker: boolean;
  isFirebaseTrackerEmpty: boolean;
  isFirebaseTrackerFailed: boolean;
}) {
  if (!hasLoginEmail) return "로컬 더미 자산 데이터 사용 중";
  if (isLoading) return "Firebase 자산 데이터 읽는 중";
  if (isUsingFirebaseTracker) return "Firebase 자산 데이터 사용 중";
  if (isFirebaseTrackerEmpty) return "등록된 Firebase 자산 데이터 없음";
  if (isFirebaseTrackerFailed) return "자산 데이터 읽기 실패, 더미 사용 중";
  return "로컬 더미 자산 데이터 사용 중";
}

function formatAxisKRW(amount: number): string {
  if (amount >= 100000000) {
    const value = amount / 100000000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}억`;
  }
  if (amount >= 10000) return `${Math.round(amount / 10000)}만`;
  return amount.toLocaleString();
}

function DonutChart({
  items,
  total,
  selectedKey,
  onSelectItem,
}: {
  items: BreakdownItem[];
  total: number;
  selectedKey: string | null;
  onSelectItem: (key: string) => void;
}) {
  const colors = useColors();
  const size = 180;
  const strokeWidth = 18;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  let hitAngle = -90;
  const hitTargets = items.map((item) => {
    const angleSize = item.ratio * 3.6;
    const angle = hitAngle + angleSize / 2;
    hitAngle += angleSize;
    const rad = (angle * Math.PI) / 180;
    return {
      key: item.name,
      left: 90 + Math.cos(rad) * radius,
      top: 90 + Math.sin(rad) * radius,
    };
  });

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size} viewBox="0 0 180 180">
        <Circle cx="90" cy="90" r={radius} stroke={colors.muted} strokeWidth={strokeWidth} fill="none" />
        {items.map((item) => {
          const arc = circumference * (item.ratio / 100);
          const dashOffset = -offset;
          offset += arc;
          return (
            <Circle
              key={item.name}
              cx="90"
              cy="90"
              r={radius}
              stroke={item.color}
              strokeWidth={selectedKey === item.name ? strokeWidth + 5 : strokeWidth}
              fill="none"
              strokeDasharray={`${arc} ${circumference - arc}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              transform="rotate(-90 90 90)"
              opacity={selectedKey && selectedKey !== item.name ? 0.46 : 1}
              onPress={() => onSelectItem(item.name)}
            />
          );
        })}
      </Svg>
      {hitTargets.map((target) => (
        <Pressable
          key={`hit-${target.key}`}
          onPress={() => onSelectItem(target.key)}
          style={[
            styles.donutHit,
            {
              left: target.left - 22,
              top: target.top - 22,
            },
          ]}
        />
      ))}
      <View style={styles.donutCenter}>
        <Text style={[styles.donutLabel, { color: colors.textSub }]}>총자산</Text>
        <Text style={[styles.donutValue, { color: colors.text }]}>{formatKRW(total)}</Text>
      </View>
    </View>
  );
}

function StackedAreaChart({
  data,
  keys,
  colorsByKey,
  height,
  gridColor,
  axisColor,
  selectedKey,
}: {
  data: StackDatum[];
  keys: string[];
  colorsByKey: Record<string, string>;
  height: number;
  gridColor: string;
  axisColor: string;
  selectedKey: string | null;
}) {
  if (data.length === 0 || keys.length === 0) {
    return <View style={[styles.stackedChartWrap, { height }]} />;
  }

  const width = 340;
  const axisWidth = 46;
  const padTop = 12;
  const padRight = 8;
  const padBottom = 28;
  const plotWidth = width - axisWidth - padRight;
  const plotHeight = height - padTop - padBottom;
  const totals = data.map((row) => keys.reduce((sum, key) => sum + (row.values[key] ?? 0), 0));
  const maxValue = Math.max(...totals, 1) * 1.08;
  const stepCount = 4;
  const xFor = (index: number) => axisWidth + (data.length <= 1 ? 0 : (plotWidth * index) / (data.length - 1));
  const yFor = (value: number) => padTop + plotHeight - (value / maxValue) * plotHeight;

  const cumulativeBottom = data.map(() => 0);
  const areas = keys.map((key) => {
    const topPoints = data.map((row, index) => {
      const bottom = cumulativeBottom[index];
      const top = bottom + (row.values[key] ?? 0);
      cumulativeBottom[index] = top;
      return { x: xFor(index), y: yFor(top) };
    });
    const bottomPoints = data
      .map((_, index) => {
        const lowerValue = cumulativeBottom[index] - (data[index].values[key] ?? 0);
        return { x: xFor(index), y: yFor(lowerValue) };
      })
      .reverse();
    const path = [
      `M ${topPoints[0].x} ${topPoints[0].y}`,
      ...topPoints.slice(1).map((point) => `L ${point.x} ${point.y}`),
      ...bottomPoints.map((point) => `L ${point.x} ${point.y}`),
      "Z",
    ].join(" ");
    return { key, path };
  });

  const topLinePath = data
    .map((_, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(totals[index])}`)
    .join(" ");

  return (
    <View style={styles.stackedChartWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {Array.from({ length: stepCount + 1 }).map((_, index) => {
          const value = (maxValue / stepCount) * (stepCount - index);
          const y = yFor(value);
          return (
            <React.Fragment key={`grid-${index}`}>
              <Line x1={axisWidth} x2={width - padRight} y1={y} y2={y} stroke={gridColor} strokeWidth="1" opacity={0.55} />
              <SvgText x={0} y={y + 4} fill={axisColor} fontSize="9" fontWeight="500">
                {formatAxisKRW(value)}
              </SvgText>
            </React.Fragment>
          );
        })}
        {areas.map((area) => (
          <Path
            key={area.key}
            d={area.path}
            fill={colorsByKey[area.key] ?? colorForName(area.key)}
            opacity={selectedKey && selectedKey !== area.key ? 0.32 : 0.78}
            stroke={selectedKey === area.key ? "#3D2B1F" : "none"}
            strokeWidth={selectedKey === area.key ? 1.2 : 0}
          />
        ))}
        <Path d={topLinePath} fill="none" stroke="#5F452D" strokeWidth="1.4" opacity={0.58} />
        <Line x1={axisWidth} x2={axisWidth} y1={padTop} y2={padTop + plotHeight} stroke={gridColor} strokeWidth="1" />
        {data.map((row, index) => (
          <SvgText
            key={row.label}
            x={xFor(index)}
            y={height - 8}
            fill={axisColor}
            fontSize="9"
            fontWeight="600"
            textAnchor="middle"
          >
            {row.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  pageHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pageHeaderText: { flex: 1, gap: 3 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sourceText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  settingsBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(31, 21, 12, 0.35)", justifyContent: "flex-end" },
  rawModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  rawModalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  rawInput: { minHeight: 210, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, lineHeight: 19, fontFamily: "Inter_500Medium" },
  rawHelp: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rawActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  rawCancelBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  rawCancelText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  rawSaveBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  rawSaveText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  monthChips: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  monthChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modeToggle: { flexDirection: "row", borderWidth: 1, borderRadius: 14, padding: 4, gap: 6 },
  modeButton: { flex: 1, alignItems: "center", borderRadius: 11, borderWidth: 1, paddingVertical: 8 },
  modeButtonText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  donutCard: {
    borderRadius: 16, padding: 16, borderWidth: 1, gap: 14,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  donutWrap: { alignSelf: "center", width: 180, height: 180, alignItems: "center", justifyContent: "center" },
  donutHit: { position: "absolute", width: 44, height: 44, borderRadius: 22 },
  donutCenter: { position: "absolute", alignItems: "center", gap: 3 },
  donutLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  donutValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  legendWrap: { flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3, width: "47%", minHeight: 30, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7, borderWidth: 1, borderColor: "transparent" },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, fontSize: 10, lineHeight: 14, fontFamily: "Inter_500Medium" },
  section: { gap: 12 },
  tagCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  tagDivider: { height: 1, marginHorizontal: 14 },
  tagRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11 },
  tagLeft: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1 },
  tagDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 0 },
  tagDotActive: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, backgroundColor: "#FFF" },
  tagName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  tagNameActive: { fontSize: 13, fontFamily: "Inter_700Bold" },
  tagRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  tagAmount: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 70, textAlign: "right" },
  ratioBg: { width: 60, height: 6, borderRadius: 6, overflow: "hidden" },
  ratioFill: { height: 6, borderRadius: 6 },
  ratioText: { fontSize: 11, fontFamily: "Inter_400Regular", width: 38, textAlign: "right" },
  chartCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  stackedChartWrap: { width: "100%", minHeight: 196 },
  stackLegendWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stackLegendItem: { flexDirection: "row", alignItems: "center", gap: 5, width: "30%", minHeight: 28, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
});
