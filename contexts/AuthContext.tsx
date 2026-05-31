import React, { createContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "@firebase/auth";

import { getFirebaseAuth } from "@/services/firebase";
import {
  getCurrentAuthUser,
  signInWithGoogle,
  signOutFromGoogle,
  toAuthUserInfo,
  type AuthUserInfo,
} from "@/services/authService";

type AuthContextValue = {
  user: AuthUserInfo | null;
  isLoading: boolean;
  signIn: () => Promise<AuthUserInfo>;
  signOut: () => Promise<void>;
  refreshUser: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      const firebaseAuth = getFirebaseAuth();
      console.log("[Auth] currentUser at startup", Boolean(firebaseAuth.currentUser));

      unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
        const nextUser = toAuthUserInfo(firebaseUser);
        console.log("[Auth] onAuthStateChanged", {
          hasUser: Boolean(firebaseUser),
          email: nextUser?.email ?? null,
        });
        setUser(nextUser);
        setIsAuthReady(true);
        setIsLoading(false);
      });
    } catch (error) {
      console.error("[AuthProvider] 초기 사용자 조회 실패:", error);
      setUser(null);
      setIsAuthReady(true);
      setIsLoading(false);
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    signIn: async () => {
      setIsLoading(true);
      try {
        const nextUser = await signInWithGoogle();
        setUser(nextUser);
        return nextUser;
      } finally {
        setIsLoading(false);
      }
    },
    signOut: async () => {
      setIsLoading(true);
      try {
        await signOutFromGoogle();
        setUser(null);
      } finally {
        setIsLoading(false);
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
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{isAuthReady ? children : null}</AuthContext.Provider>;
}
