/**
 * اپ هوشمند بدنسازی — daily local training reminder.
 *
 * Fully local: Capacitor LocalNotifications, no server, no push service.
 * On web (non-native) this is a silent no-op — there is no native
 * scheduler to register with. If the user denies notification
 * permission, scheduling is skipped silently; nothing ever throws
 * out of this module, so a denied permission can never break the app.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface ReminderSettings {
  enabled: boolean;
  /** 0-23, local time. */
  hour: number;
  /** 0-59, local time. */
  minute: number;
}

const STORAGE_KEY = 'fitai.reminder';
const NOTIFICATION_ID = 1;

export const DEFAULT_REMINDER: ReminderSettings = {
  enabled: true,
  hour: 18,
  minute: 0,
};

export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_REMINDER };
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    const hour = typeof parsed.hour === 'number' ? parsed.hour : DEFAULT_REMINDER.hour;
    const minute =
      typeof parsed.minute === 'number' ? parsed.minute : DEFAULT_REMINDER.minute;
    return {
      enabled: parsed.enabled !== false,
      hour: Math.max(0, Math.min(23, Math.floor(hour))),
      minute: Math.max(0, Math.min(59, Math.floor(minute))),
    };
  } catch {
    return { ...DEFAULT_REMINDER };
  }
}

export function saveReminderSettings(settings: ReminderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — fail open */
  }
}

function reminderLang(): 'fa' | 'en' {
  try {
    return localStorage.getItem('fitai.lang') === 'en' ? 'en' : 'fa';
  } catch {
    return 'fa';
  }
}

/**
 * (Re)schedule the daily reminder from stored settings. Safe to call on
 * every app start: it cancels the previous pending notification first so
 * a changed hour never leaves a stale one behind.
 */
export async function ensureReminderScheduled(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const settings = getReminderSettings();
    await LocalNotifications.cancel({
      notifications: [{ id: NOTIFICATION_ID }],
    }).catch(() => undefined);
    if (!settings.enabled) return;
    const permission = await LocalNotifications.requestPermissions().catch(
      () => ({ display: 'denied' as const }),
    );
    if (permission.display !== 'granted') return;
    const fa = reminderLang() === 'fa';
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: fa ? 'وقت تمرین است' : 'Time to train',
          body: fa
            ? 'برنامه‌ی امروزت منتظر توست — یک جلسه‌ی کوتاه هم بهتر از هیچی است.'
            : "Today's session is waiting — a short session beats none.",
          schedule: {
            allowWhileIdle: true,
            on: { hour: settings.hour, minute: settings.minute },
          },
        },
      ],
    });
  } catch {
    /* denied / unavailable — the reminder is best-effort, never fatal */
  }
}
