import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { CalendarGrid } from "@/components/CalendarGrid";
import { SectionHeader } from "@/components/SectionHeader";
import {
  calendarEvents, portfolioTickers,
  EventType, EVENT_COLORS,
  CalendarEvent, PortfolioTicker,
} from "@/data/dummyData";

// ─── 이벤트 타입 필터 옵션 ───────────────────────────────────────
const TYPE_OPTIONS: { label: string; value: EventType | "ALL" }[] = [
  { label: "전체", value: "ALL" },
  { label: "Ex-Div", value: "Ex-Div" },
  { label: "Buy",    value: "Buy" },
  { label: "Pay",    value: "Pay" },
  { label: "Earn",   value: "Earn" },
];

const PORTFOLIO_OPTIONS = ["전체", "배당주", "SGOV", "관심종목"];

// ─── 티커 상태 (star / heart / alertEnabled) ────────────────────
type TickerStates = Record<string, { star: boolean; heart: boolean; alertEnabled: boolean }>;

function initTickerStates(): TickerStates {
  const map: TickerStates = {};
  portfolioTickers.forEach((t) => {
    map[t.ticker] = { star: t.star, heart: t.heart, alertEnabled: t.alertEnabled };
  });
  return map;
}

// ─── 작은 이모지 토글 버튼 ──────────────────────────────────────
function ToggleIconBtn({
  icon, active, activeColor, onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.iconBtn, { backgroundColor: active ? activeColor + "18" : colors.muted }]}
    >
      <Feather name={icon} size={14} color={active ? activeColor : colors.textSub} />
    </TouchableOpacity>
  );
}

// ─── 종목 메모 확장 카드 ─────────────────────────────────────────
function TickerMemoCard({
  ticker, states, onToggle,
}: {
  ticker: PortfolioTicker;
  states: TickerStates;
  onToggle: (ticker: string, field: "star" | "heart" | "alertEnabled") => void;
}) {
  const colors = useColors();
  const st = states[ticker.ticker];
  const evCount = calendarEvents.filter((e) => e.ticker === ticker.ticker).length;

  return (
    <View style={[styles.memoCard, { backgroundColor: colors.primary + "09", borderColor: colors.primary + "30" }]}>
      <View style={styles.memoCardHeader}>
        <View style={styles.memoCardLeft}>
          <Text style={[styles.memoCardTicker, { color: colors.secondary }]}>{ticker.ticker}</Text>
          <Text style={[styles.memoCardName, { color: colors.text }]}>{ticker.name}</Text>
        </View>
        <View style={styles.memoCardActions}>
          <ToggleIconBtn icon="star" active={st.star} activeColor="#F5B731" onPress={() => onToggle(ticker.ticker, "star")} />
          <ToggleIconBtn icon="heart" active={st.heart} activeColor="#E07B6A" onPress={() => onToggle(ticker.ticker, "heart")} />
          <ToggleIconBtn icon="bell" active={st.alertEnabled} activeColor={colors.primary} onPress={() => onToggle(ticker.ticker, "alertEnabled")} />
        </View>
      </View>
      <Text style={[styles.memoCardBody, { color: colors.textSub }]}>{ticker.memo}</Text>
      <View style={[styles.memoCardFooter, { borderTopColor: colors.border }]}>
        <Feather name="calendar" size={12} color={colors.textSub} />
        <Text style={[styles.memoCardFooterText, { color: colors.textSub }]}>등록 일정 {evCount}건</Text>
        {st.alertEnabled && (
          <View style={[styles.alertOnBadge, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="bell" size={10} color={colors.primary} />
            <Text style={[styles.alertOnText, { color: colors.primary }]}>알림 ON</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── 메인 화면 ──────────────────────────────────────────────────
export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().split("T")[0]);
  const [eventFilter, setEventFilter] = useState<EventType | "ALL">("ALL");

  // 포트폴리오 관리 상태
  const [portfolioFilter, setPortfolioFilter] = useState<string>("전체");
  const [tickerStates, setTickerStates] = useState<TickerStates>(initTickerStates);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [alertToast, setAlertToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 정렬 상태
  const [sortAsc, setSortAsc] = useState(true);

  // 월 이동
  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDate(today.toISOString().split("T")[0]);
  };

  // 토글 핸들러
  const handleToggle = useCallback(
    (ticker: string, field: "star" | "heart" | "alertEnabled") => {
      setTickerStates((prev) => ({
        ...prev,
        [ticker]: { ...prev[ticker], [field]: !prev[ticker][field] },
      }));
      if (field === "alertEnabled") {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setAlertToast(ticker);
        toastTimerRef.current = setTimeout(() => setAlertToast(null), 2000);
      }
    },
    []
  );

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // 필터된 포트폴리오 티커
  const filteredTickers = portfolioTickers.filter(
    (t) => portfolioFilter === "전체" || t.portfolioName === portfolioFilter
  );

  // 선택 날짜 이벤트
  const selectedEvents = selectedDate
    ? calendarEvents.filter((e) => e.date === selectedDate)
    : [];

  // 전체 일정 (필터 + 정렬)
  const allFiltered = calendarEvents
    .filter((e) => eventFilter === "ALL" || e.eventType === eventFilter)
    .sort((a, b) => sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 타이틀 ── */}
      <View style={styles.pageHeader}>
        <Text style={[styles.title, { color: colors.text }]}>투자 캘린더</Text>
        <Text style={[styles.subtitle, { color: colors.textSub }]}>일정을 한눈에 확인해보세용 🦌</Text>
      </View>

      {/* ── 이벤트 타입 범례 ── */}
      <View style={styles.legendRow}>
        {(["Ex-Div", "Buy", "Pay", "Earn"] as EventType[]).map((t) => (
          <View key={t} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EVENT_COLORS[t] }]} />
            <Text style={[styles.legendText, { color: colors.textSub }]}>{t}</Text>
          </View>
        ))}
      </View>

      {/* ── 캘린더 카드 ── */}
      <View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* 월 네비게이션 */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { backgroundColor: colors.muted }]}>
            <Feather name="chevron-left" size={17} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToday} style={[styles.todayBtn, { borderColor: colors.border }]}>
            <Text style={[styles.todayBtnText, { color: colors.secondary }]}>TODAY</Text>
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{year}년 {month}월</Text>
          <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { backgroundColor: colors.muted }]}>
            <Feather name="chevron-right" size={17} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* 이벤트 타입 필터 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {TYPE_OPTIONS.map((opt) => {
              const isActive = eventFilter === opt.value;
              const col = opt.value !== "ALL" ? EVENT_COLORS[opt.value as EventType] : colors.primary;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setEventFilter(opt.value)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: isActive ? col : colors.muted, borderColor: isActive ? col : colors.border },
                  ]}
                >
                  <Text style={[styles.filterText, { color: isActive ? "#FFF" : colors.textSub }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* 캘린더 그리드 */}
        <CalendarGrid
          year={year}
          month={month}
          events={calendarEvents}
          selectedDate={selectedDate}
          filter={eventFilter}
          onSelectDate={setSelectedDate}
        />

        {/* 선택 날짜 이벤트 — 있을 때만 작게 표시 */}
        {selectedDate && selectedEvents.length > 0 && (
          <View style={[styles.selectedDateBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Feather name="info" size={12} color={colors.primary} />
            <Text style={[styles.selectedDateText, { color: colors.secondary }]}>
              {parseInt(selectedDate.split("-")[2])}일 · {selectedEvents.length}건 일정
              {selectedEvents.map((e) => ` · ${e.shortLabel}`).join("")}
            </Text>
          </View>
        )}
      </View>

      {/* ──────────────────────────────────────────────────────────
          포트폴리오 관리
      ────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="포트폴리오 관리" subtitle="티커를 눌러 메모를 확인하세요" />

        {/* 포트폴리오 필터 칩 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {PORTFOLIO_OPTIONS.map((opt) => {
              const isActive = portfolioFilter === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setPortfolioFilter(opt)}
                  style={[
                    styles.portfolioChip,
                    { backgroundColor: isActive ? colors.secondary : colors.card, borderColor: isActive ? colors.secondary : colors.border },
                  ]}
                >
                  <Text style={[styles.chipText, { color: isActive ? "#FFF" : colors.textSub }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* 티커 리스트 */}
        <View style={[styles.tickerList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {filteredTickers.map((t, i) => {
            const st = tickerStates[t.ticker];
            const isExpanded = expandedTicker === t.ticker;
            const isLast = i === filteredTickers.length - 1;

            return (
              <View key={t.ticker}>
                {/* 티커 행 */}
                <TouchableOpacity
                  onPress={() => setExpandedTicker(isExpanded ? null : t.ticker)}
                  activeOpacity={0.75}
                  style={[
                    styles.tickerRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    isExpanded && { backgroundColor: colors.primary + "08" },
                  ]}
                >
                  {/* 왼쪽: 티커 정보 */}
                  <View style={styles.tickerLeft}>
                    <View style={styles.tickerTopRow}>
                      <Text style={[styles.tickerCode, { color: colors.secondary }]}>{t.ticker}</Text>
                      <View style={[styles.portfolioPill, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.portfolioPillText, { color: colors.textSub }]}>{t.portfolioName}</Text>
                      </View>
                    </View>
                    <Text style={[styles.tickerName, { color: colors.text }]} numberOfLines={1}>{t.name}</Text>
                    <Text style={[styles.tickerMemoPreview, { color: colors.textSub }]} numberOfLines={1}>{t.memo}</Text>
                  </View>

                  {/* 오른쪽: 토글 아이콘 */}
                  <View style={styles.tickerRight}>
                    <ToggleIconBtn icon="star" active={st.star} activeColor="#F5B731" onPress={() => handleToggle(t.ticker, "star")} />
                    <ToggleIconBtn icon="heart" active={st.heart} activeColor="#E07B6A" onPress={() => handleToggle(t.ticker, "heart")} />
                    <ToggleIconBtn icon="bell" active={st.alertEnabled} activeColor={colors.primary} onPress={() => handleToggle(t.ticker, "alertEnabled")} />
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={colors.textSub}
                    />
                  </View>
                </TouchableOpacity>

                {/* 알림 토스트 */}
                {alertToast === t.ticker && (
                  <View style={[styles.alertToast, { backgroundColor: colors.primary + "14" }]}>
                    <Feather name="bell" size={11} color={colors.primary} />
                    <Text style={[styles.alertToastText, { color: colors.primary }]}>
                      {tickerStates[t.ticker].alertEnabled ? "알림 등록됨" : "알림 해제됨"}
                    </Text>
                  </View>
                )}

                {/* 확장 메모 카드 */}
                {isExpanded && (
                  <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                    <TickerMemoCard ticker={t} states={tickerStates} onToggle={handleToggle} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* ──────────────────────────────────────────────────────────
          전체 일정 리스트
      ────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        {/* 헤더 + 정렬 버튼 */}
        <View style={styles.listHeaderRow}>
          <View>
            <Text style={[styles.listTitle, { color: colors.text }]}>전체 일정</Text>
            <Text style={[styles.listSubtitle, { color: colors.textSub }]}>
              {allFiltered.length}건 · {eventFilter === "ALL" ? "전체" : eventFilter} 필터 적용 중
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSortAsc((v) => !v)}
            style={[styles.sortBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name={sortAsc ? "arrow-up" : "arrow-down"} size={13} color={colors.secondary} />
            <Text style={[styles.sortBtnText, { color: colors.secondary }]}>
              {sortAsc ? "날짜↑" : "날짜↓"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 테이블 */}
        <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* 테이블 헤더 */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.th, { color: colors.textSub, flex: 1.4 }]}>날짜</Text>
            <Text style={[styles.th, { color: colors.textSub, flex: 1   }]}>티커</Text>
            <Text style={[styles.th, { color: colors.textSub, flex: 1.2 }]}>타입</Text>
            <Text style={[styles.th, { color: colors.textSub, flex: 1.2, textAlign: "right" }]}>배당금</Text>
            <Text style={[styles.th, { color: colors.textSub, flex: 1.2, textAlign: "center" }]}>⭐❤️🔔</Text>
          </View>

          {allFiltered.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSub }]}>해당 조건의 일정이 없어요</Text>
          ) : (
            allFiltered.map((ev, idx) => (
              <EventListRow key={ev.id} ev={ev} idx={idx} colors={colors} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── 이벤트 리스트 행 ────────────────────────────────────────────
function EventListRow({ ev, idx, colors }: { ev: CalendarEvent; idx: number; colors: ReturnType<typeof useColors> }) {
  const [star, setStar] = useState(ev.star);
  const [heart, setHeart] = useState(ev.heart);
  const [alert, setAlert] = useState(ev.alertEnabled);

  return (
    <View
      style={[
        styles.tableRow,
        { borderTopColor: colors.border, backgroundColor: idx % 2 === 0 ? "transparent" : colors.muted + "50" },
      ]}
    >
      <Text style={[styles.td, { color: colors.textSub, flex: 1.4 }]}>{ev.date.slice(5).replace("-", "/")}</Text>
      <Text style={[styles.td, { color: colors.secondary, flex: 1, fontFamily: "Inter_700Bold" }]}>{ev.ticker}</Text>
      <View style={{ flex: 1.2 }}>
        <View style={[styles.typePill, { backgroundColor: EVENT_COLORS[ev.eventType] + "22" }]}>
          <Text style={[styles.typeText, { color: EVENT_COLORS[ev.eventType] }]}>{ev.eventType}</Text>
        </View>
      </View>
      <Text style={[styles.td, { color: colors.text, flex: 1.2, textAlign: "right" }]}>
        {ev.dividendAmount ? `$${ev.dividendAmount.toFixed(2)}` : "-"}
      </Text>
      <View style={[styles.rowIcons, { flex: 1.2 }]}>
        <TouchableOpacity onPress={() => setStar((v) => !v)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
          <Feather name="star" size={12} color={star ? "#F5B731" : colors.border} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setHeart((v) => !v)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
          <Feather name="heart" size={12} color={heart ? "#E07B6A" : colors.border} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAlert((v) => !v)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
          <Feather name="bell" size={12} color={alert ? colors.primary : colors.border} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  pageHeader: { gap: 3 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },

  legendRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  calCard: {
    borderRadius: 16, padding: 12, borderWidth: 1,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  navBtn: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  todayBtnText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  monthLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  filterScroll: { marginBottom: 10 },
  filterRow: { flexDirection: "row", gap: 6 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  selectedDateBanner: {
    marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1,
  },
  selectedDateText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },

  section: { gap: 12 },

  // 포트폴리오 관리
  chipRow: { flexDirection: "row", gap: 7, paddingVertical: 2 },
  portfolioChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  tickerList: {
    borderRadius: 16, borderWidth: 1,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  tickerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  tickerLeft: { flex: 1, gap: 3 },
  tickerTopRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  tickerCode: { fontSize: 14, fontFamily: "Inter_700Bold" },
  portfolioPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  portfolioPillText: { fontSize: 9, fontFamily: "Inter_500Medium" },
  tickerName: { fontSize: 11, fontFamily: "Inter_500Medium" },
  tickerMemoPreview: { fontSize: 10, fontFamily: "Inter_400Regular" },
  tickerRight: { flexDirection: "row", alignItems: "center", gap: 7 },
  iconBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  alertToast: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  alertToastText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // 메모 확장 카드
  memoCard: { borderRadius: 12, padding: 13, borderWidth: 1, gap: 9 },
  memoCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  memoCardLeft: { gap: 2, flex: 1 },
  memoCardTicker: { fontSize: 13, fontFamily: "Inter_700Bold" },
  memoCardName: { fontSize: 11, fontFamily: "Inter_500Medium" },
  memoCardActions: { flexDirection: "row", gap: 7 },
  memoCardBody: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  memoCardFooter: { flexDirection: "row", alignItems: "center", gap: 7, borderTopWidth: 1, paddingTop: 8 },
  memoCardFooterText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  alertOnBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  alertOnText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  // 전체 일정 리스트
  listHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  listSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  sortBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  tableCard: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  tableHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1 },
  th: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, alignItems: "center" },
  td: { fontSize: 11, fontFamily: "Inter_400Regular" },
  typePill: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  rowIcons: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", padding: 20 },
});
