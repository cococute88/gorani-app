import React, { createContext, useMemo, useState } from "react";

import { getCurrentAuthUser, signInWithGoogle, signOutFromGoogle, type AuthUserInfo } from "@/services/authService";

type AuthContextValue = {
  user: AuthUserInfo | null;
  isLoading: boolean;
  signIn: () => Promise<AuthUserInfo>;
  signOut: () => Promise<void>;
  refreshUser: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserInfo | null>(() => {
    try {
      return getCurrentAuthUser();
    } catch (error) {
      console.error("[AuthProvider] 초기 사용자 조회 실패:", error);
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
