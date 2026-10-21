import { dayKeyOf } from "../time";
import type { AppEvent, SleepEvent } from "../types";

/** Чистые функции-паттерны над событиями. Работают с живыми (не удалёнными) событиями. */

export function liveEvents(events: AppEvent[]): AppEvent[] {
  return events.filter((e) => e.deletedAt === null);
}

export function isSleep(e: AppEvent): e is SleepEvent {
  return e.type === "sleep" && e.endedAt !== null;
}

export function sleepSegments(events: AppEvent[]): SleepEvent[] {
  return liveEvents(events).filter(isSleep).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/** Общий сон за локальный день; ночной сон учитывается по дню засыпания. */
export function sleepMsOnDay(events: AppEvent[], dayKey: string): number {
  return sleepSegments(events)
    .filter((s) => dayKeyOf(s.startedAt) === dayKey)
    .reduce((sum, s) => sum + (new Date(s.endedAt ?? s.startedAt).getTime() - new Date(s.startedAt).getTime()), 0);
}

export function napsOnDay(events: AppEvent[], dayKey: string): SleepEvent[] {
  return sleepSegments(events).filter(
    (s) => dayKeyOf(s.startedAt) === dayKey && s.details.dayTag === "day",
  );
}

export function nightFeedingsOnDay(events: AppEvent[], dayKey: string): AppEvent[] {
  return liveEvents(events).filter(
    (e) => e.parentEventId !== null && dayKeyOf(e.startedAt) === dayKey,
  );
}

/** Медианное окно бодрствования: конец сна → начало следующего сна. */
export function medianWakeWindowMin(events: AppEvent[]): number | null {
  const sleeps = sleepSegments(events);
  const windows: number[] = [];
  for (let i = 0; i < sleeps.length - 1; i++) {
    const prev = sleeps[i];
    const next = sleeps[i + 1];
    if (prev === undefined || next === undefined || prev.endedAt === null) continue;
    const gapMin = (new Date(next.startedAt).getTime() - new Date(prev.endedAt).getTime()) / 60000;
    if (gapMin > 15 && gapMin < 12 * 60) windows.push(gapMin);
  }
  if (windows.length === 0) return null;
  windows.sort((a, b) => a - b);
  const mid = Math.floor(windows.length / 2);
  const odd = windows.length % 2 === 1;
  const value = odd
    ? (windows[mid] ?? 0)
    : Math.round(((windows[mid - 1] ?? 0) + (windows[mid] ?? 0)) / 2);
  return value;
}

export function lastSleepEnd(events: AppEvent[]): string | null {
  // sleepSegments содержит только завершённые сны; активный сон = ребёнок ещё спит.
  return sleepSegments(events).at(-1)?.endedAt ?? null;
}

export function averageSleepMs(events: AppEvent[], dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const total = dayKeys.reduce((sum, k) => sum + sleepMsOnDay(events, k), 0);
  return total / dayKeys.length;
}

export interface FeedDayStat {
  count: number;
  ml: number;
}

export function feedStatsOnDay(events: AppEvent[], dayKey: string): FeedDayStat {
  let count = 0;
  let ml = 0;
  for (const e of liveEvents(events)) {
    if (dayKeyOf(e.startedAt) !== dayKey) continue;
    if (e.type === "feed_breast" || e.type === "feed_solid") {
      count++;
    } else if (e.type === "feed_bottle") {
      count++;
      ml += e.details.volumeMl;
    } else if (e.type === "feed_water") {
      ml += e.details.volumeMl ?? 0;
    }
  }
  return { count, ml };
}
