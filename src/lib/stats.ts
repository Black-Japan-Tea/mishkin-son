import { dayKeyOf } from "./time";
import { feedStatsOnDay, sleepMsOnDay, type FeedDayStat } from "./advisor/patterns";
import type { AppEvent } from "./types";

export interface DailySleep {
  dayKey: string;
  hours: number;
}

/** Сон по дням для графика; ночной сон относится ко дню засыпания (см. patterns). */
export function sleepByDay(events: AppEvent[], dayKeys: string[]): DailySleep[] {
  return dayKeys.map((dayKey) => ({
    dayKey,
    hours: Math.round((sleepMsOnDay(events, dayKey) / 3600000) * 10) / 10,
  }));
}

export interface DailyFeeds extends FeedDayStat {
  dayKey: string;
}

export function feedsByDay(events: AppEvent[], dayKeys: string[]): DailyFeeds[] {
  return dayKeys.map((dayKey) => ({ dayKey, ...feedStatsOnDay(events, dayKey) }));
}

export function lastNDayKeys(n: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(dayKeyOf(d.toISOString()));
  }
  return keys;
}

export function shortDayLabel(dayKey: string): string {
  const [, m, d] = dayKey.split("-");
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const monthIdx = Number.parseInt(m ?? "1", 10) - 1;
  return `${d ?? ""} ${months[monthIdx] ?? ""}`.trim();
}
