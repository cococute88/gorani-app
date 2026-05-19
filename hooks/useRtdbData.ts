import { useQuery } from "@tanstack/react-query";

import { readDividendCalendar, readFavoriteLinks, readSimConfig, readTracker, readTrackerConfig } from "@/services/rtdbReadService";

export function useTrackerQuery(email?: string | null) {
  return useQuery({
    queryKey: ["rtdb", "tracker", email],
    queryFn: () => readTracker(email),
    enabled: Boolean(email),
  });
}

export function useTrackerConfigQuery(email?: string | null) {
  return useQuery({
    queryKey: ["rtdb", "tracker_config", email],
    queryFn: () => readTrackerConfig(email),
    enabled: Boolean(email),
  });
}

export function useSimConfigQuery(email?: string | null) {
  return useQuery({
    queryKey: ["rtdb", "sim_config", email],
    queryFn: () => readSimConfig(email),
    enabled: Boolean(email),
  });
}

export function useFavoriteLinksQuery(email?: string | null) {
  return useQuery({
    queryKey: ["rtdb", "favorite_links", email],
    queryFn: () => readFavoriteLinks(email),
    enabled: Boolean(email),
  });
}

export function useDividendCalendarQuery(email?: string | null) {
  return useQuery({
    queryKey: ["rtdb", "dividend_calendar", email],
    queryFn: () => readDividendCalendar(email),
    enabled: Boolean(email),
  });
}
