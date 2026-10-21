import { create } from "zustand";
import { fetchSettings } from "../lib/remote";
import { hhmmToMinutes } from "../lib/time";
import { getMeta, setMeta } from "../repo/meta";
import { useAuth } from "./auth";
import type { ThemeMode } from "../lib/types";

interface SettingsState {
  themeMode: ThemeMode;
  /** 'HH:mm' */
  scheduleStart: string;
  scheduleEnd: string;
  /** true, пока пользователь не менял тему в этой сессии — тогда серверная правее */
  pristine: boolean;
  hydrateLocal(): void;
  hydrateFromServer(userId: string): Promise<void>;
  setThemeMode(mode: ThemeMode): Promise<void>;
  setSchedule(start: string, end: string): Promise<void>;
  pushLastChild(childId: string): void;
}

const STORAGE_KEY = "mishkin-settings";
const PENDING_KEY = "pending_settings";

interface PersistedTheme {
  themeMode: ThemeMode;
  scheduleStart: string;
  scheduleEnd: string;
}

/** Отложенный облачный пуш: без импорта движка (иначе цикл children → settings → engine). */
async function queueCloudPatch(patch: {
  themeMode?: ThemeMode;
  scheduleStart?: string;
  scheduleEnd?: string;
  lastChildId?: string;
}): Promise<void> {
  try {
    const userId = useAuth.getState().userId;
    if (userId === null) return;
    const raw = await getMeta(PENDING_KEY);
    const prev: Record<string, unknown> =
      raw !== undefined ? (JSON.parse(raw) as Record<string, unknown>) : {};
    await setMeta(
      PENDING_KEY,
      JSON.stringify({ ...prev, userId, ...patch }),
    );
    // Движок слушает это событие и запускает синк (пуш настроек идёт после аутбокса — FK безопасно).
    window.dispatchEvent(new Event("mishkin:sync"));
  } catch (e) {
    console.warn("Не удалось поставить настройки в очередь облака:", e);
  }
}

/** Тема: локально мгновенно + синк в профиль (решение Q72). Приоритет расписания — Q71. */
export const useSettings = create<SettingsState>()((set, get) => {
  function persist(): void {
    const { themeMode, scheduleStart, scheduleEnd } = get();
    const data: PersistedTheme = { themeMode, scheduleStart, scheduleEnd };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Не удалось сохранить настройки темы локально:", e);
    }
  }

  return {
    themeMode: "system",
    scheduleStart: "22:00",
    scheduleEnd: "07:00",
    pristine: true,

    hydrateLocal: () => {
      const local = readLocal();
      if (local !== null) set({ ...local, pristine: false });
    },

    hydrateFromServer: async (userId) => {
      const remote = await fetchSettings(userId);
      if (remote === null) return;
      const patch: Partial<SettingsState> = {
        scheduleStart: remote.themeScheduleStart,
        scheduleEnd: remote.themeScheduleEnd,
      };
      if (get().pristine) patch.themeMode = remote.themeMode;
      set(patch);
      persist();
    },

    setThemeMode: async (mode) => {
      set({ themeMode: mode, pristine: false });
      persist();
      await queueCloudPatch({ themeMode: mode });
    },

    setSchedule: async (start, end) => {
      set({ scheduleStart: start, scheduleEnd: end, pristine: false });
      persist();
      await queueCloudPatch({ scheduleStart: start, scheduleEnd: end });
    },

    pushLastChild: (childId) => {
      void queueCloudPatch({ lastChildId: childId });
    },
  };
});

function readLocal(): PersistedTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    const mode = p.themeMode;
    const validMode =
      mode === "light" || mode === "dark" || mode === "system" || mode === "schedule";
    if (!validMode) return null;
    return {
      themeMode: mode,
      scheduleStart: typeof p.scheduleStart === "string" ? p.scheduleStart : "22:00",
      scheduleEnd: typeof p.scheduleEnd === "string" ? p.scheduleEnd : "07:00",
    };
  } catch (e) {
    console.warn("Не удалось прочитать локальные настройки темы:", e);
    return null;
  }
}

/** Активна ли тёмная тема прямо сейчас (режимы: Q69–Q71). */
export function resolveDarkNow(
  mode: ThemeMode,
  scheduleStart: string,
  scheduleEnd: string,
  systemDark: boolean,
  now: Date = new Date(),
): boolean {
  switch (mode) {
    case "light":
      return false;
    case "dark":
      return true;
    case "system":
      return systemDark;
    case "schedule": {
      const cur = now.getHours() * 60 + now.getMinutes();
      const start = hhmmToMinutes(scheduleStart);
      const end = hhmmToMinutes(scheduleEnd);
      return start <= end ? cur >= start && cur < end : cur >= start || cur < end;
    }
  }
}
