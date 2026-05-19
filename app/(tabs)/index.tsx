import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { NoteCard } from "@/components/NoteCard";
import { SectionHeader } from "@/components/SectionHeader";
import { homeSummary, notesData, formatKRW, calendarEvents, EVENT_COLORS } from "@/data/dummyData";

const QUICK_ACTIONS = [
  { icon: "calendar" as const, label: "캘린더", route: "/(tabs)/calendar" as const },
  { icon: "briefcase" as const, label: "자산", route: "/(tabs)/asset" as const },
  { icon: "bar-chart-2" as const, label: "시뮬레이터", route: "/(tabs)/simulator" as const },
  { icon: "percent" as const, label: "계산기", route: "/(tabs)/calculator" as const },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // Upcoming events within 7 days
  const upcoming = calendarEvents.filter((e) => {
    const d = Math.ceil((new Date(e.date).getTime() - today.getTime()) / 86400000);
    return d >= 0 && d <= 7;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const { stats, todayMessage, urgentEvent } = homeSummary;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 헤더 */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.date, { color: colors.textSub }]}>{dateStr}</Text>
          <Text style={[styles.greeting, { color: colors.text }]}>안녕하세요, 고라니님! 🦌</Text>
        </View>
        <View style={styles.topRight}>
          <View style={[styles.marketBadge, { backgroundColor: colors.positive + "20" }]}>
            <View style={[styles.dot, { backgroundColor: colors.positive }]} />
            <Text style={[styles.marketText, { color: colors.positive }]}>장 열림</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings")}
            style={[styles.gearBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="settings" size={18} color={colors.textSub} />
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI 카드 2x2 */}
      <View style={styles.kpiGrid}>
        {[
          { label: "이번 달 일정", value: `${stats.thisMonthEventCount}건`, icon: "calendar" as const },
          { label: "등록 티커", value: `${stats.registeredTickers}개`, icon: "star" as const },
          { label: "총 자산 (더미)", value: formatKRW(stats.totalAsset), icon: "briefcase" as const, small: true },
          { label: "최종 실질잔고 (더미)", value: formatKRW(stats.finalRealBalance), icon: "trending-up" as const, small: true },
        ].map((item, i) => (
          <View key={i} style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name={item.icon} size={14} color={colors.primary} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text, fontSize: item.small ? 15 : 18 }]} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSub }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* 배당락 임박 배너 */}
      {urgentEvent && (
        <View style={[styles.banner, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "38" }]}>
          <Feather name="bell" size={14} color={colors.primary} />
          <Text style={[styles.bannerText, { color: colors.secondary }]}>
            {urgentEvent.daysUntil === 1 ? "내일" : `D-${urgentEvent.daysUntil}`} {urgentEvent.ticker} {urgentEvent.event}이에용 🦌 전략 확인해보세용!
          </Text>
        </View>
      )}

      {/* 오늘의 한마디 */}
      <View style={[styles.todayCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "26" }]}>
        <Feather name="message-circle" size={15} color={colors.primary} />
        <Text style={[styles.todayText, { color: colors.secondary }]}>{todayMessage}</Text>
      </View>

      {/* 빠른 이동 */}
      <View style={styles.section}>
        <SectionHeader title="빠른 이동" />
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.route}
              onPress={() => router.push(a.route)}
              activeOpacity={0.75}
              style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name={a.icon} size={20} color={colors.primary} />
              <Text style={[styles.quickLabel, { color: colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 임박 일정 */}
      {upcoming.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="임박 일정" subtitle="7일 이내 일정이에요" />
          <View style={styles.list}>
            {upcoming.slice(0, 3).map((ev) => {
              const diff = Math.ceil((new Date(ev.date).getTime() - today.getTime()) / 86400000);
              const col = EVENT_COLORS[ev.eventType];
              return (
                <View key={ev.id} style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: col, borderLeftWidth: 3 }]}>
                  <View style={styles.eventInfo}>
                    <Text style={[styles.eventTicker, { color: colors.secondary }]}>{ev.ticker}</Text>
                    <Text style={[styles.eventTitle, { color: colors.text }]}>{ev.shortLabel}</Text>
                    {ev.dividendAmount ? (
                      <Text style={[styles.eventSub, { color: colors.textSub }]}>${ev.dividendAmount}/주 · 연{ev.annualYield}%</Text>
                    ) : null}
                  </View>
                  <View style={[styles.dDayBadge, { backgroundColor: diff <= 1 ? col : col + "22" }]}>
                    <Text style={[styles.dDay, { color: diff <= 1 ? "#FFF" : col }]}>
                      {diff === 0 ? "D-Day" : `D-${diff}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 최근 메모 */}
      <View style={styles.section}>
        <SectionHeader title="최근 메모" subtitle="최근에 작성한 메모에요" />
        <View style={styles.list}>
          {notesData.slice(0, 2).map((n) => (
            <NoteCard key={n.id} title={n.title} content={n.content} updatedAt={n.updatedAt} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 3 },
  greeting: { fontSize: 21, fontFamily: "Inter_700Bold" },
  topRight: { gap: 7, alignItems: "flex-end" },
  marketBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  marketText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  gearBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: {
    width: "47%", borderRadius: 14, padding: 14, borderWidth: 1, gap: 6,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  kpiIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  kpiValue: { fontFamily: "Inter_700Bold" },
  kpiLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  banner: { borderRadius: 13, padding: 13, borderWidth: 1.5, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  bannerText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19, flex: 1 },
  todayCard: { borderRadius: 13, padding: 13, borderWidth: 1, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  todayText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 21, flex: 1 },
  section: { gap: 12 },
  quickRow: { flexDirection: "row", gap: 9 },
  quickCard: {
    flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: "center", gap: 7,
    borderWidth: 1, shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  quickLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  list: { gap: 9 },
  eventRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, borderWidth: 1, gap: 10 },
  eventInfo: { flex: 1, gap: 2 },
  eventTicker: { fontSize: 11, fontFamily: "Inter_700Bold" },
  eventTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  eventSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dDayBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dDay: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
