import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CalendarEvent, EventType } from "@/data/dummyData";
import { useColors } from "@/hooks/useColors";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const CELL_H = 72;
export const CALENDAR_EVENT_COLORS: Record<EventType, string> = {
  "Ex-Div": "#3E7CCF",
  Buy: "#D85F4F",
  Earn: "#8A63C7",
  Pay: "#4F9A69",
  custom: "#3D2B1F",
};

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  events: CalendarEvent[];
  selectedDate: string | null;
  filter: Record<Exclude<EventType, "custom">, boolean>;
  onSelectDate: (date: string) => void;
}

export function CalendarGrid({ year, month, events, selectedDate, filter, onSelectDate }: CalendarGridProps) {
  const colors = useColors();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const filteredEvents = events.filter((e) => e.date.startsWith(monthPrefix) && (e.eventType === "custom" || filter[e.eventType]));

  // Build map: day → events[]
  const eventMap: Record<number, CalendarEvent[]> = {};
  filteredEvents.forEach((e) => {
    const day = parseInt(e.date.split("-")[2], 10);
    if (!eventMap[day]) eventMap[day] = [];
    eventMap[day].push(e);
  });
  Object.values(eventMap).forEach((dayEvents) => {
    dayEvents.sort((a, b) => {
      if (a.eventType === "custom" && b.eventType !== "custom") return -1;
      if (a.eventType !== "custom" && b.eventType === "custom") return 1;
      const markPriority = getEventMarkPriority(a) - getEventMarkPriority(b);
      if (markPriority !== 0) return markPriority;
      return a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker);
    });
  });

  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const fmt = (day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <View style={styles.grid}>
      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAYS.map((d, i) => (
          <View key={d} style={styles.dayHeaderCell}>
            <Text
              style={[
                styles.dayHeaderText,
                { color: i === 0 ? colors.destructive : i === 6 ? colors.primary : colors.textSub },
              ]}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.row, { borderTopColor: colors.border }]}>
          {row.map((day, ci) => {
            if (!day) return <View key={ci} style={[styles.cell, { backgroundColor: colors.background }]} />;
            const dateStr = fmt(day);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayEvents = eventMap[day] ?? [];
            const customEvent = dayEvents.find((event) => event.eventType === "custom");
            const regularEvents = dayEvents.filter((event) => event.eventType !== "custom");
            const visible = regularEvents.slice(0, 3);
            const extra = regularEvents.length - 3;

            return (
              <TouchableOpacity
                key={ci}
                onPress={() => onSelectDate(dateStr)}
                activeOpacity={0.7}
                style={[
                  styles.cell,
                  {
                    backgroundColor: isSelected
                      ? colors.primary + "18"
                      : colors.card,
                    borderColor: isSelected ? colors.primary : "transparent",
                    borderWidth: isSelected ? 1.5 : 0,
                  },
                ]}
              >
                {/* Day number */}
                <View style={styles.dayRow}>
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color:
                          ci === 0
                            ? colors.destructive
                            : ci === 6
                            ? colors.primary
                            : colors.text,
                        backgroundColor: isToday ? colors.primary : "transparent",
                      },
                      isToday && styles.todayNum,
                    ]}
                  >
                    {day}
                  </Text>
                  {customEvent && (
                    <Text style={[styles.dayCustomText, { color: CALENDAR_EVENT_COLORS.custom }]} numberOfLines={1} ellipsizeMode="clip">
                      {compactCustomTitle(customEvent)}
                    </Text>
                  )}
                </View>

                {/* Event labels */}
                <View style={styles.eventList}>
                  {visible.map((ev, idx) => {
                    const isDeclared = ev.status === "declared";
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.eventPill,
                          { backgroundColor: CALENDAR_EVENT_COLORS[ev.eventType] + "20" },
                          !isDeclared && styles.eventPillEstimated,
                        ]}
                      >
                        {ev.star ? <Text style={[styles.eventMark, { color: "#F5B731" }]}>★</Text> : null}
                        {ev.heart ? <Text style={[styles.eventMark, { color: "#E07B6A" }]}>♥</Text> : null}
                        <Text
                          style={[
                            styles.eventLabel,
                            { color: CALENDAR_EVENT_COLORS[ev.eventType] },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="clip"
                        >
                          {ev.ticker}
                        </Text>
                      </View>
                    );
                  })}
                  {extra > 0 && (
                    <Text style={[styles.extraLabel, { color: colors.textSub }]}>+{extra}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function compactCustomTitle(event: CalendarEvent) {
  return (event.customTitle ?? event.memo ?? event.shortLabel).replace(/\s+/g, "").slice(0, 8);
}

function getEventMarkPriority(event: CalendarEvent) {
  if (event.star && event.heart) return 0;
  if (event.star) return 1;
  if (event.heart) return 2;
  return 3;
}

const styles = StyleSheet.create({
  grid: { gap: 0 },
  dayHeaders: { flexDirection: "row", paddingBottom: 6 },
  dayHeaderCell: { flex: 1, alignItems: "center" },
  dayHeaderText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", borderTopWidth: 1 },
  cell: {
    flex: 1,
    height: CELL_H,
    padding: 2,
    overflow: "hidden",
    borderRadius: 0,
  },
  dayRow: { flexDirection: "row", marginBottom: 1 },
  dayNum: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    width: 20,
    height: 20,
    textAlign: "center",
    lineHeight: 20,
    borderRadius: 10,
  },
  todayNum: { color: "#FFF", overflow: "hidden" },
  dayCustomText: { flex: 1, fontSize: 8, lineHeight: 18, fontFamily: "Inter_700Bold", marginLeft: 1 },
  eventList: { gap: 2 },
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 15,
    borderRadius: 4,
    paddingHorizontal: 2,
    gap: 1,
  },
  eventPillEstimated: {
    opacity: 0.4,
  },
  eventMark: { flexShrink: 0, fontSize: 8, lineHeight: 12, fontFamily: "Inter_700Bold" },
  eventLabel: { flexShrink: 1, minWidth: 0, fontSize: 9, lineHeight: 12, fontFamily: "Inter_700Bold" },
  extraLabel: { fontSize: 8, fontFamily: "Inter_600SemiBold", paddingLeft: 2 },
});
