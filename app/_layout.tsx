import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CustomSplashScreen } from "@/components/CustomSplashScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";

// Prevent the native splash screen from auto-hiding.
// We hide it immediately when the RN root mounts so the custom splash takes over.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const nativeHidden = useRef(false);

  // Hide native splash immediately on mount.
  // This is the earliest possible moment in JS — right after the bundle loads.
  useEffect(() => {
    if (!nativeHidden.current) {
      nativeHidden.current = true;
      // Use requestAnimationFrame to ensure the custom splash view
      // has been committed to the screen before hiding the native one.
      requestAnimationFrame(() => {
        SplashScreen.hideAsync();
      });
    }
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowCustomSplash(false);
  }, []);

  // Always render the custom splash as an overlay regardless of font loading state.
  // This way the fullscreen splash-gorani.png is visible from the very first frame,
  // and fonts/auth/data load behind it.
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                {(fontsLoaded || fontError) && <RootLayoutNav />}
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
      {showCustomSplash && (
        <CustomSplashScreen onFinish={handleSplashFinish} />
      )}
    </SafeAreaProvider>
  );
}
