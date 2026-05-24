"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSafeUidAtDot = void 0;
/**
 * Firebase RTDB 경로용 safe uid 변환.
 * 모바일 앱(@/utils/userKey.ts)과 동일한 규칙을 사용해야 한다.
 *
 * - email은 trim + 소문자 정규화
 * - "@"와 "."는 모두 "_"로 치환
 *   예) sdf1570@gmail.com → sdf1570_gmail_com
 */
function toSafeUidAtDot(email) {
    const normalized = email.trim().toLowerCase();
    return normalized.replace(/@/g, "_").replace(/\./g, "_");
}
exports.toSafeUidAtDot = toSafeUidAtDot;
//# sourceMappingURL=userKey.js.map