import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from "@firebase/auth";

import { getFirebaseAuth } from "@/services/firebase";

export type AuthUserInfo = {
  uid: string;
  email: string;
  displayName?: string | null;
};

export function configureGoogleSignin() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId) {
    throw new Error(
      "Google Web Client ID(EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)가 없습니다. README 설정 후 다시 시도해 주세요.",
    );
  }

  GoogleSignin.configure({ webClientId });
}

export async function signInWithGoogle(): Promise<AuthUserInfo> {
  configureGoogleSignin();
  await GoogleSignin.hasPlayServices();

  const googleResult = await GoogleSignin.signIn();
  const idToken = googleResult.data?.idToken;

  if (!idToken) {
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
