import { ageInMonths } from "../time";

export interface SleepNorm {
  /** Диапазон общего сна за сутки, минуты */
  totalMin: [number, number];
  /** Ожидаемое число дневных снов */
  naps: [number, number];
  /** Медианное окно бодрствования, минуты */
  wakeWindowMin: [number, number];
}

/**
 * Справочные диапазоны (NSF/AAP, согласованы с рекомендациями ВОЗ по суточному сну).
 * Это ориентиры для мягких наблюдений, не медицинская норма (см. план §12).
 */
const TABLE: Array<{ untilMonth: number; norm: SleepNorm }> = [
  { untilMonth: 1, norm: { totalMin: [840, 1020], naps: [3, 6], wakeWindowMin: [45, 60] } },
  { untilMonth: 3, norm: { totalMin: [780, 960], naps: [3, 5], wakeWindowMin: [60, 90] } },
  { untilMonth: 6, norm: { totalMin: [720, 960], naps: [3, 4], wakeWindowMin: [90, 150] } },
  { untilMonth: 9, norm: { totalMin: [720, 900], naps: [2, 3], wakeWindowMin: [150, 210] } },
  { untilMonth: 12, norm: { totalMin: [720, 900], naps: [2, 3], wakeWindowMin: [180, 240] } },
  { untilMonth: 18, norm: { totalMin: [660, 840], naps: [1, 2], wakeWindowMin: [180, 270] } },
  { untilMonth: 36, norm: { totalMin: [660, 840], naps: [1, 2], wakeWindowMin: [240, 330] } },
  { untilMonth: 72, norm: { totalMin: [600, 780], naps: [0, 1], wakeWindowMin: [300, 390] } },
];

export function sleepNormForAge(birthDate: string, now: Date = new Date()): SleepNorm {
  const months = ageInMonths(birthDate, now);
  for (const row of TABLE) {
    if (months < row.untilMonth) return row.norm;
  }
  return TABLE[TABLE.length - 1]?.norm ?? TABLE[0]!.norm;
}

export function normHoursLabel([from, to]: [number, number]): string {
  const f = Math.round((from / 60) * 10) / 10;
  const t = Math.round((to / 60) * 10) / 10;
  return `${f}–${t} ч`;
}
