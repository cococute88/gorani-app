import React, { createContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import { getCurrentAuthUser, signInWithGoogle, signOutFromGoogle, type AuthUserInfo } from "@/services/authService";
import { getFirebaseAuth } from "@/services/firebase";

type AuthRestoreStatus = "checking" | "restored" | "signedOut";

type AuthContextValue = {
  user: AuthUserInfo | null;
  isLoading: boolean;
  isAuthReady: boolean;
  authRestoreStatus: AuthRestoreStatus;
  signIn: () => Promise<AuthUserInfo>;
  signOut: () => Promise<void>;
  refreshUser: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUserInfo(firebaseUser: User | null): AuthUserInfo | null {
  if (!firebaseUser?.email) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);
  const isLoading = !isAuthReady || isAuthActionLoading;
  const authRestoreStatus: AuthRestoreStatus = !isAuthReady ? "checking" : user ? "restored" : "signedOut";

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      getFirebaseAuth(),
      (firebaseUser) => {
        if (!isMounted) {
          return;
        }

        setUser(toAuthUserInfo(firebaseUser));
        setIsAuthReady(true);
      },
      (error) => {
        console.error("[AuthProvider] 인증 상태 복원 실패:", error);
        if (isMounted) {
          setUser(null);
          setIsAuthReady(true);
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthReady,
    authRestoreStatus,
    signIn: async () => {
      setIsAuthActionLoading(true);
      try {
        const nextUser = await signInWithGoogle();
        setUser(nextUser);
        return nextUser;
      } finally {
        setIsAuthActionLoading(false);
      }
    },
    signOut: async () => {
      setIsAuthActionLoading(true);
      try {
        await signOutFromGoogle();
        setUser(null);
      } finally {
        setIsAuthActionLoading(false);
      }
    },
    refreshUser: () => {
      try {
        setUser(getCurrentAuthUser());
      } catch (error) {
        console.error("[AuthProvider] 사용자 새로고침 실패:", error);
        setUser(null);
      }
    },
  }), [authRestoreStatus, isAuthReady, isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
