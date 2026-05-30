const MAX_ID_PART_LENGTH = 80;

export function sanitizeNotificationIdPart(value: string): string {
  const sanitized = value
    .normalize("NFKC")
    .trim()
    .replace(/[^\p{L}\p{N}-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return (sanitized || "x").slice(0, MAX_ID_PART_LENGTH);
}

export function buildDateNotificationId(params: {
  ruleId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}): string {
  return [
    "gf_local_date",
    sanitizeNotificationIdPart(params.ruleId),
    sanitizeNotificationIdPart(params.date),
    sanitizeNotificationIdPart(params.time.replace(":", "")),
  ].join("_");
}

export function buildCalendarNotificationId(params: {
  eventId: string;
  ticker: string;
  kind: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}): string {
  return [
    "gf_local_event",
    sanitizeNotificationIdPart(params.eventId),
    sanitizeNotificationIdPart(params.ticker),
    sanitizeNotificationIdPart(params.kind),
    sanitizeNotificationIdPart(params.date),
    sanitizeNotificationIdPart(params.time.replace(":", "")),
  ].join("_");
}
