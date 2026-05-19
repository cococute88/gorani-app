import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CalendarEvent, EVENT_COLORS, EventType } from "@/data/dummyData";
import { useColors } from "@/hooks/useColors";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const CELL_H = 72;

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  events: CalendarEvent[];
  selectedDate: string | null;
  filter: EventType | "ALL";
  onSelectDate: (date: string) => void;
}

export function CalendarGrid({ year, month, events, selectedDate, filter, onSelectDate }: CalendarGridProps) {
  const colors = useColors();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const filteredEvents = filter === "ALL" ? events : events.filter((e) => e.eventType === filter);

  // Build map: day → events[]
  const eventMap: Record<number, CalendarEvent[]> = {};
  filteredEvents.forEach((e) => {
    const day = parseInt(e.date.split("-")[2], 10);
    if (!eventMap[day]) eventMap[day] = [];
    eventMap[day].push(e);
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
            const visible = dayEvents.slice(0, 2);
            const extra = dayEvents.length - 2;

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
                </View>

                {/* Event labels */}
                <View style={styles.eventList}>
                  {visible.map((ev, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.eventPill,
                        { backgroundColor: EVENT_COLORS[ev.eventType] + "22" },
                      ]}
                    >
                      <View
                        style={[styles.eventDot, { backgroundColor: EVENT_COLORS[ev.eventType] }]}
                      />
                      <Text
                        style={[styles.eventLabel, { color: EVENT_COLORS[ev.eventType] }]}
                        numberOfLines={1}
                      >
                        {ev.shortLabel}
                      </Text>
                    </View>
                  ))}
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

const styles = StyleSheet.create({
  grid: { gap: 0 },
  dayHeaders: { flexDirection: "row", paddingBottom: 6 },
  dayHeaderCell: { flex: 1, alignItems: "center" },
  dayHeaderText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", borderTopWidth: 1 },
  cell: {
    flex: 1,
    height: CELL_H,
    padding: 3,
    overflow: "hidden",
    borderRadius: 0,
  },
  dayRow: { flexDirection: "row", marginBottom: 2 },
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
  eventList: { gap: 2 },
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
  },
  eventDot: { width: 4, height: 4, borderRadius: 2, flexShrink: 0 },
  eventLabel: {
    fontSize: 8,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  extraLabel: { fontSize: 8, fontFamily: "Inter_400Regular", paddingLeft: 2 },
});
