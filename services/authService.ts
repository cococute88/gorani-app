import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from "firebase/auth";

import { getFirebaseAuth } from "@/services/firebase";

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
let isGoogleSignInConfigured = false;

export type AuthFailureStage =
  | "env"
  | "playServices"
  | "googleSignin"
  | "idToken"
  | "firebaseCredential"
  | "firebaseEmail"
  | "signOut";

export type AuthUserInfo = {
  uid: string;
  email: string;
  displayName?: string | null;
};

export class AuthDiagnosticError extends Error {
  stage: AuthFailureStage;
  cause?: unknown;

  constructor(stage: AuthFailureStage, message: string, cause?: unknown) {
    super(message);
    this.name = "AuthDiagnosticError";
    this.stage = stage;
    this.cause = cause;
  }
}

const AUTH_STAGE_LABELS: Record<AuthFailureStage, string> = {
  env: "환경변수/클라이언트 설정",
  playServices: "Google Play Services 확인",
  googleSignin: "Google 계정 로그인",
  idToken: "Google idToken 수신",
  firebaseCredential: "Firebase credential 로그인",
  firebaseEmail: "Firebase 사용자 이메일 확인",
  signOut: "Google/Firebase 로그아웃",
};

export function getGoogleAuthEnvDiagnostics() {
  return {
    hasGoogleWebClientId: Boolean(googleWebClientId),
  };
}

function getRawErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { code?: unknown; message?: unknown };
    const code = typeof maybeError.code === "string" ? maybeError.code : undefined;
    const message = typeof maybeError.message === "string" ? maybeError.message : undefined;

    if (code && message) {
      return `${code}: ${message}`;
    }
    if (message) {
      return message;
    }
    if (code) {
      return code;
    }
  }

  return "알 수 없는 오류";
}

function withDiagnostic(stage: AuthFailureStage, message: string, error: unknown): AuthDiagnosticError {
  if (error instanceof AuthDiagnosticError) {
    return error;
  }

  return new AuthDiagnosticError(stage, `${message}\n\n세부 오류: ${getRawErrorMessage(error)}`, error);
}

export function formatAuthErrorForUser(error: unknown): string {
  if (error instanceof AuthDiagnosticError) {
    return `[${AUTH_STAGE_LABELS[error.stage]}]\n${error.message}`;
  }

  return `[로그인 처리]\n${getRawErrorMessage(error)}`;
}

export function ensureGoogleSignInConfigured() {
  if (!googleWebClientId) {
    throw new AuthDiagnosticError(
      "env",
      "Google Web Client ID(EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)가 없습니다. README 설정 후 다시 시도해 주세요.",
    );
  }

  if (isGoogleSignInConfigured) {
    return;
  }

  GoogleSignin.configure({ webClientId: googleWebClientId });
  isGoogleSignInConfigured = true;
}

export function configureGoogleSignin() {
  ensureGoogleSignInConfigured();
}

export async function signInWithGoogle(): Promise<AuthUserInfo> {
  try {
    ensureGoogleSignInConfigured();
  } catch (error) {
    throw withDiagnostic("env", "Google 로그인 환경변수를 확인하지 못했습니다.", error);
  }

  try {
    await GoogleSignin.hasPlayServices();
  } catch (error) {
    throw withDiagnostic(
      "playServices",
      "Google Play Services 확인에 실패했습니다. 실기기/에뮬레이터에 Google Play Services가 설치되어 있고 최신 상태인지 확인해 주세요.",
      error,
    );
  }

  let googleResult: Awaited<ReturnType<typeof GoogleSignin.signIn>>;
  try {
    googleResult = await GoogleSignin.signIn();
  } catch (error) {
    throw withDiagnostic(
      "googleSignin",
      "Google 계정 로그인 창에서 오류가 발생했습니다. Development Build, OAuth Client, SHA-1 설정을 확인해 주세요.",
      error,
    );
  }
  const idToken = googleResult.data?.idToken;

  if (!idToken) {
    throw new AuthDiagnosticError(
      "idToken",
      "Google idToken을 받지 못했습니다. EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID가 Web Client ID인지, Firebase Android 앱 SHA-1이 등록되어 있는지 확인해 주세요.",
    );
  }

  const credential = GoogleAuthProvider.credential(idToken);
  let userCredential: Awaited<ReturnType<typeof signInWithCredential>>;
  try {
    const firebaseAuth = getFirebaseAuth();
    userCredential = await signInWithCredential(firebaseAuth, credential);
  } catch (error) {
    const message = getRawErrorMessage(error).includes("Firebase 설정값 누락")
      ? "Firebase 환경변수 설정이 누락되어 Firebase Auth 로그인을 진행하지 못했습니다."
      : "Firebase Auth credential 로그인에 실패했습니다. Firebase Authentication의 Google provider, Android SHA-1, google-services.json을 확인해 주세요.";
    const stage: AuthFailureStage = getRawErrorMessage(error).includes("Firebase 설정값 누락")
      ? "env"
      : "firebaseCredential";
    throw withDiagnostic(stage, message, error);
  }
  const email = userCredential.user.email;

  if (!email) {
    throw new AuthDiagnosticError(
      "firebaseEmail",
      "Firebase Auth 사용자 이메일이 없습니다. Google 계정 권한과 Firebase Auth 사용자 정보를 확인해 주세요.",
    );
  }

  return {
    uid: userCredential.user.uid,
    email,
    displayName: userCredential.user.displayName,
  };
}

export async function signOutFromGoogle(): Promise<void> {
  let canTryGoogleSignOut = true;

  try {
    ensureGoogleSignInConfigured();
  } catch (error) {
    canTryGoogleSignOut = false;
    console.warn("[authService] Google Sign-In 로그아웃 설정 확인 실패:", error);
  }

  try {
    const firebaseAuth = getFirebaseAuth();
    await firebaseSignOut(firebaseAuth);
  } catch (error) {
    throw withDiagnostic("signOut", "Firebase 로그아웃 처리 중 오류가 발생했습니다.", error);
  }

  if (!canTryGoogleSignOut) {
    return;
  }

  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn("[authService] Google Sign-In 로그아웃은 실패했지만 Firebase 로그아웃은 완료되었습니다:", error);
  }
}

export function getCurrentAuthUser(): AuthUserInfo | null {
  try {
    const firebaseAuth = getFirebaseAuth();
    const currentUser = firebaseAuth.currentUser;

    if (!currentUser?.email) {
      return null;
    }

    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
    };
  } catch (error) {
    console.error("[authService] 현재 로그인 사용자 조회 실패:", error);
    return null;
  }
}
