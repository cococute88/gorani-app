import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 80,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "홈", tabBarIcon: ({ color }) => <Feather name="home" size={21} color={color} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: "캘린더", tabBarIcon: ({ color }) => <Feather name="calendar" size={21} color={color} /> }}
      />
      <Tabs.Screen
        name="asset"
        options={{ title: "자산", tabBarIcon: ({ color }) => <Feather name="briefcase" size={21} color={color} /> }}
      />
      <Tabs.Screen
        name="simulator"
        options={{ title: "시뮬레이터", tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={21} color={color} /> }}
      />
      <Tabs.Screen
        name="calculator"
        options={{ title: "계산기", tabBarIcon: ({ color }) => <Feather name="percent" size={21} color={color} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "알림",
          tabBarIcon: ({ color }) => <Feather name="bell" size={21} color={color} />,
        }}
      />
      {/* 탭 바에 표시하지 않는 화면 */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="watchlist" options={{ href: null }} />
      <Tabs.Screen name="dividend" options={{ href: null }} />
      <Tabs.Screen name="checklist" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({});
