import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from "@firebase/auth";

import { getFirebaseAuth } from "@/services/firebase";

export type AuthUserInfo = {
  uid: string;
  email: string;
  displayName?: string | null;
};

type GoogleSignInResultLike = {
  type?: string;
  idToken?: string | null;
  data?: {
    idToken?: string | null;
  } | null;
};

function getGoogleWebClientId(): string {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

  console.log("[GoogleSignIn] webClientId prefix", webClientId ? webClientId.slice(0, 8) : "missing");

  if (!webClientId) {
    throw new Error(
      "Google Web Client ID(EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)가 없습니다. README 설정 후 다시 시도해 주세요.",
    );
  }

  return webClientId;
}

function getIdTokenFromSignInResult(signInResult: unknown): string | null {
  if (!signInResult || typeof signInResult !== "object") {
    return null;
  }

  const result = signInResult as GoogleSignInResultLike;
  return result.idToken ?? result.data?.idToken ?? null;
}

export function configureGoogleSignin() {
  const webClientId = getGoogleWebClientId();
  GoogleSignin.configure({ webClientId });
}

export async function signInWithGoogle(): Promise<AuthUserInfo> {
  configureGoogleSignin();
  await GoogleSignin.hasPlayServices();

  const googleResult = await GoogleSignin.signIn();
  const googleResultLike = googleResult as GoogleSignInResultLike;

  if (googleResultLike.type === "cancelled") {
    throw new Error("Google 로그인이 취소되었습니다.");
  }

  const signInIdToken = getIdTokenFromSignInResult(googleResult);
  console.log("[GoogleSignIn] signIn idToken present", Boolean(signInIdToken));

  let getTokensIdToken: string | null = null;
  if (!signInIdToken) {
    try {
      const tokens = await GoogleSignin.getTokens();
      getTokensIdToken = tokens.idToken ?? null;
      console.log("[GoogleSignIn] getTokens idToken present", Boolean(getTokensIdToken));
    } catch (error) {
      console.warn("[GoogleSignIn] getTokens fallback failed", error instanceof Error ? error.message : "unknown error");
    }
  }

  const idToken = signInIdToken ?? getTokensIdToken;

  if (!idToken) {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
    console.warn("[GoogleSignIn] Missing idToken", {
      hasWebClientId: Boolean(webClientId),
      webClientIdPrefix: webClientId ? webClientId.slice(0, 8) : "missing",
      signInHasIdToken: Boolean(signInIdToken),
      getTokensHasIdToken: Boolean(getTokensIdToken),
    });
    throw new Error("Google idToken을 받지 못했습니다. OAuth 설정(webClientId 포함)을 확인해 주세요.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const firebaseAuth = getFirebaseAuth();
  const userCredential = await signInWithCredential(firebaseAuth, credential);
  const email = userCredential.user.email;

  if (!email) {
    throw new Error("Firebase Auth 사용자 이메일이 없습니다. Google 계정 권한/설정을 확인해 주세요.");
  }

  return {
    uid: userCredential.user.uid,
    email,
    displayName: userCredential.user.displayName,
  };
}

export async function signOutFromGoogle(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  await firebaseSignOut(firebaseAuth);
  await GoogleSignin.signOut();
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
