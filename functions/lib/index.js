"use strict";
/**
 * Firebase Functions: refreshDividendCalendar
 *
 * Mobile App → POST /refreshDividendCalendar
 *   Headers:
 *     Authorization: Bearer <Firebase ID token>
 *     Content-Type: application/json
 *   Body (참고용):
 *     { email: string }
 *
 * Backend 동작:
 *   1) Authorization Bearer ID token 검증 (admin.auth().verifyIdToken)
 *   2) 검증된 token.email 기준으로 safeUid 생성 (body.email 무시)
 *   3) users/{safeUid}/dividend_calendar 노드에서 기존 ticker 목록 추출
 *   4) Polygon/Finnhub Secret 사용해 배당 일정 fetch
 *   5) 결과를 normalizeDividendCalendar.ts가 읽을 수 있는 record 배열로 변환
 *   6) RTDB users/{safeUid}/dividend_calendar/cached_events에만 set
 *      → memos / marks / custom_ce / portfolios 같은 사용자 편집 노드는 절대 건드리지 않음
 *   7) 응답: { success: true, updated: number, message: string }
 *
 * 주의:
 * - dividend_calendar 전체를 set()으로 덮어쓰지 않는다.
 * - cached_events 노드만 set()으로 갱신.
 * - Secret 미설정 시 해당 provider는 skip.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshDividendCalendar = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const database_1 = require("firebase-admin/database");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const v2_1 = require("firebase-functions/v2");
const providers_1 = require("./providers");
const userKey_1 = require("./userKey");
(0, app_1.initializeApp)();
const POLYGON_API_KEY = (0, params_1.defineSecret)("POLYGON_API_KEY");
const FINNHUB_API_KEY = (0, params_1.defineSecret)("FINNHUB_API_KEY");
const FALLBACK_TICKERS = [
    "APAM",
    "CHRD",
    "SGOV",
    "TROW",
    "IVZ",
];
function jsonResponse(res, statusCode, payload) {
    res.status(statusCode).set("Content-Type", "application/json").send(JSON.stringify(payload));
}
async function extractKnownTickers(databaseUrl, safeUid) {
    try {
        const db = (0, database_1.getDatabase)();
        const snap = await db.ref(`users/${safeUid}/dividend_calendar`).get();
        if (!snap.exists())
            return [];
        const data = snap.val();
        const collected = new Set();
        collectTickers(data, collected);
        return Array.from(collected).filter((t) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(t));
    }
    catch (error) {
        v2_1.logger.warn("[refreshDividendCalendar] failed to read existing tickers", { databaseUrl, error });
        return [];
    }
}
function collectTickers(node, out, depth = 0) {
    if (depth > 6 || node === null || node === undefined)
        return;
    if (typeof node === "string")
        return;
    if (Array.isArray(node)) {
        node.forEach((item) => collectTickers(item, out, depth + 1));
        return;
    }
    if (typeof node !== "object")
        return;
    const record = node;
    // direct ticker field
    const ticker = record.ticker ?? record.symbol;
    if (typeof ticker === "string" && ticker.trim().length > 0) {
        out.add(ticker.trim().toUpperCase());
    }
    // memos는 ticker key를 그대로 사용
    if (record.memos && typeof record.memos === "object" && !Array.isArray(record.memos)) {
        Object.keys(record.memos).forEach((k) => {
            const upper = k.trim().toUpperCase();
            if (upper && upper !== "_EMPTY_DICT_")
                out.add(upper);
        });
    }
    Object.entries(record).forEach(([key, value]) => {
        if (key === "memos" || key === "marks" || key === "portfolios")
            return;
        collectTickers(value, out, depth + 1);
    });
}
function toCachedRecord(ev) {
    return {
        ticker: ev.ticker,
        type: ev.eventType,
        date: ev.date,
        exDate: ev.exDate,
        buyDate: ev.buyDate,
        payDate: ev.payDate,
        dividend: ev.dividend,
        status: ev.status,
        source: ev.source,
        updatedAt: Date.now(),
    };
}
exports.refreshDividendCalendar = (0, https_1.onRequest)({
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 120,
    memory: "512MiB",
    secrets: [POLYGON_API_KEY, FINNHUB_API_KEY],
}, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        jsonResponse(res, 405, { success: false, message: "Method Not Allowed" });
        return;
    }
    // 1) Authorization Bearer ID token 검증
    const authHeader = req.get("Authorization") ?? "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        jsonResponse(res, 401, { success: false, message: "Missing Bearer token" });
        return;
    }
    const idToken = match[1];
    let decoded;
    try {
        decoded = await (0, auth_1.getAuth)().verifyIdToken(idToken);
    }
    catch (error) {
        v2_1.logger.warn("[refreshDividendCalendar] verifyIdToken failed", error);
        jsonResponse(res, 401, { success: false, message: "Invalid ID token" });
        return;
    }
    const tokenEmail = decoded.email;
    if (!tokenEmail) {
        jsonResponse(res, 403, { success: false, message: "Token has no email claim" });
        return;
    }
    if (decoded.email_verified === false) {
        jsonResponse(res, 403, { success: false, message: "Email is not verified" });
        return;
    }
    const safeUid = (0, userKey_1.toSafeUidAtDot)(tokenEmail);
    if (!safeUid) {
        jsonResponse(res, 400, { success: false, message: "Cannot derive safeUid" });
        return;
    }
    // 2) 기존 ticker 목록 읽기 (없으면 fallback)
    const existingTickers = await extractKnownTickers(undefined, safeUid);
    const tickers = existingTickers.length > 0 ? existingTickers : FALLBACK_TICKERS;
    // 3) Provider 호출 (Secret이 없으면 skip)
    const polygonKey = process.env.POLYGON_API_KEY ?? "";
    const finnhubKey = process.env.FINNHUB_API_KEY ?? "";
    const [polygonEvents, finnhubEvents] = await Promise.all([
        (0, providers_1.fetchPolygonDividends)(tickers, polygonKey).catch((error) => {
            v2_1.logger.warn("[refreshDividendCalendar] polygon fetch error", error);
            return [];
        }),
        (0, providers_1.fetchFinnhubDividends)(tickers, finnhubKey).catch((error) => {
            v2_1.logger.warn("[refreshDividendCalendar] finnhub fetch error", error);
            return [];
        }),
    ]);
    const merged = (0, providers_1.mergeProviderEvents)([...polygonEvents, ...finnhubEvents]);
    if (merged.length === 0) {
        jsonResponse(res, 200, {
            success: true,
            updated: 0,
            message: "최신 일정이 없거나 외부 API key가 설정되지 않아 추가된 일정이 없습니다. (기존 데이터는 그대로 유지)",
        });
        return;
    }
    // 4) cached_events에만 set (memos/marks/custom_ce/portfolios는 절대 건드리지 않음)
    const cachedMap = {};
    for (const ev of merged) {
        const safeKey = `${ev.ticker}_${ev.exDate ?? ev.date}_${ev.source}`.replace(/[.#$/[\]]/g, "_");
        cachedMap[safeKey] = toCachedRecord(ev);
    }
    try {
        const db = (0, database_1.getDatabase)();
        // child path만 set → 부모 dividend_calendar 전체를 덮어쓰지 않음
        await db.ref(`users/${safeUid}/dividend_calendar/cached_events`).set(cachedMap);
        // 마지막 갱신 시각도 별도 child path에만 기록
        await db.ref(`users/${safeUid}/dividend_calendar/last_refreshed_at`).set(Date.now());
    }
    catch (error) {
        v2_1.logger.error("[refreshDividendCalendar] RTDB write failed", error);
        jsonResponse(res, 500, { success: false, message: "Failed to update dividend calendar" });
        return;
    }
    jsonResponse(res, 200, {
        success: true,
        updated: merged.length,
        message: `${merged.length}건의 배당 일정을 갱신했습니다.`,
    });
});
//# sourceMappingURL=index.js.map