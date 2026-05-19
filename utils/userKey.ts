export function validateEmailForFirebase(email?: string | null): string {
  const normalized = email?.trim().toLowerCase();

  if (!normalized) {
    throw new Error("로그인 이메일이 없어 Firebase 경로를 만들 수 없습니다. Google 로그인 후 다시 시도해 주세요.");
  }

  return normalized;
}

export function toSafeUidAtDot(email: string): string {
  const validated = validateEmailForFirebase(email);
  return validated.replace(/@/g, "_").replace(/\./g, "_");
}

export function toSafeUidDotOnly(email: string): string {
  const validated = validateEmailForFirebase(email);
  return validated.replace(/\./g, "_");
}
