import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { CALENDAR_EVENT_COLORS, CalendarGrid } from "@/components/CalendarGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { TAB_BAR_SAFE_BOTTOM } from "@/constants/layout";
import { useAuth } from "@/hooks/useAuth";
import { useDividendCalendarQuery } from "@/hooks/useRtdbData";
import { normalizeDividendCalendar } from "@/utils/normalizeDividendCalendar";
import { writeTickerMemo } from "@/services/rtdbCalendarMemoService";
import {
  CalendarEvent,
  EventType,
  calendarEvents,
  PortfolioTicker,
  portfolioTickers,
} from "@/data/dummyData";

type FilterType = Exclude<EventType, "custom">;
type SortKey = "date" | "ticker" | "eventType";
type SortDir = "asc" | "desc";
type MonthScope = "month" | "all";
type EventMark = { star: boolean; heart: boolean; alertEnabled: boolean };
type TickerTaxInfo = { tax10k: number; savingOnce: number };

const FILTER_OPTIONS: FilterType[] = ["Ex-Div", "Buy", "Earn", "Pay"];
const SCHEDULE_PAGE_SIZE = 50;
const TYPE_LABELS: Record<EventType, string> = {
  "Ex-Div": "Ex-Div",
  Buy: "Buy",
  Pay: "Pay",
  Earn: "Earn",
  custom: "Custom",
};
const TICKER_TAX_INFO: Record<string, TickerTaxInfo> = {
  APAM: { tax10k: 16.04, savingOnce: 21.5 },
  CHRD: { tax10k: 12.82, savingOnce: 16.0 },
  SGOV: { tax10k: 4.6, savingOnce: 5.4 },
  TROW: { tax10k: 10.35, savingOnce: 13.7 },
  IVZ: { tax10k: 8.92, savingOnce: 11.2 },
};

const SCROLL_TEST_EVENTS: CalendarEvent[] = [
  { id: "cal-extra-1", portfolioName: "배당주", ticker: "APAM", eventType: "Pay", date: "2026-07-03", shortLabel: "APAM Pay", dividendAmount: 1.25, currentPrice: 36.8, annualYield: 13.6, memo: "테스트용 7월 지급", star: true, heart: false, alertEnabled: true, status: "estimated" },
  { id: "cal-extra-2", portfolioName: "배당주", ticker: "CHRD", eventType: "Buy", date: "2026-07-14", shortLabel: "CHRD Buy", currentPrice: 118.4, annualYield: 4.2, memo: "테스트용 매수 마감", star: false, heart: true, alertEnabled: false, status: "estimated" },
  { id: "cal-extra-3", portfolioName: "배당주", ticker: "TROW", eventType: "Ex-Div", date: "2026-08-11", shortLabel: "TROW Ex", dividendAmount: 1.24, currentPrice: 102.3, annualYield: 4.8, memo: "테스트용 배당락", star: false, heart: false, alertEnabled: false, status: "declared" },
  { id: "cal-extra-4", portfolioName: "채권성", ticker: "SGOV", eventType: "Pay", date: "2026-08-15", shortLabel: "SGOV Pay", dividendAmount: 0.42, currentPrice: 100.7, annualYield: 5.0, memo: "테스트용 지급", star: true, heart: true, alertEnabled: true, status: "estimated" },
  { id: "cal-extra-5", portfolioName: "배당주", ticker: "IVZ", eventType: "Earn", date: "2026-09-09", shortLabel: "IVZ Earn", currentPrice: 15.2, annualYield: 5.0, memo: "테스트용 실적", star: false, heart: false, alertEnabled: false, status: "estimated" },
  { id: "cal-extra-6", portfolioName: "배당주", ticker: "APAM", eventType: "Ex-Div", date: "2026-10-21", shortLabel: "APAM Ex", dividendAmount: 1.25, currentPrice: 36.8, annualYield: 13.6, memo: "테스트용 배당락", star: true, heart: false, alertEnabled: true, status: "declared" },
  { id: "cal-extra-7", portfolioName: "배당주", ticker: "CHRD", eventType: "Pay", date: "2026-11-06", shortLabel: "CHRD Pay", dividendAmount: 1.25, currentPrice: 118.4, annualYield: 4.2, memo: "테스트용 지급", star: false, heart: true, alertEnabled: false, status: "estimated" },
  { id: "cal-extra-8", portfolioName: "기타", ticker: "메모", eventType: "custom", date: "2026-12-16", shortLabel: "연말체크", memo: "연말 리밸런싱", customTitle: "연말 체크", star: false, heart: false, alertEnabled: false, status: "declared" },
];

/**
 * 무료 모드 일정 최신화 URL.
 * Polygon/Finnhub API key는 앱에 넣지 않고 Streamlit에서 처리합니다.
 * .env에 EXPO_PUBLIC_STREAMLIT_CALENDAR_URL=https://your-app.streamlit.app 형태로 설정하세요.
 */
const STREAMLIT_CALENDAR_URL = process.env.EXPO_PUBLIC_STREAMLIT_CALENDAR_URL ?? "";

/**
 * Firebase의 dividend_calendar 원본 객체에서 ticker별 메모 map을 추출.
 * - 경로: dividend_calendar.memos.{TICKER}
 * - ticker는 대문자로 정규화
 * - "_EMPTY_DICT_"/"_EMPTY_"/빈 문자열 placeholder는 무시
 * - memos가 없거나 형식이 이상하면 빈 객체 반환
 */
function extractFirebaseTickerMemos(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const memosNode = (raw as Record<string, unknown>).memos;
  if (!memosNode || typeof memosNode !== "object" || Array.isArray(memosNode)) {
    return {};
  }
  const result: Record<string, string> = {};
  Object.entries(memosNode as Record<string, unknown>).forEach(([key, value]) => {
    if (!key) return;
    if (typeof value !== "string") return;
    const upperKey = key.trim().toUpperCase();
    if (!upperKey || upperKey === "_EMPTY_DICT_" || upperKey === "_EMPTY_") return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === "_EMPTY_DICT_" || trimmed === "_EMPTY_") return;
    result[upperKey] = trimmed;
  });
  return result;
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const dividendCalendarQuery = useDividendCalendarQuery(user?.email);
  const firebaseCalendarEvents = useMemo(
    () => normalizeDividendCalendar(dividendCalendarQuery.data),
    [dividendCalendarQuery.data],
  );
  const firebaseTickerMemos = useMemo(
    () => extractFirebaseTickerMemos(dividendCalendarQuery.data),
    [dividendCalendarQuery.data],
  );
  const hasLoginEmail = Boolean(user?.email);
  const isUsingFirebaseCalendar = hasLoginEmail && dividendCalendarQuery.isSuccess && firebaseCalendarEvents.length > 0;
  const isFirebaseCalendarEmpty = hasLoginEmail && dividendCalendarQuery.isSuccess && firebaseCalendarEvents.length === 0;
  const isFirebaseCalendarFailed = hasLoginEmail && dividendCalendarQuery.isError;
  const calendarSourceText = getCalendarSourceText({
    hasLoginEmail,
    isLoading: dividendCalendarQuery.isLoading,
    isUsingFirebaseCalendar,
    isFirebaseCalendarEmpty,
    isFirebaseCalendarFailed,
  });
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const compactTaxWidth = "23.5%";

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(today));
  const [filters, setFilters] = useState<Record<FilterType, boolean>>({
    "Ex-Div": true,
    Buy: true,
    Earn: true,
    Pay: false,
  });
  const [showTickerManager, setShowTickerManager] = useState(false);
  const [managedTickers, setManagedTickers] = useState(portfolioTickers);
  const [selectedManagerTicker, setSelectedManagerTicker] = useState(portfolioTickers[0]?.ticker ?? "");
  const [removeTicker, setRemoveTicker] = useState("");
  const [removeSearch, setRemoveSearch] = useState("");
  const [newTicker, setNewTicker] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<MonthScope>("month");
  const [allScheduleVisibleCount, setAllScheduleVisibleCount] = useState(SCHEDULE_PAGE_SIZE);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "asc" });
  const baseCalendarEvents = useMemo(() => {
    if (isUsingFirebaseCalendar) {
      return firebaseCalendarEvents;
    }
    if (isFirebaseCalendarEmpty) {
      return [];
    }
    return [...calendarEvents, ...SCROLL_TEST_EVENTS];
  }, [firebaseCalendarEvents, isFirebaseCalendarEmpty, isUsingFirebaseCalendar]);
  const [eventMarks, setEventMarks] = useState<Record<string, EventMark>>(() => {
    return Object.fromEntries(
      [...calendarEvents, ...SCROLL_TEST_EVENTS].map((event) => [
        event.id,
        { star: event.star, heart: event.heart, alertEnabled: event.alertEnabled },
      ]),
    ) as Record<string, EventMark>;
  });
  const [tickerMemoDrafts, setTickerMemoDrafts] = useState<Record<string, string>>(() => {
    return Object.fromEntries(portfolioTickers.map((ticker) => [ticker.ticker.toUpperCase(), ticker.memo])) as Record<string, string>;
  });
  // 사용자가 모달에서 직접 편집한 ticker는 Firebase 값으로 덮어쓰지 않기 위한 ref
  const userEditedTickersRef = useRef<Set<string>>(new Set());
  const [customMemoDrafts, setCustomMemoDrafts] = useState<Record<string, string>>(() => {
    return Object.fromEntries(
      [...calendarEvents, ...SCROLL_TEST_EVENTS]
        .filter((event) => event.eventType === "custom")
        .map((event) => [event.date, event.customTitle ?? event.memo ?? event.shortLabel]),
    ) as Record<string, string>;
  });
  const [deletedCustomMemoDates, setDeletedCustomMemoDates] = useState<Record<string, true>>({});
  const [customEditVisible, setCustomEditVisible] = useState(false);
  const [customEditDraft, setCustomEditDraft] = useState("");
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const displayEvents = useMemo(() => {
    const customDatesFromBase = new Set<string>();
    const events = baseCalendarEvents.flatMap((event) => {
      const marks = eventMarks[event.id] ?? { star: event.star, heart: event.heart, alertEnabled: event.alertEnabled };
      if (event.eventType !== "custom") return [{ ...event, ...marks }];
      customDatesFromBase.add(event.date);
      if (deletedCustomMemoDates[event.date]) return [];
      const customMemo = customMemoDrafts[event.date] ?? event.customMemo ?? event.customTitle ?? event.memo ?? event.shortLabel;
      if (!customMemo?.trim()) return [];
      return [{ ...event, ...marks, ticker: "", memo: customMemo, customTitle: customMemo, shortLabel: customMemo }];
    });
    const addedCustomEvents: CalendarEvent[] = Object.entries(customMemoDrafts)
      .filter(([date, memo]) => memo.trim().length > 0 && !customDatesFromBase.has(date) && !deletedCustomMemoDates[date])
      .map(([date, memo]) => ({
        id: `custom-${date}`,
        portfolioName: "기타",
        ticker: "",
        eventType: "custom" as const,
        date,
        shortLabel: memo,
        memo,
        customTitle: memo,
        star: false,
        heart: false,
        alertEnabled: false,
        status: "declared" as const,
      }));
    return [...events, ...addedCustomEvents];
  }, [baseCalendarEvents, customMemoDrafts, deletedCustomMemoDates, eventMarks]);
  const calendarGridEvents = useMemo(
    () => displayEvents.filter((event) => event.date.startsWith(monthPrefix)),
    [displayEvents, monthPrefix],
  );
  const visibleDisplayEvents = useMemo(
    () => displayEvents.filter((event) => isVisibleByFilter(event, filters)),
    [displayEvents, filters],
  );
  const visibleMonthEvents = useMemo(
    () => visibleDisplayEvents.filter((event) => event.date.startsWith(monthPrefix)),
    [monthPrefix, visibleDisplayEvents],
  );
  const selectedEvents = useMemo(
    () => selectedDate
      ? sortEventsForDisplay(visibleDisplayEvents.filter((event) => event.date === selectedDate))
      : [],
    [selectedDate, visibleDisplayEvents],
  );

  const monthBuyTickers = useMemo(() => {
    const tickerSet = new Set(
      calendarGridEvents
        .filter((event) => event.eventType === "Buy")
        .map((event) => event.ticker),
    );
    return tickerSet;
  }, [calendarGridEvents]);

  const tickerEventCounts = useMemo(() => {
    const counts = new Map<string, number>();
    displayEvents.forEach((event) => {
      if (event.eventType !== "custom" && event.ticker) {
        counts.set(event.ticker, (counts.get(event.ticker) ?? 0) + 1);
      }
    });
    return counts;
  }, [displayEvents]);

  const taxInfoByTicker = useMemo(
    () => buildTickerTaxInfoByTicker(displayEvents, monthPrefix, !isUsingFirebaseCalendar),
    [displayEvents, isUsingFirebaseCalendar, monthPrefix],
  );

  const taxSummaryTickers = useMemo(() => {
    const tickerMap = new Map(
      (isUsingFirebaseCalendar ? [] : managedTickers).map((ticker) => [ticker.ticker, ticker]),
    );
    displayEvents
      .filter((event) => event.eventType !== "custom" && event.ticker)
      .forEach((event) => {
        if (!tickerMap.has(event.ticker)) {
          tickerMap.set(event.ticker, {
            ticker: event.ticker,
            name: event.ticker,
            portfolioName: event.portfolioName,
            sector: "기타",
            memo: event.tickerMemo ?? event.memo ?? "",
            star: event.star,
            heart: event.heart,
            alertEnabled: event.alertEnabled,
            relatedEventCount: tickerEventCounts.get(event.ticker) ?? 0,
          });
        }
      });
    return Array.from(tickerMap.values()).sort((a, b) => {
      const savingsDiff = (taxInfoByTicker.get(b.ticker)?.savingOnce ?? getTickerTaxInfo(b.ticker, undefined, undefined, !isUsingFirebaseCalendar).savingOnce)
        - (taxInfoByTicker.get(a.ticker)?.savingOnce ?? getTickerTaxInfo(a.ticker, undefined, undefined, !isUsingFirebaseCalendar).savingOnce);
      return savingsDiff || a.ticker.localeCompare(b.ticker);
    });
  }, [displayEvents, isUsingFirebaseCalendar, managedTickers, taxInfoByTicker, tickerEventCounts]);

  // 캘린더 설정 모달이 사용하는 전체 ticker universe.
  // - taxSummaryTickers (Firebase 일정 기반, "종목별 1회 예상 절세액" 영역과 동일 source)
  // - 사용자가 Add Ticker로 직접 등록한 managedTickers (taxSummary에 없는 ticker만 보충)
  // - dividend_calendar.memos에서 ticker별 기존 메모 hydrate
  // - 두 source 병합 시 절세액/메모를 0/빈값으로 덮어쓰지 않음
  const unifiedManagerTickers = useMemo(() => {
    const tickerMap = new Map<string, PortfolioTicker>();

    // 1순위: taxSummary (Firebase 기반) — 절세액/관련 이벤트 수의 canonical source
    taxSummaryTickers.forEach((ticker) => {
      const upperTicker = ticker.ticker.toUpperCase();
      tickerMap.set(upperTicker, { ...ticker, ticker: upperTicker });
    });

    // 2순위: managedTickers — taxSummary에 없는 ticker만 보충
    managedTickers.forEach((ticker) => {
      const upperTicker = ticker.ticker.toUpperCase();
      if (!tickerMap.has(upperTicker)) {
        tickerMap.set(upperTicker, { ...ticker, ticker: upperTicker });
      }
    });

    // 메모 hydrate: Firebase memos가 있으면 우선 사용 (기존 sector/category는 유지)
    const result: PortfolioTicker[] = Array.from(tickerMap.values()).map((ticker) => {
      const upperTicker = ticker.ticker;
      const firebaseMemo = firebaseTickerMemos[upperTicker];
      const hydratedMemo = firebaseMemo && firebaseMemo.length > 0 ? firebaseMemo : ticker.memo ?? "";
      return { ...ticker, memo: hydratedMemo };
    });

    return result.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [firebaseTickerMemos, managedTickers, taxSummaryTickers]);

  // 모달의 선택 ticker card가 사용할 절세액 map.
  // "종목별 1회 예상 절세액" 영역과 동일하게 taxInfoByTicker → fallback 순.
  const tickerSavingOnceMap = useMemo(() => {
    const map = new Map<string, number>();
    unifiedManagerTickers.forEach((ticker) => {
      const upperTicker = ticker.ticker;
      const fromTaxInfo = taxInfoByTicker.get(upperTicker)?.savingOnce;
      if (typeof fromTaxInfo === "number" && fromTaxInfo > 0) {
        map.set(upperTicker, fromTaxInfo);
        return;
      }
      const fallback = getTickerTaxInfo(upperTicker, undefined, undefined, !isUsingFirebaseCalendar).savingOnce;
      map.set(upperTicker, fallback);
    });
    return map;
  }, [isUsingFirebaseCalendar, taxInfoByTicker, unifiedManagerTickers]);

  const tableEvents = useMemo(() => {
    const scoped = scope === "month" ? visibleMonthEvents : visibleDisplayEvents;
    return [...scoped]
      .sort((a, b) => {
        const result = String(a[sort.key]).localeCompare(String(b[sort.key]));
        return sort.dir === "asc" ? result : -result;
      });
  }, [scope, sort.dir, sort.key, visibleDisplayEvents, visibleMonthEvents]);
  const renderedTableEvents = useMemo(
    () => scope === "all" ? tableEvents.slice(0, allScheduleVisibleCount) : tableEvents,
    [allScheduleVisibleCount, scope, tableEvents],
  );
  const hasMoreTableEvents = scope === "all" && renderedTableEvents.length < tableEvents.length;
  const scheduleCountText = scope === "all"
    ? `전체 ${tableEvents.length}건 중 ${renderedTableEvents.length}건 표시 중`
    : `${tableEvents.length}건 표시 중`;

  const prevMonth = () => {
    if (month === 1) {
      setYear((value) => value - 1);
      setMonth(12);
    } else {
      setMonth((value) => value - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((value) => value + 1);
      setMonth(1);
    } else {
      setMonth((value) => value + 1);
    }
    setSelectedDate(null);
  };

  // Firebase의 dividend_calendar.memos를 ticker별 메모 draft에 hydrate.
  // - 사용자가 모달에서 직접 편집한 ticker는 덮어쓰지 않음 (userEditedTickersRef로 보호)
  // - Firebase에 메모가 있는데 draft가 비어 있으면 채워줌
  useEffect(() => {
    const memoEntries = Object.entries(firebaseTickerMemos);
    if (memoEntries.length === 0) return;
    setTickerMemoDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      memoEntries.forEach(([upperTicker, memoValue]) => {
        if (userEditedTickersRef.current.has(upperTicker)) return;
        if (next[upperTicker] === memoValue) return;
        next[upperTicker] = memoValue;
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [firebaseTickerMemos]);

  const handleScopeChange = useCallback((nextScope: MonthScope) => {
    setScope((current) => current === nextScope ? current : nextScope);
    if (nextScope === "all") {
      setAllScheduleVisibleCount(SCHEDULE_PAGE_SIZE);
    }
  }, []);

  const handleToggleFilter = useCallback((type: FilterType) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
    setAllScheduleVisibleCount(SCHEDULE_PAGE_SIZE);
  }, []);

  const eventById = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    displayEvents.forEach((event) => {
      map.set(event.id, event);
    });
    return map;
  }, [displayEvents]);

  const toggleSort = useCallback((key: SortKey) => {
    setAllScheduleVisibleCount(SCHEDULE_PAGE_SIZE);
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  }, []);

  const toggleEventMark = useCallback((eventId: string, key: keyof EventMark) => {
    setEventMarks((prev) => {
      const source = eventById.get(eventId);
      const current = prev[eventId] ?? {
        star: source?.star ?? false,
        heart: source?.heart ?? false,
        alertEnabled: source?.alertEnabled ?? false,
      };
      return { ...prev, [eventId]: { ...current, [key]: !current[key] } };
    });
  }, [eventById]);

  const showMoreTableEvents = useCallback(() => {
    setAllScheduleVisibleCount((count) => count + SCHEDULE_PAGE_SIZE);
  }, []);

  const handleAddTicker = () => {
    const candidates = newTicker
      .split(/[\s,]+/)
      .map((ticker) => ticker.trim().toUpperCase())
      .filter((ticker) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker));
    if (candidates.length === 0) return;
    // 중복 검사는 통합 ticker universe(Firebase + 로컬) 기준으로
    const existing = new Set(unifiedManagerTickers.map((item) => item.ticker));
    const unique = Array.from(new Set(candidates)).filter((ticker) => !existing.has(ticker));
    if (unique.length === 0) {
      setNewTicker("");
      return;
    }
    const nextTickers: PortfolioTicker[] = unique.map((ticker) => ({
      ticker,
      name: ticker,
      portfolioName: "직접등록",
      sector: "기타",
      memo: "",
      star: false,
      heart: false,
      alertEnabled: false,
      relatedEventCount: 0,
    }));
    setManagedTickers((prev) => [...prev, ...nextTickers]);
    setTickerMemoDrafts((prev) => ({
      ...prev,
      ...Object.fromEntries(unique.map((ticker) => [ticker.toUpperCase(), ""])),
    }));
    setSelectedManagerTicker(unique[0]);
    setRemoveTicker("");
    setRemoveSearch("");
    setNewTicker("");
  };

  const handleRemoveTicker = () => {
    if (!removeTicker) return;
    setManagedTickers((prev) => {
      const next = prev.filter((ticker) => ticker.ticker !== removeTicker);
      if (selectedManagerTicker === removeTicker) setSelectedManagerTicker("");
      setRemoveTicker("");
      setRemoveSearch("");
      return next;
    });
  };

  // 무료 모드 일정 최신화: Firebase Functions 대신 Streamlit 앱으로 안내.
  // Polygon/Finnhub API key는 앱에 포함하지 않으며, Streamlit에서 처리합니다.
  const handleRefreshCalendar = useCallback(() => {
    if (!STREAMLIT_CALENDAR_URL) {
      Alert.alert(
        "일정 최신화",
        "Streamlit 최신화 페이지 URL이 아직 설정되지 않았습니다.\n.env에 EXPO_PUBLIC_STREAMLIT_CALENDAR_URL을 설정해 주세요.",
      );
      return;
    }

    Alert.alert(
      "일정 최신화",
      "무료 모드에서는 Streamlit에서 일정을 최신화합니다.\nStreamlit 페이지를 열까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "열기",
          onPress: () => {
            Linking.openURL(STREAMLIT_CALENDAR_URL).catch((error) => {
              console.warn("[handleRefreshCalendar] Linking.openURL failed", error);
              Alert.alert("오류", "페이지를 열 수 없습니다. URL을 확인해 주세요.");
            });
          },
        },
      ],
    );
  }, []);

  // 종목 메모 편집/저장 통합 핸들러.
  // - ticker key는 항상 대문자
  // - 사용자가 편집한 ticker를 ref에 기록 → useEffect에서 Firebase로 덮어쓰지 않음
  // - 로그인 상태이면 Firebase memos/{TICKER}만 직접 업데이트 (다른 ticker 메모 보존)
  const handleTickerMemoChange = useCallback((rawTicker: string, memoValue: string) => {
    const upperTicker = (rawTicker ?? "").toUpperCase();
    if (!upperTicker) return;
    userEditedTickersRef.current.add(upperTicker);
    setTickerMemoDrafts((prev) => ({ ...prev, [upperTicker]: memoValue }));
  }, []);

  // 종목 메모 영구 저장 (Firebase). 로그인하지 않은 경우 저장 시도하지 않음.
  const persistTickerMemo = useCallback(
    async (rawTicker: string, memoValue: string) => {
      if (!hasLoginEmail || !user?.email) return;
      const upperTicker = (rawTicker ?? "").toUpperCase();
      if (!upperTicker) return;
      try {
        await writeTickerMemo(user.email, upperTicker, memoValue);
      } catch (error) {
        console.warn("[writeTickerMemo] failed", upperTicker, error);
      }
    },
    [hasLoginEmail, user?.email],
  );

  // 모달 "저장" 버튼 핸들러 — 명시적 저장 + 피드백
  const handleSaveMemo = useCallback(
    async (rawTicker: string) => {
      if (!hasLoginEmail || !user?.email) {
        Alert.alert("저장 불가", "로그인 후 저장할 수 있어요.");
        return;
      }
      const upperTicker = (rawTicker ?? "").toUpperCase();
      if (!upperTicker) return;
      const memoValue = tickerMemoDrafts[upperTicker] ?? "";
      setIsSavingMemo(true);
      try {
        await writeTickerMemo(user.email, upperTicker, memoValue);
        userEditedTickersRef.current.delete(upperTicker);
        Alert.alert("저장 완료", `${upperTicker} 종목 메모가 저장되었습니다.`);
      } catch (error) {
        console.error("[handleSaveMemo] failed", upperTicker, error);
        Alert.alert("저장 실패", "메모 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsSavingMemo(false);
      }
    },
    [hasLoginEmail, tickerMemoDrafts, user?.email],
  );

  const selectedCustomEvent = useMemo(
    () => selectedDate
      ? displayEvents.find((event) => event.date === selectedDate && event.eventType === "custom")
      : undefined,
    [displayEvents, selectedDate],
  );
  const selectedCustomMemo = selectedCustomEvent
    ? selectedCustomEvent.customTitle ?? selectedCustomEvent.memo ?? selectedCustomEvent.shortLabel
    : undefined;
  const openCustomEditor = () => {
    if (!selectedDate) return;
    setCustomEditDraft(selectedCustomMemo ?? "");
    setCustomEditVisible(true);
  };
  const saveCustomMemo = () => {
    if (!selectedDate) return;
    const memo = customEditDraft.trim();
    setCustomMemoDrafts((prev) => {
      const next = { ...prev };
      if (memo) next[selectedDate] = memo;
      else delete next[selectedDate];
      return next;
    });
    setDeletedCustomMemoDates((prev) => {
      const next = { ...prev };
      if (memo) delete next[selectedDate];
      else next[selectedDate] = true;
      return next;
    });
    setCustomEditVisible(false);
  };
  const deleteCustomMemo = () => {
    if (!selectedDate) return;
    setCustomMemoDrafts((prev) => {
      const next = { ...prev };
      delete next[selectedDate];
      return next;
    });
    setDeletedCustomMemoDates((prev) => ({ ...prev, [selectedDate]: true }));
    setCustomEditDraft("");
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>투자 캘린더</Text>
          <Text style={[styles.subtitle, { color: colors.textSub }]}>배당, 실적, 개인 메모 일정을 함께 봐요 · {calendarSourceText}</Text>
        </View>
        <TouchableOpacity
          onPress={handleRefreshCalendar}
          style={[
            styles.manageBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginRight: 6,
            },
          ]}
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowTickerManager(true)}
          style={[styles.manageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="settings" size={18} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      {!STREAMLIT_CALENDAR_URL && (
        <View
          style={[
            styles.refreshHint,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="info" size={13} color={colors.textSub} />
          <Text style={[styles.refreshHintText, { color: colors.textSub }]}>
            무료 모드에서는 Streamlit에서 Polygon/Finnhub 최신화를 실행합니다. EXPO_PUBLIC_STREAMLIT_CALENDAR_URL을 설정하면 버튼이 활성화됩니다.
          </Text>
        </View>
      )}

      <TickerManagerModal
        visible={showTickerManager}
        tickers={unifiedManagerTickers}
        selectedTicker={selectedManagerTicker}
        removeTicker={removeTicker}
        removeSearch={removeSearch}
        newTicker={newTicker}
        tickerMemoDrafts={tickerMemoDrafts}
        tickerSavingOnceMap={tickerSavingOnceMap}
        isSavingMemo={isSavingMemo}
        hasLoginEmail={hasLoginEmail}
        onClose={() => setShowTickerManager(false)}
        onSelectTicker={setSelectedManagerTicker}
        onSelectRemoveTicker={setRemoveTicker}
        onChangeRemoveSearch={setRemoveSearch}
        onChangeNewTicker={setNewTicker}
        onChangeTickerMemo={(ticker, memo) => {
          handleTickerMemoChange(ticker, memo);
        }}
        onSaveMemo={(ticker) => { void handleSaveMemo(ticker); }}
        onAddTicker={handleAddTicker}
        onRemoveTicker={handleRemoveTicker}
      />

      <Modal visible={customEditVisible} transparent animationType="fade" onRequestClose={() => setCustomEditVisible(false)}>
        <View style={styles.customModalBackdrop}>
          <View style={[styles.customMemoModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.customMemoTitle, { color: colors.text }]}>{selectedDate} 커스텀 일정</Text>
            <TextInput
              value={customEditDraft}
              onChangeText={setCustomEditDraft}
              placeholder="커스텀 메모"
              placeholderTextColor={colors.textSub}
              style={[styles.customMemoInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <View style={styles.customMemoActions}>
              <TouchableOpacity onPress={() => setCustomEditVisible(false)} style={[styles.customMemoCancel, { backgroundColor: colors.muted }]}>
                <Text style={[styles.customMemoCancelText, { color: colors.textSub }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveCustomMemo} style={[styles.customMemoSave, { backgroundColor: colors.primary }]}>
                <Text style={styles.customMemoSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { backgroundColor: colors.muted }]}>
            <Feather name="chevron-left" size={17} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text style={[styles.monthLabel, { color: colors.text }]}>{year}년 {month}월</Text>
            <TouchableOpacity
              onPress={() => {
                setYear(today.getFullYear());
                setMonth(today.getMonth() + 1);
                setSelectedDate(toDateKey(today));
              }}
              style={[styles.todayBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.todayBtnText, { color: colors.secondary }]}>TODAY</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { backgroundColor: colors.muted }]}>
            <Feather name="chevron-right" size={17} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((type) => {
              const active = filters[type];
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => handleToggleFilter(type)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? CALENDAR_EVENT_COLORS[type] : colors.muted,
                      borderColor: active ? CALENDAR_EVENT_COLORS[type] : colors.border,
                    },
                  ]}
                >
                  <Feather name={active ? "check" : "plus"} size={11} color={active ? "#FFF" : colors.textSub} />
                  <Text style={[styles.filterText, { color: active ? "#FFF" : colors.textSub }]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <CalendarGrid
          year={year}
          month={month}
          events={calendarGridEvents}
          selectedDate={selectedDate}
          filter={filters}
          onSelectDate={setSelectedDate}
        />

        {selectedDate && (
          <View style={[styles.inlinePanel, { backgroundColor: colors.primary + "09", borderColor: colors.primary + "28" }]}>
            <View style={styles.inlineHeaderRow}>
              <Text style={[styles.inlineTitle, { color: colors.text }]}>{selectedDate} 일정</Text>
              <View style={styles.inlineHeaderActions}>
                <TouchableOpacity
                  onPress={openCustomEditor}
                  style={[styles.inlineIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Feather name="edit-2" size={13} color={colors.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={deleteCustomMemo}
                  disabled={!selectedCustomMemo?.trim()}
                  style={[
                    styles.inlineIconBtn,
                    {
                      backgroundColor: selectedCustomMemo?.trim() ? colors.card : colors.muted,
                      borderColor: colors.border,
                      opacity: selectedCustomMemo?.trim() ? 1 : 0.45,
                    },
                  ]}
                >
                  <Feather name="x" size={14} color={selectedCustomMemo?.trim() ? colors.destructive : colors.textSub} />
                </TouchableOpacity>
              </View>
            </View>
            {selectedEvents.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSub }]}>선택한 날짜에 표시할 일정이 없어요</Text>
            ) : (
              <View style={styles.inlineEventList}>
                {selectedEvents.map((event) => {
                  const memo = getSharedMemo(event, tickerMemoDrafts);
                  const taxInfo = getTickerTaxInfo(event.ticker, event, taxInfoByTicker.get(event.ticker), !isUsingFirebaseCalendar);
                  const tickerSnapshot = getTickerSnapshot(event, displayEvents);
                  return (
                    <View key={event.id} style={[styles.inlineEvent, { borderTopColor: colors.border }]}>
                      {event.eventType === "custom" ? (
                        <View style={styles.customDetail}>
                          <Text style={[styles.editLabel, { color: colors.textSub }]}>커스텀메모</Text>
                          <TextInput
                            value={memo}
                            onChangeText={(text) => {
                              setCustomMemoDrafts((prev) => ({ ...prev, [event.date]: text }));
                              setDeletedCustomMemoDates((prev) => {
                                if (!prev[event.date]) return prev;
                                const next = { ...prev };
                                delete next[event.date];
                                return next;
                              });
                            }}
                            placeholder="커스텀 메모"
                            placeholderTextColor={colors.textSub}
                            style={[styles.editInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                          />
                        </View>
                      ) : (
                        <>
                          <View style={styles.inlineEventTop}>
                            <View style={[styles.typePill, { backgroundColor: CALENDAR_EVENT_COLORS[event.eventType] + "20" }]}>
                              <Text style={[styles.typeText, { color: CALENDAR_EVENT_COLORS[event.eventType] }]}>{TYPE_LABELS[event.eventType]}</Text>
                            </View>
                            <MarkedTickerLabel event={event} color={colors.secondary} />
                            <Text style={[styles.inlineSaving, { color: colors.text }]}>{taxInfo.savingOnce.toFixed(1)}</Text>
                            <View style={styles.inlineMarkBtns}>
                              <TouchableOpacity onPress={() => toggleEventMark(event.id, "star")} hitSlop={8}>
                                <Feather name="star" size={14} color={event.star ? "#F5B731" : colors.border} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => toggleEventMark(event.id, "heart")} hitSlop={8}>
                                <Feather name="heart" size={14} color={event.heart ? "#E07B6A" : colors.border} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => toggleEventMark(event.id, "alertEnabled")} hitSlop={8}>
                                <Feather name="bell" size={14} color={event.alertEnabled ? colors.primary : colors.border} />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={styles.compactInfoGrid}>
                            <CompactInfo label="Status" value={event.status ?? "estimated"} />
                            <CompactInfo label="Dividend" value={event.dividendAmount ? `$${event.dividendAmount.toFixed(2)}/share` : "-"} />
                            <CompactInfo label="Buy" value={tickerSnapshot.buyDate} />
                            <CompactInfo label="Ex-Date" value={tickerSnapshot.exDate} />
                            <CompactInfo label="Pay Date" value={tickerSnapshot.payDate} />
                            <CompactInfo label="Yield" value={event.annualYield ? `${event.annualYield.toFixed(2)}%` : "-"} />
                            <CompactInfo label="Tax($10k)" value={`$${taxInfo.tax10k.toFixed(2)}`} />
                            <CompactInfo label="1회절세" value={`$${taxInfo.savingOnce.toFixed(1)}`} />
                          </View>
                          <View style={styles.memoEditBlock}>
                            <Text style={[styles.editLabel, { color: colors.textSub }]}>종목 메모</Text>
                            <TextInput
                              value={memo}
                              onChangeText={(text) => {
                                handleTickerMemoChange(event.ticker, text);
                                void persistTickerMemo(event.ticker, text);
                              }}
                              placeholder="종목 메모"
                              placeholderTextColor={colors.textSub}
                              style={[styles.editInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                            />
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="종목별 1회 예상 절세액" subtitle="선택 월 일정 종목은 음영으로 표시해요" />
        <View style={styles.taxGrid}>
          {taxSummaryTickers.map((ticker) => {
            const active = monthBuyTickers.has(ticker.ticker);
            const taxInfo = taxInfoByTicker.get(ticker.ticker) ?? getTickerTaxInfo(ticker.ticker, undefined, undefined, !isUsingFirebaseCalendar);
            return (
              <View
                key={ticker.ticker}
                style={[
                  styles.taxTile,
                  {
                    width: compactTaxWidth,
                    backgroundColor: active ? "#F4E2B8" : colors.card,
                    borderColor: active ? colors.primary + "66" : colors.border,
                  },
                ]}
              >
                <Text style={[styles.taxTicker, { color: colors.secondary }]}>{ticker.ticker}</Text>
                <Text style={[styles.taxValue, { color: colors.text }]}>{taxInfo.savingOnce.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.listHeaderRow}>
          <View>
            <Text style={[styles.listTitle, { color: colors.text }]}>전체 일정</Text>
            <Text style={[styles.listSubtitle, { color: colors.textSub }]}>{scheduleCountText}</Text>
          </View>
          <View style={[styles.scopeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { key: "month" as const, label: "당월" },
              { key: "all" as const, label: "전체" },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleScopeChange(item.key)}
                style={[styles.scopeBtn, { backgroundColor: scope === item.key ? colors.primary : "transparent" }]}
              >
                <Text style={[styles.scopeText, { color: scope === item.key ? "#FFF" : colors.textSub }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <SortHeader label="날짜" sortKey="date" current={sort} onPress={toggleSort} flex={1.2} />
            <SortHeader label="티커" sortKey="ticker" current={sort} onPress={toggleSort} flex={1.45} />
            <SortHeader label="타입" sortKey="eventType" current={sort} onPress={toggleSort} flex={0.9} />
            <Text style={[styles.th, { color: colors.textSub, flex: 1.1, textAlign: "center" }]}>배당금</Text>
            <Text style={[styles.th, { color: colors.textSub, flex: 1, textAlign: "center" }]}>관리</Text>
          </View>
          <ScrollView style={[styles.tableScroll, scope === "all" && styles.tableScrollAll]} nestedScrollEnabled>
            {renderedTableEvents.length > 0 ? (
              renderedTableEvents.map((event) => (
                <EventListRow
                  key={event.id}
                  event={event}
                  onToggleMark={toggleEventMark}
                />
              ))
            ) : (
              <Text style={[styles.tableEmptyText, { color: colors.textSub }]}>해당 범위에 표시할 일정이 없어요</Text>
            )}
            {hasMoreTableEvents ? (
              <View style={[styles.tableMoreBlock, { borderTopColor: colors.border }]}>
                <TouchableOpacity onPress={showMoreTableEvents} style={[styles.tableMoreBtn, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.tableMoreText, { color: colors.secondary }]}>50개 더 보기</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}

function getCalendarSourceText({
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
    return "로컬 더미";
  }
  if (isLoading) {
    return "Firebase 읽는 중";
  }
  if (isUsingFirebaseCalendar) {
    return "Firebase 일정 사용 중";
  }
  if (isFirebaseCalendarEmpty) {
    return "Firebase 일정 없음";
  }
  if (isFirebaseCalendarFailed) {
    return "읽기 실패, 로컬 더미";
  }
  return "로컬 더미";
}

function sortEventsForDisplay(events: CalendarEvent[]) {
  return [...events].sort((a, b) => {
    if (a.eventType === "custom" && b.eventType !== "custom") return -1;
    if (a.eventType !== "custom" && b.eventType === "custom") return 1;
    const markPriority = getEventMarkPriority(a) - getEventMarkPriority(b);
    if (markPriority !== 0) return markPriority;
    return a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker);
  });
}

function getEventMarkPriority(event: CalendarEvent) {
  if (event.star && event.heart) return 0;
  if (event.star) return 1;
  if (event.heart) return 2;
  return 3;
}

function getTickerTaxInfo(
  ticker: string,
  event?: CalendarEvent,
  tickerFallback?: TickerTaxInfo,
  useLocalFallback = true,
): TickerTaxInfo {
  const fallback = tickerFallback ?? (useLocalFallback ? TICKER_TAX_INFO[ticker] : undefined) ?? { tax10k: 0, savingOnce: 0 };
  return {
    tax10k: event?.taxSavingPer10k ?? fallback.tax10k,
    savingOnce: event?.taxSavingOnce ?? event?.taxSaving ?? fallback.savingOnce,
  };
}

function buildTickerTaxInfoByTicker(events: CalendarEvent[], monthPrefix: string, useLocalFallback: boolean) {
  const eventsByTicker = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    if (event.eventType === "custom" || !event.ticker) return;
    const tickerEvents = eventsByTicker.get(event.ticker) ?? [];
    tickerEvents.push(event);
    eventsByTicker.set(event.ticker, tickerEvents);
  });

  const infoByTicker = new Map<string, TickerTaxInfo>();
  eventsByTicker.forEach((tickerEvents, ticker) => {
    const dividendEvents = tickerEvents.filter((event) => event.eventType !== "Earn");
    const preferred = dividendEvents.find((event) => event.eventType === "Buy" && event.date.startsWith(monthPrefix))
      ?? dividendEvents[dividendEvents.length - 1];
    infoByTicker.set(ticker, getTickerTaxInfo(ticker, preferred, undefined, useLocalFallback));
  });
  return infoByTicker;
}

function getTickerSnapshot(event: CalendarEvent, events: CalendarEvent[]) {
  const tickerEvents = events.filter((candidate) => candidate.ticker === event.ticker);
  const exDate = event.exDate ?? tickerEvents.find((candidate) => candidate.eventType === "Ex-Div")?.date;
  const payDate = event.payDate ?? tickerEvents.find((candidate) => candidate.eventType === "Pay")?.date;
  const buyDate = event.buyDate ?? tickerEvents.find((candidate) => candidate.eventType === "Buy")?.date ?? (exDate ? getPrevTradingDate(exDate) : undefined);
  return {
    buyDate: buyDate ?? "-",
    exDate: exDate ?? "-",
    payDate: payDate ?? "-",
  };
}

function formatMarkedTicker(event: CalendarEvent) {
  const marks = `${event.star ? "⭐" : ""}${event.heart ? "❤️" : ""}`;
  return `${marks ? `${marks} ` : ""}${getEventDisplayName(event)}`;
}

function MarkedTickerLabel({ event, color }: { event: CalendarEvent; color: string }) {
  return (
    <View style={styles.inlineTicker}>
      {event.star ? <Text style={styles.inlineMarkPrefix}>★</Text> : null}
      {event.heart ? <Text style={styles.inlineHeartPrefix}>♥</Text> : null}
      <Text style={[styles.inlineTickerText, { color }]} numberOfLines={1}>
        {getEventDisplayName(event)}
      </Text>
    </View>
  );
}

function getEventDisplayName(event: CalendarEvent) {
  if (event.eventType === "custom") {
    return event.customTitle ?? event.memo ?? event.shortLabel;
  }
  return event.ticker;
}

function getSharedMemo(event: CalendarEvent, tickerMemoMap: Record<string, string>) {
  if (event.eventType === "custom") {
    return event.customMemo ?? event.memo ?? event.customTitle ?? event.shortLabel;
  }
  const upperTicker = event.ticker.toUpperCase();
  return tickerMemoMap[upperTicker] ?? tickerMemoMap[event.ticker] ?? event.tickerMemo ?? event.memo ?? "";
}

function getTickerStatus(events: CalendarEvent[]) {
  const statuses = Array.from(new Set(events.map((event) => event.status ?? "estimated")));
  return statuses.join(" / ");
}

function isVisibleByFilter(event: CalendarEvent, filters: Record<FilterType, boolean>) {
  return event.eventType === "custom" || filters[event.eventType];
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getPrevTradingDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  do {
    date.setDate(date.getDate() - 1);
  } while (date.getDay() === 0 || date.getDay() === 6);
  return toDateKey(date);
}

function DetailItem({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailLabel, { color: colors.textSub }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function ReadonlyInfo({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.readonlyItem}>
      <Text style={[styles.readonlyLabel, { color: colors.textSub }]}>{label}</Text>
      <Text style={[styles.readonlyValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.compactInfoItem}>
      <Text style={[styles.compactInfoLabel, { color: colors.textSub }]}>{label}</Text>
      <Text style={[styles.compactInfoValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function TickerManagerModal({
  visible,
  tickers,
  selectedTicker,
  removeTicker,
  removeSearch,
  newTicker,
  tickerMemoDrafts,
  tickerSavingOnceMap,
  isSavingMemo,
  hasLoginEmail,
  onClose,
  onSelectTicker,
  onSelectRemoveTicker,
  onChangeRemoveSearch,
  onChangeNewTicker,
  onChangeTickerMemo,
  onSaveMemo,
  onAddTicker,
  onRemoveTicker,
}: {
  visible: boolean;
  tickers: PortfolioTicker[];
  selectedTicker: string;
  removeTicker: string;
  removeSearch: string;
  newTicker: string;
  tickerMemoDrafts: Record<string, string>;
  tickerSavingOnceMap: Map<string, number>;
  isSavingMemo: boolean;
  hasLoginEmail: boolean;
  onClose: () => void;
  onSelectTicker: (ticker: string) => void;
  onSelectRemoveTicker: (ticker: string) => void;
  onChangeRemoveSearch: (query: string) => void;
  onChangeNewTicker: (ticker: string) => void;
  onChangeTickerMemo: (ticker: string, memo: string) => void;
  onSaveMemo: (ticker: string) => void;
  onAddTicker: () => void;
  onRemoveTicker: () => void;
}) {
  const colors = useColors();
  const selected = tickers.find((ticker) => ticker.ticker === selectedTicker);
  const removeQuery = removeSearch.trim().toUpperCase();
  // 검색어가 비어 있으면 후보 ticker를 표시하지 않음 (모달 하단 잘림 방지)
  const removeCandidates = removeQuery
    ? tickers.filter((ticker) => ticker.ticker.includes(removeQuery)).slice(0, 8)
    : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.tickerModal, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tickers 등록</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSub }]}>현재 그룹: 배당 전략</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="x" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.managerLabel, { color: colors.textSub }]}>현재 등록된 티커</Text>
            <View style={styles.registeredGrid}>
              {tickers.map((ticker) => {
                const active = selected?.ticker === ticker.ticker;
                return (
                  <TouchableOpacity
                    key={ticker.ticker}
                    onPress={() => onSelectTicker(ticker.ticker)}
                    style={[
                      styles.registeredTickerBtn,
                      { backgroundColor: active ? "#F4E2B8" : colors.card, borderColor: active ? colors.primary + "66" : colors.border },
                    ]}
                  >
                    <Text style={[styles.registeredTickerText, { color: colors.secondary }]}>{ticker.ticker}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.addTickerRow}>
              <TextInput
                value={newTicker}
                onChangeText={onChangeNewTicker}
                autoCapitalize="characters"
                placeholder="e.g. OHI, SCHD"
                placeholderTextColor={colors.textSub}
                style={[styles.tickerInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              />
              <TouchableOpacity onPress={onAddTicker} style={[styles.addTickerBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.addTickerText}>Add Ticker</Text>
              </TouchableOpacity>
            </View>

            {selected && (
              <View style={[styles.managerSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.managerSummaryTop}>
                  <Text style={[styles.managerSummaryTicker, { color: colors.secondary }]}>{selected.ticker}</Text>
                  <Text style={[styles.managerSummaryTax, { color: colors.text }]}>
                    {(tickerSavingOnceMap.get(selected.ticker) ?? getTickerTaxInfo(selected.ticker).savingOnce).toFixed(1)}
                  </Text>
                  <View style={[styles.managerSectorBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.managerSummarySector, { color: colors.textSub }]}>{selected.sector}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onSaveMemo(selected.ticker)}
                    disabled={isSavingMemo || !hasLoginEmail}
                    style={[
                      styles.memoSaveBtn,
                      {
                        backgroundColor: hasLoginEmail && !isSavingMemo ? "#E8D5A3" : colors.muted,
                        opacity: isSavingMemo ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.memoSaveBtnText, { color: hasLoginEmail ? "#5C4A2A" : colors.textSub }]}>
                      {isSavingMemo ? "..." : "저장"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.managerLabel, { color: colors.textSub }]}>종목 메모</Text>
                <TextInput
                  value={tickerMemoDrafts[selected.ticker] ?? selected.memo ?? ""}
                  onChangeText={(memo) => onChangeTickerMemo(selected.ticker, memo)}
                  placeholder="종목 메모"
                  placeholderTextColor={colors.textSub}
                  style={[styles.tickerInput, styles.managerMemoInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                />
              </View>
            )}

            <View style={styles.removeSection}>
              <Text style={[styles.managerLabel, { color: colors.textSub }]}>삭제할 종목 검색</Text>
              <View style={styles.removeSearchRow}>
                <TextInput
                  value={removeSearch}
                  onChangeText={(query) => {
                    onChangeRemoveSearch(query);
                    onSelectRemoveTicker("");
                  }}
                  autoCapitalize="characters"
                  placeholder="e.g. sch"
                  placeholderTextColor={colors.textSub}
                  style={[styles.removeSearchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                />
                <TouchableOpacity
                  onPress={onRemoveTicker}
                  disabled={!removeTicker}
                  style={[styles.removeBtn, { backgroundColor: removeTicker ? "#D85F4F" : colors.muted }]}
                >
                  <Text style={[styles.removeBtnText, { color: removeTicker ? "#FFF" : colors.textSub }]}>삭제</Text>
                </TouchableOpacity>
              </View>
              {removeQuery && removeCandidates.length === 0 && (
                <Text style={[styles.removeEmptyText, { color: colors.textSub }]}>검색 결과가 없어요</Text>
              )}
              {removeCandidates.length > 0 && (
                <View style={styles.removeCandidateRow}>
                  {removeCandidates.map((ticker) => {
                    const active = removeTicker === ticker.ticker;
                    return (
                      <TouchableOpacity
                        key={ticker.ticker}
                        onPress={() => onSelectRemoveTicker(ticker.ticker)}
                        style={[
                          styles.removeCandidate,
                          { backgroundColor: active ? "#F4E2B8" : colors.card, borderColor: active ? colors.primary + "66" : colors.border },
                        ]}
                      >
                        <Text style={[styles.removeCandidateText, { color: colors.secondary }]}>{ticker.ticker}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {removeTicker ? (
                <Text style={[styles.removeSelectedText, { color: colors.textSub }]}>
                  선택: {removeTicker}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  onPress,
  flex,
}: {
  label: string;
  sortKey: SortKey;
  current: { key: SortKey; dir: SortDir };
  onPress: (key: SortKey) => void;
  flex: number;
}) {
  const colors = useColors();
  const mark = current.key === sortKey ? (current.dir === "asc" ? "↑" : "↓") : "";
  return (
    <TouchableOpacity onPress={() => onPress(sortKey)} style={{ flex }}>
      <Text style={[styles.th, { color: current.key === sortKey ? colors.secondary : colors.textSub, textAlign: "center" }]}>
        {label}{mark}
      </Text>
    </TouchableOpacity>
  );
}

const EventListRow = memo(function EventListRow({
  event,
  onToggleMark,
}: {
  event: CalendarEvent;
  onToggleMark: (eventId: string, key: keyof EventMark) => void;
}) {
  const colors = useColors();
  const isEstimated = event.status === "estimated";

  return (
    <View
      style={[
        styles.tableRow,
        { borderTopColor: colors.border, backgroundColor: isEstimated ? "#F3F1EC" : colors.card },
      ]}
    >
      <Text style={[styles.td, { color: colors.textSub, flex: 1.2, textAlign: "center", paddingLeft: 4 }]}>{event.date.slice(2)}</Text>
      <Text style={[styles.td, { color: colors.secondary, flex: 1.45, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>{formatMarkedTicker(event)}</Text>
      <View style={{ flex: 0.9, alignItems: "center" }}>
        <View style={[styles.typePill, { backgroundColor: CALENDAR_EVENT_COLORS[event.eventType] + "22" }]}>
          <Text style={[styles.typeText, { color: CALENDAR_EVENT_COLORS[event.eventType] }]}>{TYPE_LABELS[event.eventType]}</Text>
        </View>
      </View>
      <Text style={[styles.td, { color: colors.text, flex: 1.1, textAlign: "center", paddingRight: 4 }]}>
        {event.dividendAmount ? `$${event.dividendAmount.toFixed(2)}` : "-"}
      </Text>
      <View style={[styles.rowIcons, { flex: 1 }]}>
        <TouchableOpacity onPress={() => onToggleMark(event.id, "star")} hitSlop={8}>
          <Feather name="star" size={12} color={event.star ? "#F5B731" : colors.border} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onToggleMark(event.id, "heart")} hitSlop={8}>
          <Feather name="heart" size={12} color={event.heart ? "#E07B6A" : colors.border} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onToggleMark(event.id, "alertEnabled")} hitSlop={8}>
          <Feather name="bell" size={12} color={event.alertEnabled ? colors.primary : colors.border} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 8, gap: 16 },
  pageHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  manageBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  refreshHint: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  refreshHintText: { flex: 1, fontSize: 11, lineHeight: 15, fontFamily: "Inter_400Regular" },
  calCard: {
    borderRadius: 16, paddingHorizontal: 6, paddingVertical: 10, borderWidth: 1,
    shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  monthCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 8 },
  navBtn: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  todayBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  todayBtnText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  monthLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  filterScroll: { marginBottom: 10 },
  filterRow: { flexDirection: "row", gap: 6 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  inlinePanel: { marginTop: 12, borderRadius: 13, padding: 12, borderWidth: 1, gap: 8 },
  inlineHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  inlineTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  inlineHeaderActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  inlineIconBtn: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  inlineEventList: { gap: 0 },
  inlineEvent: { borderTopWidth: 1, paddingTop: 9, gap: 7 },
  inlineEventTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  inlineTicker: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 3 },
  inlineMarkPrefix: { flexShrink: 0, fontSize: 12, lineHeight: 15, color: "#F5B731", fontFamily: "Inter_700Bold" },
  inlineHeartPrefix: { flexShrink: 0, fontSize: 12, lineHeight: 15, color: "#E07B6A", fontFamily: "Inter_700Bold" },
  inlineTickerText: { flexShrink: 1, minWidth: 0, fontSize: 13, fontFamily: "Inter_700Bold" },
  inlineSaving: { fontSize: 12, fontFamily: "Inter_700Bold" },
  inlineMarkBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  customDetail: { gap: 6 },
  readonlyMeta: { gap: 4 },
  readonlyItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  readonlyLabel: { width: 46, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  readonlyValue: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  compactInfoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  compactInfoItem: { width: "48%", gap: 1 },
  compactInfoLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  compactInfoValue: { fontSize: 11, fontFamily: "Inter_700Bold" },
  memoEditBlock: { gap: 6 },
  editLabel: { fontSize: 11, fontFamily: "Inter_700Bold" },
  editInput: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  emptyText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { gap: 12 },
  taxGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  taxTile: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 5, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  taxTicker: { fontSize: 9, fontFamily: "Inter_700Bold" },
  taxValue: { fontSize: 10, fontFamily: "Inter_700Bold" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(31, 21, 12, 0.35)", justifyContent: "flex-end" },
  tickerModal: { height: "92%", maxHeight: "95%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingBottom: 80 },
  managerLabel: { fontSize: 11, fontFamily: "Inter_700Bold", marginBottom: 6 },
  removeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 64, alignItems: "center", justifyContent: "center" },
  removeBtnText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  removeSearchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  removeSearchInput: { flex: 1, height: 36, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  removeEmptyText: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 6 },
  addTickerRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tickerInput: { flex: 1, height: 36, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  managerMemoInput: { height: 44, paddingVertical: 8, lineHeight: 16, fontSize: 11 },
  addTickerBtn: { height: 36, paddingHorizontal: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addTickerText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  registeredGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 12 },
  registeredTickerBtn: { width: Platform.OS === "web" ? "18.8%" : "23.5%", minHeight: 30, borderWidth: 1, borderRadius: 10, paddingVertical: 7, alignItems: "center", justifyContent: "center" },
  registeredTickerText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  managerSummary: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 5 },
  managerSummaryTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  managerSummaryTicker: { fontSize: 15, fontFamily: "Inter_700Bold" },
  managerSummarySector: { fontSize: 11, fontFamily: "Inter_700Bold" },
  managerSummaryTax: { fontSize: 12, fontFamily: "Inter_700Bold" },
  managerSectorBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9 },
  memoSaveBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  memoSaveBtnText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  removeSection: { marginTop: 16, paddingTop: 12, gap: 8 },
  removeCandidateRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  removeCandidate: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  removeCandidateText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  removeActionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  removeSelectedText: { flex: 1, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  customModalBackdrop: { flex: 1, backgroundColor: "rgba(31, 21, 12, 0.35)", justifyContent: "center", padding: 18 },
  customMemoModal: { width: "100%", maxWidth: 420, alignSelf: "center", borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  customMemoTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  customMemoInput: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  customMemoActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  customMemoCancel: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  customMemoCancelText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  customMemoSave: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  customMemoSaveText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  chipRow: { flexDirection: "row", gap: 7, paddingVertical: 2 },
  portfolioChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tickerList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  rowDivider: { height: 1, marginLeft: 14 },
  tickerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  tickerLeft: { flex: 1, gap: 3 },
  tickerCode: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tickerMemoPreview: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tickerRightSimple: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectorPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sectorText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tickerDetail: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 13 },
  detailItem: { width: "48%", gap: 2 },
  detailLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 12, fontFamily: "Inter_700Bold" },
  listHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  listSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  scopeToggle: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 3, gap: 3 },
  scopeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  scopeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  tableCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  tableScroll: { maxHeight: 360 },
  tableScrollAll: { maxHeight: 420 },
  tableHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, alignItems: "center" },
  tableEmptyText: { paddingHorizontal: 12, paddingVertical: 16, fontSize: 12, fontFamily: "Inter_500Medium" },
  tableMoreBlock: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" },
  tableMoreBtn: { minHeight: 34, borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  tableMoreText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  th: { fontSize: 10, fontFamily: "Inter_700Bold" },
  tableRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 10, borderTopWidth: 1, alignItems: "center" },
  td: { fontSize: 11, fontFamily: "Inter_400Regular" },
  typePill: { alignSelf: "flex-start", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, minWidth: 48 },
  typeText: { fontSize: 8.5, fontFamily: "Inter_700Bold", textAlign: "center" },
  rowIcons: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
});
