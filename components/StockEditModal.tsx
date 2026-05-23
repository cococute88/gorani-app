import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { WatchlistItem, StockStatus } from "@/data/dummyData";
import { Badge } from "./Badge";
import { ToggleRow } from "./ToggleRow";
import { useColors } from "@/hooks/useColors";

const STATUS_OPTIONS: StockStatus[] = ["보유중", "매수 검토중", "관망"];

interface StockEditModalProps {
  item: WatchlistItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updated: WatchlistItem) => void;
}

export function StockEditModal({ item, visible, onClose, onSave }: StockEditModalProps) {
  const colors = useColors();

  const [targetBuy, setTargetBuy] = useState("");
  const [targetSell, setTargetSell] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<StockStatus>("관망");
  const [alertTargetPrice, setAlertTargetPrice] = useState(false);
  const [alertDividend, setAlertDividend] = useState(false);
  const [alertMemo, setAlertMemo] = useState(false);

  useEffect(() => {
    if (item) {
      setTargetBuy(item.targetBuy ? String(item.targetBuy) : "");
      setTargetSell(item.targetSell ? String(item.targetSell) : "");
      setMemo(item.memo ?? "");
      setStatus(item.status);
      setAlertTargetPrice(item.alertTargetPrice);
      setAlertDividend(item.alertDividend);
      setAlertMemo(item.alertMemo);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    onSave({
      ...item,
      targetBuy: parseFloat(targetBuy) || 0,
      targetSell: parseFloat(targetSell) || 0,
      memo,
      status,
      alertTargetPrice,
      alertDividend,
      alertMemo,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.ticker, { color: colors.secondary }]}>{item.ticker}</Text>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            <View style={styles.body}>
              <Text style={[styles.sectionLabel, { color: colors.textSub }]}>상태</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[
                      styles.statusBtn,
                      {
                        backgroundColor: status === s ? colors.primary : colors.muted,
                        borderColor: status === s ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBtnText, { color: status === s ? "#FFF" : colors.textSub }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textSub }]}>목표 매수가 ($)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.text, borderColor: colors.border }]}
                keyboardType="decimal-pad"
                value={targetBuy}
                onChangeText={setTargetBuy}
                placeholder="예: 32.50"
                placeholderTextColor={colors.textSub}
              />

              <Text style={[styles.sectionLabel, { color: colors.textSub }]}>목표 매도가 ($)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.text, borderColor: colors.border }]}
                keyboardType="decimal-pad"
                value={targetSell}
                onChangeText={setTargetSell}
                placeholder="예: 42.00"
                placeholderTextColor={colors.textSub}
              />

              <Text style={[styles.sectionLabel, { color: colors.textSub }]}>메모</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.muted, color: colors.text, borderColor: colors.border }]}
                multiline
                numberOfLines={3}
                value={memo}
                onChangeText={setMemo}
                placeholder="종목 관련 메모"
                placeholderTextColor={colors.textSub}
              />

              <Text style={[styles.sectionLabel, { color: colors.textSub }]}>
                알림 설정 (나중에 연결 예정)
              </Text>
              <View style={[styles.alertBox, { backgroundColor: colors.muted, borderRadius: 14 }]}>
                <ToggleRow
                  icon="target"
                  label="목표가 알림"
                  sub="목표가 근접 시 알림"
                  value={alertTargetPrice}
                  onValueChange={setAlertTargetPrice}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <ToggleRow
                  icon="calendar"
                  label="배당락일 알림"
                  sub="배당락 D-3 알림"
                  value={alertDividend}
                  onValueChange={setAlertDividend}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <ToggleRow
                  icon="edit-3"
                  label="메모 리마인더"
                  sub="주 1회 메모 확인"
                  value={alertMemo}
                  onValueChange={setAlertMemo}
                />
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>저장하기</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(61,43,31,0.5)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    borderWidth: 1,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ticker: { fontSize: 12, fontFamily: "Inter_700Bold" },
  name: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2, maxWidth: 260 },
  body: { gap: 10 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statusRow: { flexDirection: "row", gap: 8 },
  statusBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  statusBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  input: { borderRadius: 12, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1 },
  textArea: { height: 80, textAlignVertical: "top" },
  alertBox: { padding: 14, gap: 0 },
  divider: { height: 1, marginVertical: 8 },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: "center", minHeight: 52 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
});
