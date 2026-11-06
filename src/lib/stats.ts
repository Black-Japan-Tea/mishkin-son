import { dayKeyOf } from "./time";
import {
  feedStatsOnDay,
  liveEvents,
  sleepMsOnDay,
  sleepSegments,
  type FeedDayStat,
} from "./advisor/patterns";
import type { AppEvent } from "./types";

/** Округление часов до 0,1 — единый формат для графиков. */
function roundHours(ms: number): number {
  return Math.round((ms / 3600000) * 10) / 10;
}

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

export interface DailySleepSplit {
  dayKey: string;
  /** Часы ночного сна (день засыпания — как в sleepByDay) */
  nightHours: number;
  /** Часы дневного сна */
  dayHours: number;
}

/**
 * Сон по дням с разделением ночной/дневной по details.dayTag — стек для графика.
 * Отнесение ко дню засыпания совпадает с sleepByDay: nightHours + dayHours
 * в сумме дают часы из sleepByDay за тот же день.
 */
export function sleepByDaySplit(events: AppEvent[], dayKeys: string[]): DailySleepSplit[] {
  return dayKeys.map((dayKey) => {
    let nightMs = 0;
    let dayMs = 0;
    for (const s of sleepSegments(events)) {
      if (dayKeyOf(s.startedAt) !== dayKey) continue;
      const durationMs =
        new Date(s.endedAt ?? s.startedAt).getTime() - new Date(s.startedAt).getTime();
      if (s.details.dayTag === "day") {
        dayMs += durationMs;
      } else {
        nightMs += durationMs;
      }
    }
    return { dayKey, nightHours: roundHours(nightMs), dayHours: roundHours(dayMs) };
  });
}

export interface DailyFeeds extends FeedDayStat {
  dayKey: string;
}

export function feedsByDay(events: AppEvent[], dayKeys: string[]): DailyFeeds[] {
  return dayKeys.map((dayKey) => ({ dayKey, ...feedStatsOnDay(events, dayKey) }));
}

export interface DailyFeedsSplit {
  dayKey: string;
  /** Объём смеси (бутылочки с kind ≠ "water") */
  mixMl: number;
  /** Вода: бутылочки kind = "water" + легаси-события feed_water */
  waterMl: number;
  /** Число кормлений: бутылочки + прикорм (как в feedStatsOnDay) */
  count: number;
}

/**
 * Кормления по дням с разбивкой смесь/вода в мл — стек для графика.
 * Счётчик кормлений совпадает с feedsByDay: бутылочки и прикорм;
 * легаси feed_water даёт только мл в воду, в count не попадает.
 */
export function feedsByDaySplit(events: AppEvent[], dayKeys: string[]): DailyFeedsSplit[] {
  return dayKeys.map((dayKey) => {
    let mixMl = 0;
    let waterMl = 0;
    let count = 0;
    for (const e of liveEvents(events)) {
      if (dayKeyOf(e.startedAt) !== dayKey) continue;
      if (e.type === "feed_solid") {
        count++;
      } else if (e.type === "feed_bottle") {
        count++;
        // Легаси-строки kind ("milk" и т.п.) трактуются как смесь: вода — только явный "water".
        if (e.details.kind === "water") {
          waterMl += e.details.volumeMl;
        } else {
          mixMl += e.details.volumeMl;
        }
      } else if (e.type === "feed_water") {
        waterMl += e.details.volumeMl ?? 0;
      }
    }
    return { dayKey, mixMl, waterMl, count };
  });
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

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

/** Подпись оси графика: 7 дней — пн–вс; 14 — числа месяца (как в превью). */
export function dayAxisLabel(dayKey: string, dates: boolean): string {
  if (dates) return String(Number.parseInt(dayKey.slice(8), 10));
  const [y, m, d] = dayKey.split("-");
  // Локальная дата без UTC-сдвига: new Date("YYYY-MM-DD") парсится как UTC.
  const date = new Date(
    Number.parseInt(y ?? "1970", 10),
    Number.parseInt(m ?? "1", 10) - 1,
    Number.parseInt(d ?? "1", 10),
  );
  return WEEKDAYS[date.getDay()] ?? "";
}
