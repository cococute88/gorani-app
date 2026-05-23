import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";
import { CALENDAR_EVENT_COLORS } from "@/components/CalendarGrid";
import { TAB_BAR_SAFE_BOTTOM } from "@/constants/layout";
import { calendarEvents, customLinksData, type CalendarEvent, type EventType } from "@/data/dummyData";
import { useAuth } from "@/hooks/useAuth";
import { useDividendCalendarQuery, useFavoriteLinksQuery } from "@/hooks/useRtdbData";
import { deleteFavoriteLink, updateFavoriteLink } from "@/services/rtdbFavoriteLinksWriteService";
import { normalizeDividendCalendar } from "@/utils/normalizeDividendCalendar";

type CustomLink = {
  id: string;
  title: string;
  url: string;
};

type FavoriteLinkCandidate = {
  id?: unknown;
  title?: unknown;
  url?: unknown;
  order?: unknown;
  sortOrder?: unknown;
  index?: unknown;
};

type NormalizedFavoriteLink = CustomLink & {
  storageKey: string;
  order: number | undefined;
  originalIndex: number;
};

// Title priority: title > name > label > text > displayName > linkName > 링크명 > 이름 > 제목
const FAVORITE_TITLE_KEYS = ["title", "name", "label", "text", "displayName", "linkName", "링크명", "이름", "제목"];
const FAVORITE_URL_KEYS = ["url", "href", "link", "value", "링크", "주소"];

const QUICK_ACTIONS = [
  { icon: "calendar" as const, label: "캘린더", href: "/(tabs)/calendar" },
  { icon: "briefcase" as const, label: "자산", href: "/(tabs)/asset" },
  { icon: "bar-chart-2" as const, label: "시뮬레이터", href: "/(tabs)/simulator" },
  { icon: "repeat" as const, label: "매도전환", href: "/(tabs)/calculator", mode: "conversion" },
  { icon: "percent" as const, label: "양도치기", href: "/(tabs)/calculator", mode: "dividendTax" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [linksOpen, setLinksOpen] = useState(true);
  const [links, setLinks] = useState(customLinksData);
  const [firebaseLinkView, setFirebaseLinkView] = useState<NormalizedFavoriteLink[] | null>(null);
  const [editingLink, setEditingLink] = useState<CustomLink | null>(null);
  const [linkTitleDraft, setLinkTitleDraft] = useState("");
  const [linkUrlDraft, setLinkUrlDraft] = useState("");
  const [linkMutationMessage, setLinkMutationMessage] = useState("");
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null);
  const favoriteLinksQuery = useFavoriteLinksQuery(user?.email);
  const dividendCalendarQuery = useDividendCalendarQuery(user?.email);
  const firebaseLinks = useMemo(() => normalizeFavoriteLinks(favoriteLinksQuery.data), [favoriteLinksQuery.data]);
  const firebaseCalendarEvents = useMemo(
    () => normalizeDividendCalendar(dividendCalendarQuery.data),
    [dividendCalendarQuery.data],
  );
  const hasLoginEmail = Boolean(user?.email);
  const isUsingFirebaseLinks = hasLoginEmail && favoriteLinksQuery.isSuccess && firebaseLinks.length > 0;
  const isFirebaseEmpty = hasLoginEmail && favoriteLinksQuery.isSuccess && firebaseLinks.length === 0;
  const isFirebaseFailed = hasLoginEmail && favoriteLinksQuery.isError;
  const isUsingFirebaseCalendar = hasLoginEmail && dividendCalendarQuery.isSuccess && firebaseCalendarEvents.length > 0;
  const isFirebaseCalendarEmpty = hasLoginEmail && dividendCalendarQuery.isSuccess && firebaseCalendarEvents.length === 0;
  const isFirebaseCalendarFailed = hasLoginEmail && dividendCalendarQuery.isError;
  const canEditLocalLinks = !hasLoginEmail || isFirebaseFailed;
  const canEditFirebaseLinks = isUsingFirebaseLinks && Boolean(user?.email);
  const visibleLinks = isUsingFirebaseLinks ? (firebaseLinkView ?? firebaseLinks) : links;
  const scheduleEvents = isUsingFirebaseCalendar
    ? firebaseCalendarEvents
    : isFirebaseCalendarEmpty
      ? []
      : calendarEvents;
  const linkSectionSubtitle = getLinkSectionSubtitle({
    hasLoginEmail,
    isLoading: favoriteLinksQuery.isLoading,
    isUsingFirebaseLinks,
    isFirebaseEmpty,
    isFirebaseFailed,
  });
  const scheduleSectionSubtitle = getCalendarSectionSubtitle({
    hasLoginEmail,
    isLoading: dividendCalendarQuery.isLoading,
    isUsingFirebaseCalendar,
    isFirebaseCalendarEmpty,
    isFirebaseCalendarFailed,
  });

  useEffect(() => {
    setFirebaseLinkView(firebaseLinks);
  }, [firebaseLinks]);

  const today = new Date();
  const todayKey = toDateKey(today);
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const nextTradingDay = getNextTradingDay(today);
  const nextTradingKey = toDateKey(nextTradingDay);
  const todayEvents = scheduleEvents.filter((event) => event.date === todayKey);
  const nextTradingEvents = scheduleEvents.filter((event) => event.date === nextTradingKey);

  const upcoming = scheduleEvents.filter((e) => {
    const d = diffDays(todayKey, e.date);
    return d >= 0 && d <= 7;
  }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);

  const addDummyLink = () => {
    setLinks((prev) => [
      ...prev,
      { id: String(Date.now()), title: `링크 ${prev.length + 1}`, url: "https://example.com" },
    ]);
  };

  const openLinkEditor = (link: CustomLink) => {
    setEditingLink(link);
    setLinkTitleDraft(link.title === "제목 없음" ? "" : link.title);
    setLinkUrlDraft(link.url);
    setLinkMutationMessage("");
  };

  const saveEditedLink = async () => {
    if (!editingLink) return;
    const url = linkUrlDraft.trim();
    const title = linkTitleDraft.trim();
    if (!url) {
      setLinkMutationMessage("URL을 입력해 주세요.");
      return;
    }

    setPendingLinkId(editingLink.id);
    setLinkMutationMessage("");
    try {
      if (isNormalizedFavoriteLink(editingLink) && user?.email) {
        await updateFavoriteLink(user.email, editingLink.storageKey, { title, url });
        setFirebaseLinkView((prev) => (prev ?? firebaseLinks).map((link) => (
          link.id === editingLink.id ? { ...link, title: title || "제목 없음", url } : link
        )));
        await favoriteLinksQuery.refetch();
      } else {
        setLinks((prev) => prev.map((link) => (
          link.id === editingLink.id ? { ...link, title: title || "제목 없음", url } : link
        )));
      }
      setEditingLink(null);
    } catch (error) {
      setLinkMutationMessage(error instanceof Error ? error.message : "링크 수정에 실패했습니다.");
    } finally {
      setPendingLinkId(null);
    }
  };

  const deleteLink = async (link: CustomLink) => {
    setPendingLinkId(link.id);
    setLinkMutationMessage("");
    try {
      if (isNormalizedFavoriteLink(link) && user?.email) {
        await deleteFavoriteLink(user.email, link.storageKey);
        setFirebaseLinkView((prev) => (prev ?? firebaseLinks).filter((item) => item.id !== link.id));
        await favoriteLinksQuery.refetch();
      } else {
        setLinks((prev) => prev.filter((item) => item.id !== link.id));
      }
    } catch (error) {
      setLinkMutationMessage(error instanceof Error ? error.message : "링크 삭제에 실패했습니다.");
    } finally {
      setPendingLinkId(null);
    }
  };

  const confirmDeleteLink = (link: CustomLink) => {
    Alert.alert("링크 삭제", `"${link.title}" 링크를 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => { void deleteLink(link); } },
    ]);
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
      <Modal visible={editingLink !== null} transparent animationType="fade" onRequestClose={() => setEditingLink(null)}>
        <View style={styles.linkModalBackdrop}>
          <View style={[styles.linkModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.linkModalTitle, { color: colors.text }]}>링크 수정</Text>
            <TextInput
              value={linkTitleDraft}
              onChangeText={setLinkTitleDraft}
              placeholder="제목"
              placeholderTextColor={colors.textSub}
              style={[styles.linkModalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <TextInput
              value={linkUrlDraft}
              onChangeText={setLinkUrlDraft}
              placeholder="https://..."
              placeholderTextColor={colors.textSub}
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.linkModalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            {linkMutationMessage ? <Text style={[styles.linkErrorText, { color: colors.destructive }]}>{linkMutationMessage}</Text> : null}
            <View style={styles.linkModalActions}>
              <TouchableOpacity onPress={() => setEditingLink(null)} style={[styles.linkModalCancel, { borderColor: colors.border }]}>
                <Text style={[styles.linkModalBtnText, { color: colors.textSub }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { void saveEditedLink(); }} style={[styles.linkModalSave, { backgroundColor: colors.primary }]}>
                <Text style={[styles.linkModalBtnText, { color: "#FFF" }]}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* 헤더 */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.date, { color: colors.textSub }]}>{dateStr}</Text>
          <Text style={[styles.greeting, { color: colors.text }]}>{hasLoginEmail ? "안녕하세요, 고라니님! 🦌" : "비로그인 상태입니다."}</Text>
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

      {/* 빠른 이동 */}
      <View style={styles.quickSection}>
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => {
                if (a.mode) {
                  router.push({ pathname: a.href, params: { mode: a.mode } } as never);
                } else {
                  router.push(a.href as never);
                }
              }}
              activeOpacity={0.75}
              style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name={a.icon} size={20} color={colors.primary} />
              <Text style={[styles.quickLabel, { color: colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 오늘 / 다음 거래일 일정 */}
      <View style={styles.scheduleGrid}>
        <ScheduleSummaryCard title={`오늘 ${formatDateCompact(todayKey)}`} events={todayEvents} />
        <ScheduleSummaryCard title={`다음날 ${formatDateCompact(nextTradingKey)}`} events={nextTradingEvents} />
      </View>

      {/* 다가오는 일정 */}
      {upcoming.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="다가오는 일정" subtitle="7일 이내 일정이에요" />
          <View style={styles.list}>
            {upcoming.map((ev) => {
              const diff = diffDays(todayKey, ev.date);
              const col = CALENDAR_EVENT_COLORS[ev.eventType];
              return (
                <View key={ev.id} style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: col, borderLeftWidth: 3 }]}>
                  <View style={styles.eventInfo}>
                    <UpcomingEventLine event={ev} color={col} />
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
      {upcoming.length === 0 && (
        <View style={styles.section}>
          <SectionHeader title="다가오는 일정" subtitle={scheduleSectionSubtitle} />
          <Text style={[styles.upcomingEmpty, { color: colors.textSub }]}>일정이 없어요</Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => setLinksOpen((value) => !value)} style={styles.linkTitleBtn}>
            <SectionHeader title="나만의 링크" subtitle={linkSectionSubtitle} />
            <Feather name={linksOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.textSub} />
          </TouchableOpacity>
          {linksOpen && canEditLocalLinks ? (
            <TouchableOpacity onPress={addDummyLink} style={[styles.linkAddBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={14} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>
        {linksOpen ? (
          <View style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {favoriteLinksQuery.isLoading && hasLoginEmail ? (
              <LinkStatusMessage message="Firebase 링크를 읽는 중이에요." />
            ) : isFirebaseEmpty ? (
              <LinkStatusMessage message="등록된 링크가 없어요." />
            ) : (
              <>
                {isUsingFirebaseLinks ? <LinkStatusMessage message="Firebase 링크 표시 중" compact /> : null}
                {isFirebaseFailed ? <LinkStatusMessage message="읽기 실패, 로컬 더미 사용 중" compact /> : null}
                {!hasLoginEmail ? <LinkStatusMessage message="비로그인 상태 · 로그인 후 링크 동기화 가능" compact /> : null}
                {linkMutationMessage && !editingLink ? <LinkStatusMessage message={linkMutationMessage} compact /> : null}
                {visibleLinks.map((link, index) => (
                  <View key={link.id}>
                    {(index > 0 || isUsingFirebaseLinks || isFirebaseFailed || !hasLoginEmail) && (
                      <View style={[styles.linkDivider, { backgroundColor: colors.border }]} />
                    )}
                    <View style={styles.linkRow}>
                      <TouchableOpacity style={styles.linkMain} onPress={() => Linking.openURL(link.url)}>
                        <View style={[styles.linkIcon, { backgroundColor: colors.primary + "15" }]}>
                          <Feather name="link-2" size={14} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.linkTitle, { color: colors.text }]}>{link.title}</Text>
                          <Text style={[styles.linkUrl, { color: colors.textSub }]} numberOfLines={1}>{link.url}</Text>
                        </View>
                      </TouchableOpacity>
                      {(canEditLocalLinks || canEditFirebaseLinks) ? (
                        <View style={styles.linkActions}>
                          <TouchableOpacity
                            onPress={() => openLinkEditor(link)}
                            disabled={pendingLinkId === link.id}
                            style={[styles.linkActionBtn, { backgroundColor: colors.muted }]}
                          >
                            <Feather name="edit-2" size={12} color={colors.textSub} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => confirmDeleteLink(link)}
                            disabled={pendingLinkId === link.id}
                            style={[styles.linkActionBtn, { backgroundColor: colors.muted }]}
                          >
                            <Feather name="trash-2" size={12} color={colors.destructive} />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function normalizeFavoriteLinks(data: unknown): NormalizedFavoriteLink[] {
  if (data === null || data === undefined) {
    return [];
  }

  const isArraySource = Array.isArray(data);
  const entries: Array<[string, unknown]> = isArraySource
    ? data.map((item, index) => [String(index), item])
    : isRecord(data) && getStringValue(data, FAVORITE_URL_KEYS)
      ? [["link", data]]
      : isRecord(data)
        ? Object.entries(data)
        : [];

  if (entries.length === 0 && !Array.isArray(data) && !isRecord(data)) {
    console.warn("[HomeScreen] favorite_links 구조를 해석할 수 없어 빈 배열로 처리합니다.");
    return [];
  }

  const normalized = entries
    .map(([key, value], index) => {
      const candidate = isRecord(value) ? value as FavoriteLinkCandidate : null;
      const simpleUrl = typeof value === "string" ? value.trim() : "";
      const url = simpleUrl || (candidate ? getStringValue(candidate, FAVORITE_URL_KEYS) : "");

      if (!url) {
        return null;
      }

      const candidateTitle = candidate ? getStringValue(candidate, FAVORITE_TITLE_KEYS) : "";
      const title = candidateTitle || (!candidate && !isArraySource ? key : "제목 없음");
      return {
        id: candidate && typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : key || `favorite-${index}`,
        storageKey: key,
        title,
        url,
        order: candidate ? getFavoriteLinkOrder(candidate) : undefined,
        originalIndex: index,
      };
    })
    .filter((link): link is NormalizedFavoriteLink => link !== null);

  const hasOrder = normalized.some((link) => typeof link.order === "number");

  return normalized
    .sort((a, b) => {
      if (!hasOrder) {
        return a.originalIndex - b.originalIndex;
      }

      const aOrder = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.originalIndex - b.originalIndex;
    })
    .map((link) => link);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFavoriteLinkOrder(candidate: FavoriteLinkCandidate) {
  const orderValue = candidate.order ?? candidate.sortOrder ?? candidate.index;
  if (typeof orderValue === "number" && Number.isFinite(orderValue)) {
    return orderValue;
  }
  if (typeof orderValue === "string") {
    const parsed = Number(orderValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getStringValue(candidate: Record<string, unknown>, aliases: string[]) {
  // Priority-based search: iterate through aliases in order and return first match
  const normalized = aliases.map(normalizeFavoriteKey);
  for (const alias of normalized) {
    const entry = Object.entries(candidate).find(([key]) => normalizeFavoriteKey(key) === alias);
    if (entry && typeof entry[1] === "string") {
      const trimmed = entry[1].trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
}

function normalizeFavoriteKey(value: string) {
  return value.toLowerCase().replace(/[\s_-]/g, "");
}

function isNormalizedFavoriteLink(link: CustomLink): link is NormalizedFavoriteLink {
  return "storageKey" in link;
}

function getLinkSectionSubtitle({
  hasLoginEmail,
  isLoading,
  isUsingFirebaseLinks,
  isFirebaseEmpty,
  isFirebaseFailed,
}: {
  hasLoginEmail: boolean;
  isLoading: boolean;
  isUsingFirebaseLinks: boolean;
  isFirebaseEmpty: boolean;
  isFirebaseFailed: boolean;
}) {
  if (!hasLoginEmail) {
    return "비로그인 상태";
  }
  if (isLoading) {
    return "읽는 중";
  }
  if (isUsingFirebaseLinks) {
    return "Firebase 링크 표시 중";
  }
  if (isFirebaseEmpty) {
    return "등록된 링크 없음";
  }
  if (isFirebaseFailed) {
    return "읽기 실패, 로컬 더미 사용 중";
  }
  return "로컬 더미 상태";
}

function getCalendarSectionSubtitle({
  hasLoginEmail,
  isLoading,
  isUsingFirebaseCalendar,
  isFirebaseCalendarEmpty,
  isFirebaseCalendarFailed,
}: {
  hasLoginEmail: boolean;
  isLoading: boolean;
  isUsingFirebaseCalendar: boolean;
  isFirebaseCalendarEmpty: boolean;
  isFirebaseCalendarFailed: boolean;
}) {
  if (!hasLoginEmail) {
    return "비로그인 상태 · 로컬 더미 일정";
  }
  if (isLoading) {
    return "Firebase 일정 읽는 중 · 로컬 더미 일정";
  }
  if (isUsingFirebaseCalendar) {
    return "Firebase 일정 사용 중 · 7일 이내";
  }
  if (isFirebaseCalendarEmpty) {
    return "Firebase 일정 없음";
  }
  if (isFirebaseCalendarFailed) {
    return "일정 읽기 실패 · 로컬 더미 일정";
  }
  return "로컬 더미 일정";
}

function LinkStatusMessage({ message, compact }: { message: string; compact?: boolean }) {
  const colors = useColors();

  return (
    <View style={[styles.linkStatus, compact ? styles.linkStatusCompact : null]}>
      <Text style={[styles.linkStatusText, { color: colors.textSub }]}>{message}</Text>
    </View>
  );
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getNextTradingDay(date: Date) {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6);
  return next;
}

function diffDays(fromKey: string, toKey: string) {
  return Math.round((new Date(`${toKey}T00:00:00`).getTime() - new Date(`${fromKey}T00:00:00`).getTime()) / 86400000);
}

function formatDateCompact(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[date.getDay()]})`;
}

function eventTypeLabel(type: EventType) {
  if (type === "Ex-Div") return "Ex-Div";
  if (type === "Earn") return "Earn";
  if (type === "custom") return "Custom";
  return type;
}

function formatScheduleLine(event: CalendarEvent) {
  if (event.eventType === "custom") {
    return event.customTitle ?? event.memo ?? event.shortLabel;
  }
  return `${event.ticker} ${eventTypeLabel(event.eventType)}`;
}

function ScheduleSummaryCard({
  title,
  events,
}: {
  title: string;
  events: CalendarEvent[];
}) {
  const colors = useColors();
  return (
    <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.scheduleTitle, { color: colors.text }]}>{title}</Text>
      {events.length > 0 ? (
        <View style={styles.scheduleLines}>
          {events.slice(0, 3).map((event) => (
            <Text key={event.id} style={[styles.scheduleEventText, { color: colors.text }]} numberOfLines={1}>
              {formatScheduleLine(event)}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={[styles.scheduleEmpty, { color: colors.textSub }]}>조용해요 🦌</Text>
      )}
    </View>
  );
}

function UpcomingEventLine({ event, color }: { event: CalendarEvent; color: string }) {
  const colors = useColors();
  if (event.eventType === "custom") {
    return (
      <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
        <Text style={{ color }}>{formatDateCompact(event.date)}</Text>
        <Text> · {event.customTitle ?? event.memo ?? event.shortLabel}</Text>
      </Text>
    );
  }

  const typeLabel = eventTypeLabel(event.eventType);
  return (
    <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
      <Text style={{ color }}>{formatDateCompact(event.date)}</Text>
      <Text> · </Text>
      <Text style={{ color }}>{event.ticker}</Text>
      <Text> · </Text>
      <Text style={{ color }}>{typeLabel}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 3 },
  greeting: { fontSize: 21, fontFamily: "Inter_700Bold" },
  topRight: { gap: 7, alignItems: "flex-end" },
  marketBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  marketText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  gearBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scheduleGrid: { flexDirection: "row", gap: 10 },
  scheduleCard: {
    flex: 1, minHeight: 112, borderRadius: 14, padding: 14, borderWidth: 1, gap: 9,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  scheduleTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  scheduleLines: { gap: 5 },
  scheduleEventText: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_600SemiBold" },
  scheduleEmpty: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 },
  section: { gap: 12 },
  quickSection: { gap: 8 },
  quickRow: { flexDirection: "row", flexWrap: "nowrap", gap: 5 },
  quickCard: {
    flex: 1, minWidth: 0, minHeight: 52, borderRadius: 11, paddingVertical: 8, alignItems: "center", justifyContent: "center", gap: 4,
    borderWidth: 1, shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  quickLabel: { fontSize: 9, fontFamily: "Inter_700Bold", textAlign: "center" },
  list: { gap: 6 },
  eventRow: { minHeight: 46, flexDirection: "row", alignItems: "center", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, gap: 8 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 12, lineHeight: 16, fontFamily: "Inter_600SemiBold" },
  upcomingEmpty: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_500Medium" },
  dDayBadge: { minWidth: 48, alignItems: "center", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 14 },
  dDay: { fontSize: 10, fontFamily: "Inter_700Bold" },
  customHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  linkTitleBtn: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  linkAddBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  linkCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  linkDivider: { height: 1, marginLeft: 52 },
  linkStatus: { paddingHorizontal: 12, paddingVertical: 12 },
  linkStatusCompact: { paddingVertical: 9 },
  linkStatusText: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_500Medium" },
  linkRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  linkMain: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  linkIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  linkTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  linkUrl: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  linkActions: { flexDirection: "row", gap: 5 },
  linkActionBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  linkModalBackdrop: { flex: 1, backgroundColor: "#00000045", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  linkModal: { width: "100%", maxWidth: 380, borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  linkModalTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  linkModalInput: { height: 40, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, fontSize: 12, fontFamily: "Inter_500Medium" },
  linkErrorText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  linkModalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  linkModalCancel: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 },
  linkModalSave: { borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 },
  linkModalBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
