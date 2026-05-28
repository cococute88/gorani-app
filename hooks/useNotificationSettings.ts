import { useCallback, useEffect, useRef, useState } from "react";

import {
  createDefaultNotificationSettings,
  readNotificationSettings,
  saveNotificationSettingsWithRevision,
} from "@/services/notificationFirebaseService";
import { rescheduleAllNotifications } from "@/services/notificationRescheduler";
import type { NotificationSettings } from "@/types/notification";

type SaveResult = {
  ok: boolean;
  reason?: string;
  plannedCount?: number;
  localScheduledCount?: number;
  telegramSynced?: boolean;
};

export function useNotificationSettings(email: string | null | undefined): {
  settings: NotificationSettings;
  setSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  reload: () => Promise<void>;
  save: () => Promise<SaveResult>;
} {
  const [settings, setSettings] = useState<NotificationSettings>(() => createDefaultNotificationSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const reload = useCallback(async () => {
    setError(null);
    if (!email) {
      setSettings(createDefaultNotificationSettings());
      return;
    }

    setIsLoading(true);
    try {
      const remoteSettings = await readNotificationSettings(email);
      setSettings(remoteSettings ?? createDefaultNotificationSettings());
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "알림 설정을 불러오지 못했어요.";
      setError(message);
      setSettings(createDefaultNotificationSettings());
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (): Promise<SaveResult> => {
    if (!email) {
      return { ok: false, reason: "missing_email" };
    }
    if (savingRef.current) {
      return { ok: false, reason: "already_saving" };
    }

    savingRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      const { scheduleRevision: _scheduleRevision, updatedAt: _updatedAt, ...draft } = settings;
      const savedSettings = await saveNotificationSettingsWithRevision(email, draft);
      setSettings(savedSettings);
      const result = await rescheduleAllNotifications(email);
      if (!result.ok) {
        setError(result.reason ?? "알림 재예약에 실패했어요.");
      }
      return result;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "알림 설정을 저장하지 못했어요.";
      setError(message);
      return { ok: false, reason: message };
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [email, settings]);

  return {
    settings,
    setSettings,
    isLoading,
    isSaving,
    error,
    reload,
    save,
  };
}
