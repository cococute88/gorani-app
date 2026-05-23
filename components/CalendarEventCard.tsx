import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CalendarEvent, EventType } from "@/data/dummyData";
import { useColors } from "@/hooks/useColors";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  "Ex-Div": "배당락일",
  Pay: "배당 입금 예상",
  Buy: "매수/체크",
  Earn: "실적/메모",
  custom: "커스텀",
};

const EVENT_COLORS: Record<EventType, string> = {
  "Ex-Div": "#E07B6A",
  Pay: "#6AAB82",
  Buy: "#C9A96E",
  Earn: "#8B6F47",
  custom: "#4E8FD6",
};

interface CalendarEventCardProps {
  event: CalendarEvent;
}

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  const colors = useColors();
  const typeColor = EVENT_COLORS[event.eventType];
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: typeColor },
      ]}
    >
      <View style={[styles.typePill, { backgroundColor: typeColor + "18" }]}>
        <Text style={[styles.typeText, { color: typeColor }]}>
          {EVENT_TYPE_LABELS[event.eventType]}
        </Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{event.customTitle ?? event.shortLabel}</Text>
      {event.ticker && (
        <Text style={[styles.ticker, { color: colors.secondary }]}>{event.ticker}</Text>
      )}
      {event.memo && (
        <Text style={[styles.memo, { color: colors.textSub }]}>{event.memo}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 6,
  },
  typePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  ticker: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  memo: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
