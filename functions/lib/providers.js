"use strict";
/**
 * Polygon / Finnhub 배당 일정 fetch 모듈.
 *
 * 보안:
 * - API key는 functions.params.defineSecret에서 받은 값으로만 호출 시점에 주입
 * - 절대 로그에 출력하지 않음
 * - key 미설정 시 해당 provider는 skip하고 빈 배열 반환
 *
 * 결과 row 형태(공통):
 *   {
 *     ticker: string,
 *     eventType: "Ex-Div" | "Pay" | "Buy",
 *     date: string,           // YYYY-MM-DD
 *     buyDate?: string,
 *     exDate?: string,
 *     payDate?: string,
 *     dividend?: number,
 *     status: "declared" | "estimated",
 *     source: "polygon" | "finnhub",
 *   }
 *
 * - 모바일 normalizeDividendCalendar.ts가 읽을 수 있는 키 이름을 사용한다.
 * - record 단위로 전달하면 normalize 쪽에서 Buy/Ex-Div/Pay 3개 plan으로 펼쳐 처리하므로
 *   여기서는 ticker별로 한 record(또는 ex_date 기준 record)로 묶어 반환한다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeProviderEvents = exports.fetchFinnhubDividends = exports.fetchPolygonDividends = void 0;
const FETCH_TIMEOUT_MS = 30000;
function withTimeout(promise, ms) {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Provider request timed out")), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timer)
            clearTimeout(timer);
    });
}
function toIsoDate(value) {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    if (!trimmed)
        return undefined;
    // 이미 YYYY-MM-DD 형태면 그대로 사용
    const match = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    if (match) {
        return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    }
    // ISO 또는 unix timestamp 처리
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime()))
        return undefined;
    return parsed.toISOString().split("T")[0];
}
function getPrevTradingDate(dateKey) {
    if (!dateKey)
        return undefined;
    const d = new Date(`${dateKey}T00:00:00Z`);
    if (Number.isNaN(d.getTime()))
        return undefined;
    do {
        d.setUTCDate(d.getUTCDate() - 1);
    } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
    return d.toISOString().split("T")[0];
}
/**
 * Polygon dividends API (https://polygon.io/docs/stocks/get_v3_reference_dividends)
 * 무료 플랜에서도 호출 가능. ticker별로 ex_dividend_date 기준 정렬.
 */
async function fetchPolygonDividends(tickers, apiKey) {
    if (!apiKey || tickers.length === 0)
        return [];
    const events = [];
    // Polygon은 ticker 단일 쿼리. 동시성 5 정도로 처리.
    const concurrency = 5;
    for (let i = 0; i < tickers.length; i += concurrency) {
        const slice = tickers.slice(i, i + concurrency);
        const results = await Promise.allSettled(slice.map((ticker) => fetchPolygonForTicker(ticker, apiKey)));
        for (const r of results) {
            if (r.status === "fulfilled")
                events.push(...r.value);
        }
    }
    return events;
}
exports.fetchPolygonDividends = fetchPolygonDividends;
async function fetchPolygonForTicker(ticker, apiKey) {
    const upperTicker = ticker.toUpperCase();
    const url = new URL("https://api.polygon.io/v3/reference/dividends");
    url.searchParams.set("ticker", upperTicker);
    url.searchParams.set("limit", "10");
    url.searchParams.set("order", "desc");
    url.searchParams.set("sort", "ex_dividend_date");
    url.searchParams.set("apiKey", apiKey);
    const res = await withTimeout(fetch(url.toString()), FETCH_TIMEOUT_MS);
    if (!res.ok) {
        return [];
    }
    const json = (await res.json());
    if (!json.results || !Array.isArray(json.results))
        return [];
    const events = [];
    for (const raw of json.results) {
        const exDate = toIsoDate(raw.ex_dividend_date);
        const payDate = toIsoDate(raw.pay_date);
        const declarationDate = toIsoDate(raw.declaration_date);
        const dividendAmount = typeof raw.cash_amount === "number" ? raw.cash_amount : undefined;
        if (!exDate)
            continue;
        const buyDate = getPrevTradingDate(exDate);
        const status = declarationDate ? "declared" : "estimated";
        events.push({
            ticker: upperTicker,
            eventType: "Ex-Div",
            date: exDate,
            exDate,
            buyDate,
            payDate,
            dividend: dividendAmount,
            status,
            source: "polygon",
        });
    }
    return events;
}
/**
 * Finnhub dividends API (https://finnhub.io/docs/api/stock-dividends-2)
 * 1년 범위로 조회. 무료 plan: stock-dividends-2 호환.
 */
async function fetchFinnhubDividends(tickers, apiKey) {
    if (!apiKey || tickers.length === 0)
        return [];
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setFullYear(today.getFullYear() - 1);
    const toDate = new Date(today);
    toDate.setFullYear(today.getFullYear() + 1);
    const from = fromDate.toISOString().split("T")[0];
    const to = toDate.toISOString().split("T")[0];
    const events = [];
    const concurrency = 5;
    for (let i = 0; i < tickers.length; i += concurrency) {
        const slice = tickers.slice(i, i + concurrency);
        const results = await Promise.allSettled(slice.map((ticker) => fetchFinnhubForTicker(ticker, from, to, apiKey)));
        for (const r of results) {
            if (r.status === "fulfilled")
                events.push(...r.value);
        }
    }
    return events;
}
exports.fetchFinnhubDividends = fetchFinnhubDividends;
async function fetchFinnhubForTicker(ticker, from, to, apiKey) {
    const upperTicker = ticker.toUpperCase();
    const url = new URL("https://finnhub.io/api/v1/stock/dividend2");
    url.searchParams.set("symbol", upperTicker);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    url.searchParams.set("token", apiKey);
    const res = await withTimeout(fetch(url.toString()), FETCH_TIMEOUT_MS);
    if (!res.ok) {
        return [];
    }
    const json = (await res.json());
    const list = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
    const events = [];
    for (const raw of list) {
        const exDate = toIsoDate(raw.exDate ?? raw.ex_date ?? raw.date);
        const payDate = toIsoDate(raw.payDate ?? raw.pay_date ?? raw.payment_date);
        const dividendAmount = typeof raw.amount === "number" ? raw.amount : typeof raw.dividend === "number" ? raw.dividend : undefined;
        if (!exDate)
            continue;
        const buyDate = getPrevTradingDate(exDate);
        events.push({
            ticker: upperTicker,
            eventType: "Ex-Div",
            date: exDate,
            exDate,
            buyDate,
            payDate,
            dividend: dividendAmount,
            status: "estimated",
            source: "finnhub",
        });
    }
    return events;
}
/**
 * 두 provider 결과 합치기 + 중복 제거.
 * (ticker, exDate) 기준으로 dedupe하되, polygon 데이터를 우선.
 * dividend amount/payDate가 비어 있는 record는 다른 provider 값으로 보강.
 */
function mergeProviderEvents(events) {
    const map = new Map();
    // polygon 먼저 등록되도록 정렬 안정성 보장
    const sorted = [...events].sort((a, b) => {
        if (a.source === b.source)
            return 0;
        return a.source === "polygon" ? -1 : 1;
    });
    for (const ev of sorted) {
        const key = `${ev.ticker}:${ev.exDate ?? ev.date}`;
        const existing = map.get(key);
        if (!existing) {
            map.set(key, ev);
            continue;
        }
        map.set(key, {
            ...existing,
            payDate: existing.payDate ?? ev.payDate,
            buyDate: existing.buyDate ?? ev.buyDate,
            dividend: existing.dividend ?? ev.dividend,
            status: existing.status === "declared" ? "declared" : ev.status,
        });
    }
    return Array.from(map.values());
}
exports.mergeProviderEvents = mergeProviderEvents;
//# sourceMappingURL=providers.js.map