/**
 * Dividend Calendar 일정 최신화 서비스
 *
 * 모바일 앱은 외부 배당 API를 직접 호출하지 않습니다.
 * 대신 backend endpoint(서버 함수)가 다음을 담당합니다:
 *   1) 외부 배당 API(Polygon/Finnhub/Nasdaq 등) 호출 및 정규화
 *   2) Firebase RTDB의 users/{safeUid}/dividend_calendar 업데이트
 *
 * 모바일 앱은 이 서비스 함수로 endpoint만 호출하고,
 * 성공 후에는 useDividendCalendarQuery를 invalidate하여 화면을 갱신합니다.
 *
 * 보안 원칙:
 * - 외부 API key를 모바일 앱에 절대 포함하지 않음
 * - endpoint URL은 EXPO_PUBLIC_DIVIDEND_REFRESH_ENDPOINT 환경변수에서 읽음
 *   (URL 자체는 비공개 정보가 아니므로 EXPO_PUBLIC_ 사용 허용)
 * - endpoint가 설정되지 않은 경우 명확한 안내 메시지를 반환
 */

const REFRESH_ENDPOINT = process.env.EXPO_PUBLIC_DIVIDEND_REFRESH_ENDPOINT;
const REFRESH_TIMEOUT_MS = 60_000;

export type RefreshResult =
  | { ok: true; updated?: number; message?: string }
  | { ok: false; reason: "not_configured" | "no_email" | "network" | "server" | "unknown"; message: string };

export function isRefreshEndpointConfigured(): boolean {
  return Boolean(REFRESH_ENDPOINT && REFRESH_ENDPOINT.trim().length > 0);
}

export async function refreshDividendCalendar(email: string | null | undefined): Promise<RefreshResult> {
  if (!email) {
    return {
      ok: false,
      reason: "no_email",
      message: "로그인 후 일정 최신화가 가능합니다.",
    };
  }

  if (!isRefreshEndpointConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "일정 최신화 API가 아직 연결되지 않았습니다. backend endpoint를 설정한 뒤 EXPO_PUBLIC_DIVIDEND_REFRESH_ENDPOINT 환경변수에 등록해 주세요.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

  try {
    const response = await fetch(REFRESH_ENDPOINT as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        reason: "server",
        message: `서버 응답 오류 (${response.status}). ${text || "잠시 후 다시 시도해 주세요."}`,
      };
    }

    let payload: { updated?: number; message?: string } = {};
    try {
      payload = (await response.json()) as { updated?: number; message?: string };
    } catch {
      // JSON이 아닐 수도 있음 — 성공 200으로 간주
    }

    return {
      ok: true,
      updated: payload.updated,
      message: payload.message ?? "일정 최신화가 완료되었습니다.",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        reason: "network",
        message: "요청 시간이 초과되었습니다. 네트워크를 확인 후 다시 시도해 주세요.",
      };
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return {
      ok: false,
      reason: "unknown",
      message: `일정 최신화 실패: ${message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
