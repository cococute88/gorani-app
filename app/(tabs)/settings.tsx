import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { settingsData } from "@/data/dummyData";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signIn, signOut } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState(settingsData.notifEnabled);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const authUser = await signIn();
      Alert.alert("로그인 완료", `${authUser.email} 계정으로 로그인되었어요.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google 로그인 중 오류가 발생했습니다.";
      Alert.alert("로그인 실패", message);
    }
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      await signOut();
      Alert.alert("로그아웃", "안전하게 로그아웃되었습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "로그아웃 중 오류가 발생했습니다.";
      Alert.alert("로그아웃 실패", message);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "28" }]}> 
          <Text style={styles.avatarText}>🦌</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>{settingsData.name}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSub }]}>{user?.email ?? settingsData.email}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.googleBtn, { borderColor: colors.border }]}
        onPress={handleGoogleLogin}
        activeOpacity={0.8}
      >
        <Feather name="log-in" size={18} color={colors.secondary} />
        <Text style={[styles.googleBtnText, { color: colors.secondary }]}>{user ? "Google 로그인 완료" : "Google로 로그인"}</Text>
        <Text style={[styles.googleBtnSub, { color: colors.textSub }]}>{user ? "Firebase Auth 연동됨" : "Development Build 필요"}</Text>
      </TouchableOpacity>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="bell" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>알림 설정</Text>
              <Text style={[styles.settingValue, { color: colors.textSub }]}>로컬 알림 추후 연결</Text>
            </View>
          </View>
          <Switch value={notifEnabled} onValueChange={setNotifEnabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>로그아웃</Text>
      </TouchableOpacity>

      <Text style={[styles.footer, { color: colors.textSub }]}>고라니 투자비서 — v{settingsData.appVersion.split(" ")[0]}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profileCard: { borderRadius: 16, padding: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 16, shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 30 },
  profileInfo: { gap: 4 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  googleBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 16, borderWidth: 1.5, minHeight: 56 },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  googleBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden", shadowColor: "#3D2B1F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, minHeight: 60 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingValue: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, padding: 16, borderWidth: 1, minHeight: 52, marginTop: 4 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4, marginBottom: 4 },
});
