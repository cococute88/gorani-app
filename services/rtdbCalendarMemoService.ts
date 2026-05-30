import { remove, ref, set } from "firebase/database";

import { getFirebaseDb } from "@/services/firebase";
import { toSafeUidAtDot, validateEmailForFirebase } from "@/utils/userKey";

/**
 * dividend_calendar.memos map에서 한 ticker의 메모만 안전하게 갱신/삭제합니다.
 *
 * 저장 경로: users/{safeUid}/dividend_calendar/memos/{TICKER}
 *
 * - ticker는 대문자로 정규화
 * - 빈 문자열은 해당 ticker 노드만 remove (다른 ticker 메모는 보존)
 * - 일반 문자열은 해당 ticker 노드만 set (다른 ticker 메모는 보존)
 *
 * 부모 memos map 전체를 덮어쓰지 않도록 항상 자식 경로에 직접 쓴다.
 */
export async function writeTickerMemo(
  email: string | null | undefined,
  ticker: string,
  memo: string,
): Promise<void> {
  const validatedEmail = validateEmailForFirebase(email);
  const safeUid = toSafeUidAtDot(validatedEmail);
  const upperTicker = ticker.trim().toUpperCase();

  if (!upperTicker) {
    throw new Error("ticker 값이 비어 있어 메모를 저장할 수 없습니다.");
  }

  const path = `users/${safeUid}/dividend_calendar/memos/${upperTicker}`;
  const memoRef = ref(getFirebaseDb(), path);
  const trimmed = memo.trim();

  if (trimmed.length === 0) {
    await remove(memoRef);
    return;
  }

  await set(memoRef, trimmed);
}
