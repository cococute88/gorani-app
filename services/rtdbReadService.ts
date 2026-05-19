import { get, ref } from "firebase/database";

import { getFirebaseDb } from "@/services/firebase";
import { toSafeUidAtDot, toSafeUidDotOnly, validateEmailForFirebase } from "@/utils/userKey";

async function readPath<T>(path: string): Promise<T | null> {
  const db = getFirebaseDb();
  const snapshot = await get(ref(db, path));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.val() as T;
}

export async function readDividendCalendar<T = unknown>(email?: string | null): Promise<T | null> {
  const validEmail = validateEmailForFirebase(email);
  const safeUid = toSafeUidAtDot(validEmail);
  return readPath<T>(`users/${safeUid}/dividend_calendar`);
}

export async function readTracker<T = unknown>(email?: string | null): Promise<T | null> {
  const validEmail = validateEmailForFirebase(email);
  const safeUid = toSafeUidAtDot(validEmail);
  return readPath<T>(`users/${safeUid}/tracker`);
}

export async function readTrackerConfig<T = unknown>(email?: string | null): Promise<T | null> {
  const validEmail = validateEmailForFirebase(email);
  const safeUid = toSafeUidAtDot(validEmail);
  return readPath<T>(`users/${safeUid}/tracker_config`);
}

export async function readSimConfig<T = unknown>(email?: string | null): Promise<T | null> {
  const validEmail = validateEmailForFirebase(email);
  const safeUid = toSafeUidAtDot(validEmail);
  return readPath<T>(`users/${safeUid}/sim_config`);
}

export async function readFavoriteLinks<T = unknown>(email?: string | null): Promise<T | null> {
  const validEmail = validateEmailForFirebase(email);
  const safeUid = toSafeUidDotOnly(validEmail);
  return readPath<T>(`users/${safeUid}/favorite_links`);
}
