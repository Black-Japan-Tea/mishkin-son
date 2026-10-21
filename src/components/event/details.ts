import type {
  BottleKind,
  BreastSide,
  DiaperKind,
  DayTag,
  EventType,
} from "../../lib/types";

/** Снимок состояния полей деталей события (для сборки details). */
export interface DetailsState {
  dayTag: DayTag;
  place: string;
  note: string;
  side: BreastSide;
  ml: string;
  kind: BottleKind;
  food: string;
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
    case "feed_breast":
      return { side: s.side };
    case "feed_bottle": {
      const volume = Number.parseInt(s.ml, 10);
      return { volumeMl: Number.isNaN(volume) ? 0 : volume, kind: s.kind };
    }
    case "feed_solid": {
      const d: { food?: string; note?: string } = {};
      if (s.food !== "") d.food = s.food;
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
  | { side: BreastSide }
  | { volumeMl: number; kind?: BottleKind }
  | { food?: string; note?: string }
  | { volumeMl?: number }
  | { kind: DiaperKind };

export const TYPE_OPTIONS: ReadonlyArray<{ value: EventType; label: string }> = [
  { value: "sleep", label: "Сон" },
  { value: "feed_breast", label: "Грудь" },
  { value: "feed_bottle", label: "Бутылочка" },
  { value: "feed_solid", label: "Прикорм" },
  { value: "feed_water", label: "Вода" },
  { value: "diaper", label: "Подгузник" },
];

/** Таймер/время окончания нужны только сну и груди (решение Q28-уточнение). */
export function needsEnd(type: EventType): boolean {
  return type === "sleep" || type === "feed_breast";
}
