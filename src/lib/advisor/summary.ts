import { dayKeyOf, formatDuration } from "../time";
import { liveEvents, napsOnDay, sleepMsOnDay } from "./patterns";
import type { AppEvent, BottleKind } from "../types";

/** Ключ разбивки бутылочек: актуальные виды (BottleKind) + легаси-значения старых записей БД. */
export type BottleKindKey = BottleKind | "milk" | "other";

/** Сводка сна за один локальный день. */
export interface SleepSummary {
  /** Завершённых дневных снов за день */
  naps: number;
  /** Суммарная длительность дневных снов, мс */
  napsTotalMs: number;
  /** Весь сон за день (день + ночь, по дню засыпания), мс */
  totalMs: number;
  /** Средняя длительность дневного сна, мс; 0, если дневных снов не было */
  avgNapMs: number;
}

/** Сводка еды за один локальный день. */
export interface FoodSummary {
  /** Кормлений: бутылочки + прикормы (вода — питьё, не кормление) */
  feeds: number;
  /** Всего мл из бутылочек, любые виды */
  bottleMl: number;
  /** Разбивка мл бутылочек по виду, включая легаси-записи */
  bottleMlByKind: Record<BottleKindKey, number>;
  /** Вода вне бутылочек (поильник), мл */
  waterMl: number;
  /** Прикормов за день */
  solids: number;
  /** Что ел: названия прикормов в хронологическом порядке */
  solidFoods: string[];
}

const KIND_LABELS: Record<BottleKindKey, string> = {
  formula: "смесь",
  milk: "молоко",
  water: "вода",
  other: "другое",
};

const KIND_ORDER: BottleKindKey[] = ["formula", "milk", "water", "other"];

/** kind в БД — легаси-строка без валидации юнионом (D2 в types.ts), мапим в безопасный ключ. */
function bottleKindKey(kind: string | undefined): BottleKindKey {
  if (kind === "formula" || kind === "water" || kind === "milk") return kind;
  return "other";
}

export function sleepSummary(events: AppEvent[], dayKey: string): SleepSummary {
  const naps = napsOnDay(events, dayKey);
  const napsTotalMs = naps.reduce(
    (sum, s) => sum + (new Date(s.endedAt ?? s.startedAt).getTime() - new Date(s.startedAt).getTime()),
    0,
  );
  return {
    naps: naps.length,
    napsTotalMs,
    totalMs: sleepMsOnDay(events, dayKey),
    avgNapMs: naps.length === 0 ? 0 : Math.round(napsTotalMs / naps.length),
  };
}

export function foodSummary(events: AppEvent[], dayKey: string): FoodSummary {
  const summary: FoodSummary = {
    feeds: 0,
    bottleMl: 0,
    bottleMlByKind: { formula: 0, milk: 0, water: 0, other: 0 },
    waterMl: 0,
    solids: 0,
    solidFoods: [],
  };
  // Хронологический порядок нужен для осмысленного списка «что ел»
  const dayEvents = liveEvents(events)
    .filter((e) => dayKeyOf(e.startedAt) === dayKey)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const e of dayEvents) {
    if (e.type === "feed_bottle") {
      summary.feeds++;
      summary.bottleMl += e.details.volumeMl;
      summary.bottleMlByKind[bottleKindKey(e.details.kind)] += e.details.volumeMl;
    } else if (e.type === "feed_water") {
      summary.waterMl += e.details.volumeMl ?? 0;
    } else if (e.type === "feed_solid") {
      summary.feeds++;
      summary.solids++;
      const food = e.details.food;
      if (food !== undefined && food !== "") summary.solidFoods.push(food);
    }
    // Остальные типы событий (sleep, diaper) в сводку еды не входят
  }
  return summary;
}

/** Короткая строка-сводка сна для страницы наблюдений. */
export function formatSleepSummary(s: SleepSummary): string {
  if (s.totalMs === 0) return "Сна сегодня не было";
  const napPart =
    s.naps === 0
      ? "дневных снов не было"
      : `дневных снов: ${s.naps}, всего ${formatDuration(s.napsTotalMs)}`;
  // Средняя имеет смысл только при двух и более снах
  const avgPart = s.naps > 1 ? `, в среднем ${formatDuration(s.avgNapMs)}` : "";
  return `${napPart}${avgPart} · весь сон за день ${formatDuration(s.totalMs)}`;
}

/** Короткая строка-сводка еды для страницы наблюдений. */
export function formatFoodSummary(s: FoodSummary): string {
  if (s.feeds === 0 && s.waterMl === 0) return "Кормлений сегодня не было";
  const parts: string[] = [`Кормлений: ${s.feeds}`];
  if (s.bottleMl > 0) {
    // Нули в разбивке не показываем
    const breakdown = KIND_ORDER.map((k) => ({ kind: k, ml: s.bottleMlByKind[k] }))
      .filter((x) => x.ml > 0)
      .map((x) => `${KIND_LABELS[x.kind]} ${x.ml} мл`);
    const detail = breakdown.length > 0 ? ` (${breakdown.join(", ")})` : "";
    parts.push(`из бутылочки ${s.bottleMl} мл${detail}`);
  }
  if (s.waterMl > 0) parts.push(`вода ${s.waterMl} мл`);
  if (s.solids > 0) {
    const foods = s.solidFoods.length > 0 ? ` (${s.solidFoods.join(", ")})` : "";
    parts.push(`прикорм: ${s.solids}${foods}`);
  }
  return parts.join(" · ");
}
