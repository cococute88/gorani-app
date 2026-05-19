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
  const [user, setUser] = useState<AuthUserInfo | null>(() => getCurrentAuthUser());
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
      setUser(getCurrentAuthUser());
    },
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
