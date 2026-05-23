import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { settingsData } from "@/data/dummyData";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { formatAuthErrorForUser, getCurrentAuthUser, getGoogleAuthEnvDiagnostics } from "@/services/authService";
import { getFirebaseEnvDiagnostics } from "@/services/firebase";
import {
  readDividendCalendar,
  readFavoriteLinks,
  readSimConfig,
  readTracker,
  readTrackerConfig,
} from "@/services/rtdbReadService";
import { toSafeUidAtDot, toSafeUidDotOnly } from "@/utils/userKey";

type FirebaseUserStatus = "signedOut" | "checking" | "ready" | "missing";
type RtdbReadStatus = "idle" | "reading" | "success" | "empty" | "failed";

type RtdbDiagnosticKey =
  | "dividend_calendar"
  | "tracker"
  | "tracker_config"
  | "sim_config"
  | "favorite_links";

type RtdbDiagnosticResult = {
  status: RtdbReadStatus;
  detail?: string;
  error?: string;
};

const RTDB_INITIAL_RESULTS: Record<RtdbDiagnosticKey, RtdbDiagnosticResult> = {
  dividend_calendar: { status: "idle" },
  tracker: { status: "idle" },
  tracker_config: { status: "idle" },
  sim_config: { status: "idle" },
  favorite_links: { status: "idle" },
};

const RTDB_STATUS_LABELS: Record<RtdbReadStatus, string> = {
  idle: "대기",
  reading: "읽는 중",
  success: "성공",
  empty: "비어 있음",
  failed: "실패",
};

function summarizeRtdbValue(value: unknown): RtdbDiagnosticResult {
  if (value === null || value === undefined) {
    return { status: "empty", detail: "path not found/null" };
  }

  if (Array.isArray(value)) {
    return { status: "success", detail: `${value.length}개` };
  }

  if (typeof value === "object") {
    return { status: "success", detail: `keys ${Object.keys(value).length}개` };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { status: "success", detail: "값 있음" };
  }

  return { status: "success", detail: "값 있음" };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { code?: unknown; message?: unknown };
    const code = typeof maybeError.code === "string" ? maybeError.code : undefined;
    const message = typeof maybeError.message === "string" ? maybeError.message : undefined;
    return [code, message].filter(Boolean).join(": ") || "알 수 없는 오류";
  }

  return "알 수 없는 오류";
}

function classifyRtdbError(error: unknown): string {
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("permission_denied") || lowerMessage.includes("permission denied")) {
    return `permission denied · ${message}`;
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("offline") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("unavailable")
  ) {
    return `network/unknown error · ${message}`;
  }

  return `network/unknown error · ${message}`;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading: isAuthLoading, authRestoreStatus, signIn, signOut, refreshUser } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState(settingsData.notifEnabled);
  const [firebaseUser, setFirebaseUser] = useState(() => getCurrentAuthUser());
  const [firebaseUserStatus, setFirebaseUserStatus] = useState<FirebaseUserStatus>(firebaseUser ? "ready" : "signedOut");
  const [rtdbResults, setRtdbResults] = useState(RTDB_INITIAL_RESULTS);
  const [rtdbMessage, setRtdbMessage] = useState("");
  const [isRtdbReading, setIsRtdbReading] = useState(false);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const firebaseEnv = getFirebaseEnvDiagnostics();
  const googleAuthEnv = getGoogleAuthEnvDiagnostics();
  const authContextEmail = user?.email ?? "";
  const firebaseCurrentEmail = firebaseUser?.email ?? "";
  const authEmailsMatch = authContextEmail && firebaseCurrentEmail ? authContextEmail === firebaseCurrentEmail : null;
  const authStatusLabel = isAuthLoading ? "확인 중" : "확인 완료";
  const loginRestoreLabel = authRestoreStatus === "checking"
    ? "확인 중"
    : authRestoreStatus === "restored"
      ? "복원됨"
      : "비로그인";
  const firebaseCurrentEmailLabel = user
    ? firebaseCurrentEmail || (firebaseUserStatus === "checking" ? "확인 중" : "불러오지 못함")
    : isAuthLoading
      ? "확인 중"
      : "-";
  const authEmailsMatchLabel = authEmailsMatch === null
    ? (user ? (firebaseUserStatus === "checking" ? "확인 중" : "불러오지 못함") : isAuthLoading ? "확인 중" : "-")
    : String(authEmailsMatch);
  const safeUidAtDot = user?.email ? toSafeUidAtDot(user.email) : "-";
  const safeUidDotOnly = user?.email ? toSafeUidDotOnly(user.email) : "-";

  const refreshFirebaseCurrentUser = useCallback(() => {
    if (!user) {
      setFirebaseUser(null);
      setFirebaseUserStatus("signedOut");
      return undefined;
    }

    setFirebaseUserStatus("checking");
    const currentUser = getCurrentAuthUser();

    if (currentUser) {
      setFirebaseUser(currentUser);
      setFirebaseUserStatus("ready");
      return undefined;
    }

    setFirebaseUser(null);
    const retryTimer = setTimeout(() => {
      const retriedUser = getCurrentAuthUser();
      setFirebaseUser(retriedUser);
      setFirebaseUserStatus(retriedUser ? "ready" : "missing");
    }, 500);

    return () => clearTimeout(retryTimer);
  }, [user]);

  useEffect(() => refreshFirebaseCurrentUser(), [refreshFirebaseCurrentUser]);

  useEffect(() => {
    if (!user) {
      setRtdbResults(RTDB_INITIAL_RESULTS);
      setRtdbMessage("");
      setIsRtdbReading(false);
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const authUser = await signIn();
      setFirebaseUser(authUser);
      setFirebaseUserStatus("ready");
      refreshUser();
      Alert.alert("로그인 완료", `${authUser.email} 계정으로 로그인되었어요.`);
    } catch (error) {
      Alert.alert("로그인 실패", formatAuthErrorForUser(error));
    }
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      await signOut();
      setFirebaseUser(null);
      setFirebaseUserStatus("signedOut");
      setRtdbResults(RTDB_INITIAL_RESULTS);
      setRtdbMessage("");
      Alert.alert("로그아웃", "안전하게 로그아웃되었습니다.");
    } catch (error) {
      Alert.alert("로그아웃 실패", formatAuthErrorForUser(error));
    }
  };

  const handleRtdbReadTest = useCallback(async () => {
    const email = user?.email;

    if (!email) {
      setRtdbMessage("로그인 email이 없어 실행하지 않았습니다. auth 없음");
      return;
    }

    const safeUidForAtDot = toSafeUidAtDot(email);
    const safeUidForDotOnly = toSafeUidDotOnly(email);
    const targets: Array<{
      key: RtdbDiagnosticKey;
      path: string;
      read: (email: string) => Promise<unknown>;
    }> = [
      {
        key: "dividend_calendar",
        path: `users/${safeUidForAtDot}/dividend_calendar`,
        read: readDividendCalendar,
      },
      {
        key: "tracker",
        path: `users/${safeUidForAtDot}/tracker`,
        read: readTracker,
      },
      {
        key: "tracker_config",
        path: `users/${safeUidForAtDot}/tracker_config`,
        read: readTrackerConfig,
      },
      {
        key: "sim_config",
        path: `users/${safeUidForAtDot}/sim_config`,
        read: readSimConfig,
      },
      {
        key: "favorite_links",
        path: `users/${safeUidForDotOnly}/favorite_links`,
        read: readFavoriteLinks,
      },
    ];

    setIsRtdbReading(true);
    setRtdbMessage("");
    setRtdbResults({
      dividend_calendar: { status: "reading" },
      tracker: { status: "reading" },
      tracker_config: { status: "reading" },
      sim_config: { status: "reading" },
      favorite_links: { status: "reading" },
    });

    const resultEntries = await Promise.all(
      targets.map(async (target) => {
        try {
          const value = await target.read(email);
          return [target.key, summarizeRtdbValue(value)] as const;
        } catch (error) {
          return [
            target.key,
            {
              status: "failed",
              error: classifyRtdbError(error),
              detail: target.path,
            },
          ] as const;
        }
      }),
    );

    setRtdbResults(Object.fromEntries(resultEntries) as Record<RtdbDiagnosticKey, RtdbDiagnosticResult>);
    setIsRtdbReading(false);
  }, [user?.email]);

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
        disabled={isAuthLoading}
      >
        <Feather name="log-in" size={18} color={colors.secondary} />
        <Text style={[styles.googleBtnText, { color: colors.secondary }]}>
          {isAuthLoading ? "인증 상태 확인 중" : user ? "Google 로그인 완료" : "Google로 로그인"}
        </Text>
        <Text style={[styles.googleBtnSub, { color: colors.textSub }]}>
          {user ? "Firebase Auth 연동됨" : "Development Build 필요"}
        </Text>
      </TouchableOpacity>

      <View style={[styles.diagnosticCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.diagnosticHeader}>
          <View style={[styles.settingIcon, { backgroundColor: colors.secondary + "16" }]}>
            <Feather name="activity" size={16} color={colors.secondary} />
          </View>
          <View style={styles.diagnosticTitleWrap}>
            <Text style={[styles.diagnosticTitle, { color: colors.text }]}>로그인 진단</Text>
            <Text style={[styles.diagnosticSubtitle, { color: colors.textSub }]}>Android Development Build 확인용</Text>
          </View>
        </View>

        <View style={[styles.diagnosticRows, { borderTopColor: colors.border }]}>
          <DiagnosticRow label="로그인 상태" value={isAuthLoading ? "인증 상태 확인 중" : user ? "로그인됨" : "비로그인"} />
          <View style={[styles.matchBox, { backgroundColor: colors.muted }]}>
            <DiagnosticRow label="Firebase API Key" value={firebaseEnv.hasApiKey ? "있음" : "없음"} />
            <DiagnosticRow label="Firebase Auth Domain" value={firebaseEnv.hasAuthDomain ? "있음" : "없음"} />
            <DiagnosticRow label="Firebase Database URL" value={firebaseEnv.hasDatabaseUrl ? "있음" : "없음"} />
            <DiagnosticRow label="Firebase Project ID" value={firebaseEnv.projectId} mono />
            <DiagnosticRow label="Firebase Storage Bucket" value={firebaseEnv.hasStorageBucket ? "있음" : "없음"} />
            <DiagnosticRow label="Firebase Messaging Sender ID" value={firebaseEnv.hasMessagingSenderId ? "있음" : "없음"} />
            <DiagnosticRow label="Firebase App ID" value={firebaseEnv.hasAppId ? "있음" : "없음"} />
            <DiagnosticRow label="Google Web Client ID" value={googleAuthEnv.hasGoogleWebClientId ? "있음" : "없음"} />
          </View>
          {!user && isAuthLoading ? (
            <Text style={[styles.diagnosticNote, { color: colors.textSub }]}>
              인증 상태를 확인하는 중입니다.
            </Text>
          ) : !user ? (
            <>
              <Text style={[styles.diagnosticNote, { color: colors.textSub }]}>
                Development Build에서 Google 로그인을 테스트해 주세요.
              </Text>
              <Text style={[styles.diagnosticNote, { color: colors.textSub }]}>
                Expo Go에서는 Google Sign-In 네이티브 모듈이 정상 동작하지 않을 수 있습니다.
              </Text>
            </>
          ) : (
            <>
              <DiagnosticRow label="Firebase Auth uid" value={firebaseUser?.uid ?? user.uid} mono />
              <DiagnosticRow label="email" value={user.email} mono />
              <DiagnosticRow label="displayName" value={user.displayName || "-"} />
              <DiagnosticRow label="safe_uid_at_dot" value={safeUidAtDot} mono />
              <DiagnosticRow label="safe_uid_dot_only" value={safeUidDotOnly} mono />
            </>
          )}
          <View style={[styles.matchBox, { backgroundColor: colors.muted }]}>
            <DiagnosticRow label="인증 상태" value={authStatusLabel} />
            <DiagnosticRow label="로그인 복원" value={loginRestoreLabel} />
            <DiagnosticRow label="AuthContext email" value={authContextEmail || "-"} mono />
            <DiagnosticRow label="Firebase currentUser email" value={firebaseCurrentEmailLabel} mono />
            <DiagnosticRow label="email 일치 여부" value={authEmailsMatchLabel} />
          </View>
        </View>
      </View>

      <View style={[styles.diagnosticCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.diagnosticHeader}>
          <View style={[styles.settingIcon, { backgroundColor: colors.primary + "16" }]}>
            <Feather name="database" size={16} color={colors.primary} />
          </View>
          <View style={styles.diagnosticTitleWrap}>
            <Text style={[styles.diagnosticTitle, { color: colors.text }]}>RTDB 읽기 진단</Text>
            <Text style={[styles.diagnosticSubtitle, { color: colors.textSub }]}>
              Firebase Realtime Database 주요 경로 확인
            </Text>
          </View>
        </View>

        <View style={[styles.diagnosticRows, { borderTopColor: colors.border }]}>
          {!user ? (
            <Text style={[styles.diagnosticNote, { color: colors.textSub }]}>로그인 후 RTDB 읽기 테스트 가능</Text>
          ) : (
            <>
              <DiagnosticRow label="safe_uid_at_dot" value={safeUidAtDot} mono />
              <DiagnosticRow label="safe_uid_dot_only" value={safeUidDotOnly} mono />
              <RtdbDiagnosticRow label="dividend_calendar" result={rtdbResults.dividend_calendar} />
              <RtdbDiagnosticRow label="tracker" result={rtdbResults.tracker} />
              <RtdbDiagnosticRow label="tracker_config" result={rtdbResults.tracker_config} />
              <RtdbDiagnosticRow label="sim_config" result={rtdbResults.sim_config} />
              <RtdbDiagnosticRow label="favorite_links" result={rtdbResults.favorite_links} />
            </>
          )}
          {rtdbMessage ? <Text style={[styles.diagnosticNote, { color: colors.textSub }]}>{rtdbMessage}</Text> : null}
          <TouchableOpacity
            style={[
              styles.rtdbButton,
              {
                backgroundColor: user && !isRtdbReading ? colors.primary : colors.muted,
                borderColor: colors.border,
              },
            ]}
            onPress={handleRtdbReadTest}
            activeOpacity={0.8}
            disabled={!user || isRtdbReading}
          >
            <Feather name="download-cloud" size={15} color={user && !isRtdbReading ? "#FFFFFF" : colors.textSub} />
            <Text style={[styles.rtdbButtonText, { color: user && !isRtdbReading ? "#FFFFFF" : colors.textSub }]}>
              {isRtdbReading ? "읽는 중..." : "RTDB 읽기 테스트"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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

function DiagnosticRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const colors = useColors();

  return (
    <View style={styles.diagnosticRow}>
      <Text style={[styles.diagnosticLabel, { color: colors.textSub }]}>{label}</Text>
      <Text
        style={[styles.diagnosticValue, mono ? styles.diagnosticMono : null, { color: colors.text }]}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

function RtdbDiagnosticRow({ label, result }: { label: string; result: RtdbDiagnosticResult }) {
  const colors = useColors();
  const detail = result.error ?? result.detail;
  const value = detail ? `${RTDB_STATUS_LABELS[result.status]} · ${detail}` : RTDB_STATUS_LABELS[result.status];

  return (
    <View style={styles.diagnosticRow}>
      <Text style={[styles.diagnosticLabel, { color: colors.textSub }]}>{label}</Text>
      <Text style={[styles.diagnosticValue, { color: colors.text }]} selectable>
        {value}
      </Text>
    </View>
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
  diagnosticCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#3D2B1F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  diagnosticHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  diagnosticTitleWrap: { flex: 1, gap: 2 },
  diagnosticTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  diagnosticSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  diagnosticRows: { borderTopWidth: 1, paddingTop: 12, gap: 9 },
  diagnosticRow: { gap: 3 },
  diagnosticLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  diagnosticValue: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_600SemiBold" },
  diagnosticMono: { fontFamily: "Inter_500Medium" },
  diagnosticNote: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  matchBox: { borderRadius: 12, padding: 12, gap: 8 },
  rtdbButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, minHeight: 46, paddingHorizontal: 14, paddingVertical: 12 },
  rtdbButtonText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
