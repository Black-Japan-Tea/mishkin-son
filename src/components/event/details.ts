import type {
  BottleKind,
  DiaperKind,
  DayTag,
  EventType,
  SolidUnit,
} from "../../lib/types";

/** Снимок состояния полей деталей события (для сборки details). */
export interface DetailsState {
  dayTag: DayTag;
  place: string;
  note: string;
  ml: string;
  kind: BottleKind;
  food: string;
  /** Количество прикорма строкой из input; пусто = не указано. */
  amount: string;
  unit: SolidUnit;
  waterMl: string;
  diaperKind: DiaperKind;
}

export function buildEventDetails(type: EventType, s: DetailsState): EventDetailsUnion {
  switch (type) {
    case "sleep": {
      const d: { dayTag: DayTag; place?: string; note?: string } = { dayTag: s.dayTag };
      if (s.place !== "") d.place = s.place;
      if (s.note !== "") d.note = s.note;
      return d;
    }
    case "feed_bottle": {
      const volume = Number.parseInt(s.ml, 10);
      return { volumeMl: Number.isNaN(volume) ? 0 : volume, kind: s.kind };
    }
    case "feed_solid": {
      const d: { food?: string; amount?: number; unit?: SolidUnit; note?: string } = {};
      if (s.food !== "") d.food = s.food;
      const amount = Number.parseInt(s.amount, 10);
      // Нулевое/нечисловое количество не пишем — оба поля прикорма опциональны.
      if (!Number.isNaN(amount) && amount > 0) {
        d.amount = amount;
        d.unit = s.unit;
      }
      if (s.note !== "") d.note = s.note;
      return d;
    }
    case "feed_water": {
      const volume = Number.parseInt(s.waterMl, 10);
      return Number.isNaN(volume) ? {} : { volumeMl: volume };
    }
    case "diaper":
      return { kind: s.diaperKind };
  }
}

export type EventDetailsUnion =
  | { dayTag: DayTag; place?: string; note?: string }
  | { volumeMl: number; kind: BottleKind }
  | { food?: string; amount?: number; unit?: SolidUnit; note?: string }
  | { volumeMl?: number }
  | { kind: DiaperKind };

/** Вода записывается через бутылочку; тип оставлен в модели для старых записей. */
export const TYPE_OPTIONS: ReadonlyArray<{ value: EventType; label: string }> = [
  { value: "sleep", label: "Сон" },
  { value: "feed_bottle", label: "Бутылочка" },
  { value: "feed_solid", label: "Прикорм" },
  { value: "diaper", label: "Подгузник" },
];

/** Поле «Конец» нужно только сну (таймер груди убран из проекта, D1). */
export function needsEnd(type: EventType): boolean {
  return type === "sleep";
}
