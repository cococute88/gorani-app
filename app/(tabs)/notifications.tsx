import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { TAB_BAR_SAFE_BOTTOM } from "@/constants/layout";
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { scheduleLocalTestNotificationAfterSeconds } from "@/services/localNotificationService";
import { sendTelegramTestMessage } from "@/services/telegramSyncService";
import type {
  CalendarAlertSettings,
  DateNotificationRule,
  DateRuleType,
  NotificationSettings,
  WeekdayCode,
} from "@/types/notification";
import { isValidDateString, isValidTimeString } from "@/utils/kstDate";

const RULE_TYPE_OPTIONS: { type: DateRuleType; label: string }[] = [
  { type: "monthly_day", label: "매월 X일" },
  { type: "monthly_last_day", label: "매월 마지막 날" },
  { type: "monthly_last_weekday", label: "마지막 요일" },
  { type: "weekly_interval_weekday", label: "매 N주" },
  { type: "day_interval", label: "매 N일" },
];

const WEEKDAY_OPTIONS: { code: WeekdayCode; label: string }[] = [
  { code: "MON", label: "월" },
  { code: "TUE", label: "화" },
  { code: "WED", label: "수" },
  { code: "THU", label: "목" },
  { code: "FRI", label: "금" },
  { code: "SAT", label: "토" },
  { code: "SUN", label: "일" },
];

const CALENDAR_KINDS: { key: keyof CalendarAlertSettings["typeTimes"]; label: string }[] = [
  { key: "exDiv", label: "ex-div" },
  { key: "buyBy", label: "buy by" },
  { key: "pay", label: "pay" },
  { key: "custom", label: "custom" },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const email = user?.email;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const {
    settings,
    setSettings,
    isLoading,
    isSaving,
    error,
    save,
  } = useNotificationSettings(email);

  const enabledMediaCount = useMemo(
    () => [settings.localPushEnabled, settings.telegramEnabled].filter(Boolean).length,
    [settings.localPushEnabled, settings.telegramEnabled],
  );

  const updateSettings = (updater: (prev: NotificationSettings) => NotificationSettings) => {
    setSettings(updater);
  };

  const addDateRule = () => {
    updateSettings((prev) => ({
      ...prev,
      dateRules: [
        ...prev.dateRules,
        {
          id: `date_rule_${Date.now()}`,
          enabled: true,
          type: "monthly_day",
          dayOfMonth: 1,
          notifyTime: "09:00",
          label: "월간 알림",
          customMessage: "",
        },
      ],
    }));
  };

  const updateDateRule = (ruleId: string, nextRule: DateNotificationRule) => {
    updateSettings((prev) => ({
      ...prev,
      dateRules: prev.dateRules.map((rule) => (rule.id === ruleId ? nextRule : rule)),
    }));
  };

  const removeDateRule = (ruleId: string) => {
    updateSettings((prev) => ({
      ...prev,
      dateRules: prev.dateRules.filter((rule) => rule.id !== ruleId),
    }));
  };

  const handleSave = async () => {
    const validationError = validateSettings(settings);
    if (validationError) {
      Alert.alert("입력 확인", validationError);
      return;
    }

    const result = await save();
    if (result.ok) {
      Alert.alert(
        "저장 완료",
        [
          "알림 설정을 저장하고 예약을 다시 만들었어요 🦌",
          `12개월 계획 수: ${result.plannedCount ?? 0}`,
          `로컬 예약 수: ${result.localScheduledCount ?? 0}`,
          `텔레그램 동기화: ${result.telegramSynced === undefined ? "사용 안 함" : result.telegramSynced ? "완료" : "확인 필요"}`,
        ].join("\n"),
      );
      return;
    }

    const message = result.reason === "missing_email"
      ? "로그인 후 알림 설정을 저장할 수 있어요."
      : "알림 저장 중 문제가 생겼어요. 네트워크와 알림 권한을 확인해 주세요.";
    Alert.alert("저장 실패", message);
  };

  const handleTelegramTest = async () => {
    const result = await sendTelegramTestMessage({ chatId: settings.telegram.chatId });
    if (result.ok) {
      Alert.alert("테스트 완료", "텔레그램 테스트 메시지를 요청했어요.");
      return;
    }
    if (result.reason === "missing_worker_config") {
      Alert.alert("Worker 설정 필요", "아직 Cloudflare Worker URL/API key가 설정되지 않았어요. Worker 배포 후 .env에 값을 넣어주세요.");
      return;
    }
    if (result.reason === "missing_chat_id") {
      Alert.alert("Chat ID 필요", "Telegram Chat ID를 입력해 주세요.");
      return;
    }
    Alert.alert("테스트 실패", "텔레그램 테스트 메시지를 보내지 못했어요.");
  };

  const handleLocalPushTest = async () => {
    const result = await scheduleLocalTestNotificationAfterSeconds(60);
    if (result.ok) {
      Alert.alert(
        "로컬 푸시 테스트 예약",
        "1분 뒤 로컬 푸시 테스트를 예약했어요. 앱을 백그라운드로 보내고 기다려 주세요.",
      );
      return;
    }

    Alert.alert(
      "로컬 푸시 테스트 실패",
      result.reason ?? "로컬 푸시 테스트 알림을 예약하지 못했어요.",
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: insets.bottom + TAB_BAR_SAFE_BOTTOM },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>Gorani Finance</Text>
        <Text style={[styles.title, { color: colors.text }]}>알림</Text>
        <Text style={[styles.subtitle, { color: colors.textSub }]}>
          KST 기준으로 날짜 알림과 투자 캘린더 알림을 다시 계산해요.
        </Text>
      </View>

      {!email ? (
        <Card>
          <Text style={[styles.noticeText, { color: colors.text }]}>로그인 후 Firebase 알림 설정을 저장할 수 있어요.</Text>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <Text style={[styles.noticeText, { color: colors.destructive }]}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="알림 매체" subtitle="받을 알림 채널을 선택하세요" />
        <View style={styles.stack}>
          <SwitchRow
            label="휴대폰 로컬 푸시 알림"
            value={settings.localPushEnabled}
            onValueChange={(value) => updateSettings((prev) => ({ ...prev, localPushEnabled: value }))}
          />
          <SwitchRow
            label="텔레그램 알림"
            value={settings.telegramEnabled}
            onValueChange={(value) => updateSettings((prev) => ({
              ...prev,
              telegramEnabled: value,
              telegram: { ...prev.telegram, enabled: value },
            }))}
          />
        </View>
      </Card>

      {settings.telegramEnabled ? (
        <Card>
          <SectionHeader title="텔레그램 설정" subtitle="Worker 배포 후 Chat ID로 테스트할 수 있어요" />
          <View style={styles.stack}>
            <LabeledInput
              label="Telegram Chat ID"
              value={settings.telegram.chatId}
              placeholder="예: 123456789"
              onChangeText={(value) => updateSettings((prev) => ({
                ...prev,
                telegram: { ...prev.telegram, chatId: value },
              }))}
            />
            <PressableButton label="텔레그램 테스트 메시지 보내기" onPress={handleTelegramTest} />
            <Text style={[styles.helpText, { color: colors.textSub }]}>
              Worker URL/API key가 없으면 테스트는 건너뜁니다. 6단계 Worker 배포 후 .env에 값을 넣어주세요.
            </Text>
          </View>
        </Card>
      ) : null}

      {__DEV__ ? (
        <Card>
          <SectionHeader title="개발용 로컬 푸시 진단" subtitle="실제 알림 계획과 별개로 로컬 푸시 자체를 확인해요" />
          <View style={styles.stack}>
            <PressableButton label="로컬 푸시 1분 테스트" onPress={handleLocalPushTest} />
            <Text style={[styles.helpText, { color: colors.textSub }]}>
              예약 후 앱을 백그라운드로 보내고 1분 뒤 알림이 표시되는지 확인하세요.
            </Text>
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={styles.sectionTitleRow}>
          <SectionHeader title="날짜 기반 알림" subtitle="월간/주간/일간 반복 규칙을 만들어요" />
          <PressableIconButton icon="plus" label="추가" onPress={addDateRule} />
        </View>
        <View style={styles.stack}>
          {settings.dateRules.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSub }]}>아직 날짜 기반 알림 규칙이 없어요.</Text>
          ) : null}
          {settings.dateRules.map((rule) => (
            <DateRuleEditor
              key={rule.id}
              rule={rule}
              onChange={(nextRule) => updateDateRule(rule.id, nextRule)}
              onRemove={() => removeDateRule(rule.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="투자 캘린더 알림" subtitle="선택된 표시값끼리는 OR 조건으로 알림을 만들어요" />
        <View style={styles.stack}>
          <SwitchRow
            label="별 체크 일정"
            value={settings.calendarAlert.filterStar}
            onValueChange={(value) => updateCalendarAlert(setSettings, "filterStar", value)}
          />
          <SwitchRow
            label="하트 체크 일정"
            value={settings.calendarAlert.filterHeart}
            onValueChange={(value) => updateCalendarAlert(setSettings, "filterHeart", value)}
          />
          <SwitchRow
            label="종 체크 일정"
            value={settings.calendarAlert.filterBell}
            onValueChange={(value) => updateCalendarAlert(setSettings, "filterBell", value)}
          />
          <Text style={[styles.helpText, { color: colors.textSub }]}>
            예: 별과 종을 켜면 별 일정 또는 종 일정이 알림 대상이에요.
          </Text>
        </View>
      </Card>

      <Card>
        <SectionHeader title="속성별 알림 시간" subtitle="HH:mm 형식으로 입력하세요" />
        <View style={styles.grid}>
          {CALENDAR_KINDS.map((kind) => (
            <LabeledInput
              key={kind.key}
              label={kind.label}
              value={settings.calendarAlert.typeTimes[kind.key]}
              placeholder="09:00"
              onChangeText={(value) => updateSettings((prev) => ({
                ...prev,
                calendarAlert: {
                  ...prev.calendarAlert,
                  typeTimes: { ...prev.calendarAlert.typeTimes, [kind.key]: value },
                },
              }))}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="속성별 알림 문구" subtitle="사용 가능 변수: {티커명}, {속성}, {날짜}, {일정명}, {메모}" />
        <View style={styles.stack}>
          {CALENDAR_KINDS.map((kind) => (
            <LabeledInput
              key={kind.key}
              label={`${kind.label} 문구`}
              value={settings.calendarAlert.templates[kind.key]}
              multiline
              onChangeText={(value) => updateSettings((prev) => ({
                ...prev,
                calendarAlert: {
                  ...prev.calendarAlert,
                  templates: { ...prev.calendarAlert.templates, [kind.key]: value },
                },
              }))}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="미리보기" subtitle="예약 정책 요약" />
        <View style={styles.infoGrid}>
          <InfoPill label="scheduleRevision" value={String(settings.scheduleRevision)} />
          <InfoPill label="날짜 규칙" value={`${settings.dateRules.length}개`} />
          <InfoPill label="알림 매체" value={`${enabledMediaCount}개 ON`} />
          <InfoPill label="시간대" value="KST 고정" />
        </View>
        <Text style={[styles.helpText, { color: colors.textSub }]}>
          로컬 푸시는 앞으로 30일, 최대 35개만 실제 예약해요. 텔레그램은 Cloudflare Worker Cron이 5분마다 확인합니다.
        </Text>
      </Card>

      <Pressable
        disabled={isSaving || isLoading}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: isSaving || isLoading ? colors.mutedForeground : colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={handleSave}
      >
        <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
          {isSaving ? "저장 중..." : "알림 저장 및 재예약"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function DateRuleEditor({
  rule,
  onChange,
  onRemove,
}: {
  rule: DateNotificationRule;
  onChange: (rule: DateNotificationRule) => void;
  onRemove: () => void;
}) {
  const colors = useColors();

  const updateBase = (patch: Partial<DateNotificationRule>) => {
    onChange({ ...rule, ...patch } as DateNotificationRule);
  };

  const changeType = (type: DateRuleType) => {
    const base = {
      id: rule.id,
      enabled: rule.enabled,
      type,
      notifyTime: rule.notifyTime,
      label: rule.label,
      customMessage: rule.customMessage,
    };
    if (type === "monthly_day") onChange({ ...base, type, dayOfMonth: 1 });
    if (type === "monthly_last_day") onChange({ ...base, type });
    if (type === "monthly_last_weekday") onChange({ ...base, type, weekday: "FRI" });
    if (type === "weekly_interval_weekday") onChange({ ...base, type, startDate: "2026-01-01", intervalWeeks: 1, weekday: "MON" });
    if (type === "day_interval") onChange({ ...base, type, startDate: "2026-01-01", intervalDays: 1 });
  };

  return (
    <View style={[styles.ruleCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
      <View style={styles.ruleHeader}>
        <SwitchRow label="규칙 사용" value={rule.enabled} onValueChange={(value) => updateBase({ enabled: value })} />
        <Pressable onPress={onRemove} hitSlop={8}>
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </Pressable>
      </View>

      <ChoiceRow
        options={RULE_TYPE_OPTIONS}
        selected={rule.type}
        getKey={(item) => item.type}
        getLabel={(item) => item.label}
        onSelect={(item) => changeType(item.type)}
      />

      {rule.type === "monthly_day" ? (
        <>
          <LabeledInput
            label="매월 며칠"
            value={String(rule.dayOfMonth)}
            keyboardType="number-pad"
            onChangeText={(value) => updateBase({ dayOfMonth: toInt(value) })}
          />
          <Text style={[styles.helpText, { color: colors.textSub }]}>해당 월에 이 날짜가 없으면 알림을 만들지 않아요.</Text>
        </>
      ) : null}

      {rule.type === "monthly_last_weekday" ? (
        <WeekdayPicker value={rule.weekday} onChange={(weekday) => updateBase({ weekday })} />
      ) : null}

      {rule.type === "weekly_interval_weekday" ? (
        <>
          <LabeledInput label="기준시작일" value={rule.startDate} placeholder="YYYY-MM-DD" onChangeText={(value) => updateBase({ startDate: value })} />
          <LabeledInput label="반복 주기" value={String(rule.intervalWeeks)} keyboardType="number-pad" onChangeText={(value) => updateBase({ intervalWeeks: toInt(value) })} />
          <WeekdayPicker value={rule.weekday} onChange={(weekday) => updateBase({ weekday })} />
          <Text style={[styles.helpText, { color: colors.textSub }]}>기준시작일 이후 처음 오는 해당 요일부터 반복돼요.</Text>
        </>
      ) : null}

      {rule.type === "day_interval" ? (
        <>
          <LabeledInput label="기준시작일" value={rule.startDate} placeholder="YYYY-MM-DD" onChangeText={(value) => updateBase({ startDate: value })} />
          <LabeledInput label="반복 일수" value={String(rule.intervalDays)} keyboardType="number-pad" onChangeText={(value) => updateBase({ intervalDays: toInt(value) })} />
        </>
      ) : null}

      <LabeledInput label="알림 시간" value={rule.notifyTime} placeholder="09:00" onChangeText={(value) => updateBase({ notifyTime: value })} />
      <LabeledInput label="일정명" value={rule.label} onChangeText={(value) => updateBase({ label: value })} />
      <LabeledInput label="사용자 커스텀 문구" value={rule.customMessage} onChangeText={(value) => updateBase({ customMessage: value })} />
    </View>
  );
}

function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const colors = useColors();
  return (
    <View style={styles.switchRow}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary, false: colors.border }} />
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
  multiline?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSub }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[
          styles.input,
          multiline ? styles.multilineInput : null,
          { borderColor: colors.border, backgroundColor: colors.card, color: colors.text },
        ]}
      />
    </View>
  );
}

function ChoiceRow<T>({
  options,
  selected,
  getKey,
  getLabel,
  onSelect,
}: {
  options: T[];
  selected: string;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.choiceRow}>
      {options.map((item) => {
        const key = getKey(item);
        const isSelected = key === selected;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(item)}
            style={[
              styles.choiceButton,
              {
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary : colors.card,
              },
            ]}
          >
            <Text style={[styles.choiceText, { color: isSelected ? colors.primaryForeground : colors.text }]}>
              {getLabel(item)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WeekdayPicker({ value, onChange }: { value: WeekdayCode; onChange: (value: WeekdayCode) => void }) {
  return (
    <ChoiceRow
      options={WEEKDAY_OPTIONS}
      selected={value}
      getKey={(item) => item.code}
      getLabel={(item) => item.label}
      onSelect={(item) => onChange(item.code)}
    />
  );
}

function PressableButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={onPress}>
      <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function PressableIconButton({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable style={[styles.iconButton, { backgroundColor: colors.primary }]} onPress={onPress}>
      <Feather name={icon} size={14} color={colors.primaryForeground} />
      <Text style={[styles.iconButtonText, { color: colors.primaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoPill, { borderColor: colors.border, backgroundColor: colors.muted }]}>
      <Text style={[styles.infoLabel, { color: colors.textSub }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function updateCalendarAlert<K extends keyof Pick<CalendarAlertSettings, "filterStar" | "filterHeart" | "filterBell">>(
  setSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>,
  key: K,
  value: CalendarAlertSettings[K],
) {
  setSettings((prev) => ({
    ...prev,
    calendarAlert: { ...prev.calendarAlert, [key]: value },
  }));
}

function validateSettings(settings: NotificationSettings): string | null {
  const times = [
    ...settings.dateRules.map((rule) => rule.notifyTime),
    ...Object.values(settings.calendarAlert.typeTimes),
  ];
  if (times.some((time) => !isValidTimeString(time))) {
    return "알림 시간은 HH:mm 형식으로 입력해 주세요. 예: 09:00";
  }

  for (const rule of settings.dateRules) {
    if (rule.type === "monthly_day" && (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31)) {
      return "매월 X일은 1~31 사이로 입력해 주세요.";
    }
    if (rule.type === "weekly_interval_weekday") {
      if (!isValidDateString(rule.startDate)) return "기준시작일은 YYYY-MM-DD 형식으로 입력해 주세요.";
      if (!Number.isInteger(rule.intervalWeeks) || rule.intervalWeeks < 1) return "반복 주기는 1주 이상이어야 해요.";
    }
    if (rule.type === "day_interval") {
      if (!isValidDateString(rule.startDate)) return "기준시작일은 YYYY-MM-DD 형식으로 입력해 주세요.";
      if (!Number.isInteger(rule.intervalDays) || rule.intervalDays < 1) return "반복 일수는 1일 이상이어야 해요.";
    }
  }

  if (settings.telegramEnabled && !settings.telegram.chatId.trim()) {
    return "텔레그램 알림을 켜려면 Telegram Chat ID를 입력해 주세요.";
  }

  return null;
}

function toInt(value: string): number {
  const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  header: { gap: 4, paddingHorizontal: 2, marginBottom: 2 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  title: { fontSize: 30, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  noticeText: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  stack: { gap: 12, marginTop: 14 },
  grid: { gap: 12, marginTop: 14 },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  helpText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_500Medium" },
  multilineInput: { minHeight: 76, textAlignVertical: "top" },
  ruleCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 12 },
  ruleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  choiceText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  secondaryButton: { minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  secondaryButtonText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  iconButton: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  iconButtonText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, marginBottom: 10 },
  infoPill: { width: "48%", borderWidth: 1, borderRadius: 12, padding: 10, gap: 3 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  infoValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  saveButton: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  saveButtonText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
