import { getDb } from "../lib/db";
import { isSupabaseConfigured } from "../lib/env";
import {
  pullChildren,
  pullEvents,
  pullFamily,
  pullMeasurements,
  pushChildren,
  pushEvents,
  pushMeasurements,
  saveSettings,
} from "../lib/remote";
import { putChildLww } from "../repo/children";
import { putEventLww } from "../repo/events";
import { putMeasurementLww } from "../repo/measurements";
import * as outbox from "../repo/outbox";
import { deleteMeta, getMeta, setMeta } from "../repo/meta";
import { useSyncStatus } from "./status";
import type { OutboxEntry, ThemeMode } from "../lib/types";

const CURSOR_KEY = "cursor_events";
const PENDING_SETTINGS_KEY = "pending_settings";
const EVENT_PULL_LIMIT = 500;

/** Синхронизация: push outbox → pull и LWW-слияние (решения Q38/Q39). */
export async function syncNow(): Promise<void> {
  const status = useSyncStatus.getState();
  if (!isSupabaseConfigured) {
    status.set({ configState: "unconfigured", error: null });
    return;
  }
  if (!navigator.onLine) {
    status.set({ online: false });
    return;
  }
  status.set({ syncing: true, error: null });
  try {
    await pushOutbox();
    const family = await pullFamily();
    if (family !== null) {
      const db = await getDb();
      await db.put("families", family);
      await pullScope(family.id);
    }
    await flushPendingSettings();
    const pending = await outbox.count();
    status.set({ syncing: false, pending, lastSyncAt: new Date().toISOString(), online: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    status.set({ syncing: false, error: message });
  }
}

async function pushOutbox(): Promise<void> {
  const entries = await outbox.all();
  if (entries.length === 0) return;
  const byTable: Record<string, OutboxEntry[]> = {};
  for (const e of entries) {
    (byTable[e.table] ??= []).push(e);
  }
  await pushEvents((byTable["events"] ?? []).map((e) => e.row as never));
  await pushChildren((byTable["children"] ?? []).map((e) => e.row as never));
  await pushMeasurements((byTable["measurements"] ?? []).map((e) => e.row as never));
  await outbox.removeMany(entries.map((e) => e.id));
}

/**
 * Отложенный пуш user_settings (тема, последний ребёнок). Строго ПОСЛЕ pushOutbox:
 * last_child_id держит FK на детей — они уже должны быть в облаке.
 */
async function flushPendingSettings(): Promise<void> {
  const raw = await getMeta(PENDING_SETTINGS_KEY);
  if (raw === undefined) return;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    console.warn("Не удалось разобрать отложенные настройки:", e);
    await deleteMeta(PENDING_SETTINGS_KEY);
    return;
  }
  const userId = typeof parsed.userId === "string" ? parsed.userId : null;
  if (userId === null) {
    await deleteMeta(PENDING_SETTINGS_KEY);
    return;
  }
  try {
    await saveSettings({
      userId,
      ...(typeof parsed.themeMode === "string"
        ? { themeMode: parsed.themeMode as ThemeMode }
        : {}),
      ...(typeof parsed.scheduleStart === "string"
        ? { themeScheduleStart: parsed.scheduleStart }
        : {}),
      ...(typeof parsed.scheduleEnd === "string"
        ? { themeScheduleEnd: parsed.scheduleEnd }
        : {}),
      ...(typeof parsed.lastChildId === "string" ? { lastChildId: parsed.lastChildId } : {}),
    });
    await deleteMeta(PENDING_SETTINGS_KEY);
  } catch (e) {
    // Оставляем в мете — уйдёт при следующем синке.
    console.warn("Настройки не запушены, отложены на следующий синк:", e);
  }
}

async function pullScope(familyId: string): Promise<void> {
  const children = await pullChildren(familyId);
  for (const child of children) await putChildLww(child);
  const liveIds = children.filter((c) => c.deletedAt === null).map((c) => c.id);
  const measurements = await pullMeasurements(liveIds);
  for (const m of measurements) await putMeasurementLww(m);

  let cursor = await getMeta(CURSOR_KEY);
  for (;;) {
    const events = await pullEvents(familyId, cursor);
    for (const ev of events) await putEventLww(ev);
    if (events.length < EVENT_PULL_LIMIT) {
      const last = events.at(-1);
      if (last !== undefined) await setMeta(CURSOR_KEY, last.updatedAt);
      break;
    }
    const last = events.at(-1);
    if (last === undefined) break;
    cursor = last.updatedAt;
    await setMeta(CURSOR_KEY, cursor);
  }
}

/** Пересчитать только счётчик несинхронных (для UI без полного синка). */
export async function refreshPendingCount(): Promise<void> {
  useSyncStatus.getState().set({ pending: await outbox.count() });
}

/** Триггеры синка: сеть, возврат в приложение, явный запрос из сторов (DOM-событие). */
export function initSyncListeners(): () => void {
  const onOnline = (): void => {
    useSyncStatus.getState().set({ online: true });
    void syncNow();
  };
  const onOffline = (): void => useSyncStatus.getState().set({ online: false });
  const onVisible = (): void => {
    if (document.visibilityState === "visible") void syncNow();
  };
  const onRequested = (): void => void syncNow();
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("mishkin:sync", onRequested);
  void syncNow();
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("mishkin:sync", onRequested);
  };
}
