import { ageInMonths, dayKeyOf, formatClock } from "../time";
import {
  averageSleepMs,
  feedStatsOnDay,
  lastSleepEnd,
  liveEvents,
  medianWakeWindowMin,
  napsOnDay,
  nightFeedingsOnDay,
  sleepMsOnDay,
} from "./patterns";
import { normHoursLabel, sleepNormForAge } from "./norms";
import type { AppEvent, Child } from "../types";

export interface Tip {
  id: string;
  icon: "sleep" | "food" | "window" | "info";
  text: string;
}

function hours(ms: number): number {
  return Math.round((ms / 3600000) * 10) / 10;
}

function lastNDayKeys(n: number, now: Date): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(dayKeyOf(d.toISOString()));
  }
  return keys;
}

/**
 * Детерминированный офлайн-движок (план §12): нормы возраста + личные паттерны.
 * Только мягкие наблюдения, без давления. Вызывается по открытию экрана «Советы».
 */
export function generateTips(child: Child, rawEvents: AppEvent[], now: Date = new Date()): Tip[] {
  const events = liveEvents(rawEvents);
  const tips: Tip[] = [];
  const norm = sleepNormForAge(child.birthDate, now);
  const today = dayKeyOf(now.toISOString());
  const todayMs = sleepMsOnDay(events, today);
  const weekKeys = lastNDayKeys(7, now);
  const weekAvgMs = averageSleepMs(events, weekKeys);

  // Сводка дня
  tips.push({
    id: "today-summary",
    icon: "sleep",
    text: `Сегодня малыш спал ${hours(todayMs)} ч. Норма для возраста — ${normHoursLabel(
      norm.totalMin,
    )}, за последние 7 дней в среднем ${hours(weekAvgMs)} ч.`,
  });

  if (todayMs < norm.totalMin[0] * 60000 && weekAvgMs > 0) {
    tips.push({
      id: "sleep-below",
      icon: "sleep",
      text: `Общий сон сегодня ниже привычного. Возможно, стоит попробовать уложить чуть раньше вечером.`,
    });
  } else if (todayMs > norm.totalMin[1] * 60000) {
    tips.push({
      id: "sleep-above",
      icon: "sleep",
      text: `Сегодня сна больше обычного — иногда так бывает при скачках роста или после активного дня.`,
    });
  }

  const naps = napsOnDay(events, today).length;
  if (naps < norm.naps[0] && ageInMonths(child.birthDate, now) >= 1) {
    tips.push({
      id: "naps-few",
      icon: "sleep",
      text: `Дневных снов сегодня ${naps}, обычно в этом возрасте ${
        norm.naps[0] === norm.naps[1] ? norm.naps[0] : `${norm.naps[0]}–${norm.naps[1]}`
      }. Если малыш не выглядит уставшим — всё в порядке.`,
    });
  }

  // Ночные кормления: тренд 7 дней против предыдущих 7
  const prevKeys = lastNDayKeys(14, now).slice(7);
  const recent = weekKeys.reduce((s, k) => s + nightFeedingsOnDay(events, k).length, 0);
  const prev = prevKeys.reduce((s, k) => s + nightFeedingsOnDay(events, k).length, 0);
  if (prevKeys.length > 0 && prev > 0 && recent > prev) {
    tips.push({
      id: "night-feed-trend",
      icon: "food",
      text: `Ночных кормлений за неделю стало больше (${recent} против ${prev}). Часто это скачок роста — обычно проходит само.`,
    });
  } else if (recent === 0 && weekKeys.some((k) => sleepMsOnDay(events, k) > 0)) {
    tips.push({
      id: "night-feed-none",
      icon: "food",
      text: `За неделю ночных кормлений не было — отличный прогресс, если малыш старше 6 месяцев.`,
    });
  }

  // Прогноз окна сна
  const activeSleep = events.find((e) => e.type === "sleep" && e.endedAt === null);
  if (activeSleep === undefined) {
    const lastEnd = lastSleepEnd(events);
    const median = medianWakeWindowMin(events);
    const wakeWindow =
      median ?? Math.round((norm.wakeWindowMin[0] + norm.wakeWindowMin[1]) / 2);
    if (lastEnd !== null) {
      const predicted = new Date(new Date(lastEnd).getTime() + wakeWindow * 60000);
      tips.push({
        id: "window",
        icon: "window",
        text: `Малыш бодрствует ${Math.round(
          (now.getTime() - new Date(lastEnd).getTime()) / 60000,
        )} мин. Ближайшее окно сна — около ${formatClock(predicted.toISOString())}.`,
      });
    } else {
      tips.push({
        id: "window-unknown",
        icon: "window",
        text: `Пока мало данных о сне: отметь пару снов, и я начну предсказывать удобные окна укладывания.`,
      });
    }
  }

  const feed = feedStatsOnDay(events, today);
  if (feed.count > 0) {
    const mlPart = feed.ml > 0 ? `, ${feed.ml} мл из бутылочки/воды` : "";
    tips.push({
      id: "feed-summary",
      icon: "food",
      text: `Кормлений сегодня: ${feed.count}${mlPart}.`,
    });
  }

  tips.push({
    id: "disclaimer",
    icon: "info",
    text: `Это наблюдения по данным трекера, а не медицинская рекомендация. При вопросах о здоровье — педиатр.`,
  });
  return tips;
}
