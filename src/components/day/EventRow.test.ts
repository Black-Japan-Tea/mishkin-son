import { describe, expect, it } from "vitest";
import { eventSubtitle, eventTitle } from "./EventRow";
import { formatClock, formatDuration } from "../../lib/time";
import type { AppEvent, BottleDetails, DiaperDetails, SleepDetails, SolidDetails } from "../../lib/types";

const START = "2026-10-21T12:00:00Z";
const END = "2026-10-21T14:00:00Z";

/** Общая база мгновенного события: startedAt === endedAt. */
const BASE = {
  id: "e1",
  childId: "c1",
  familyId: "f1",
  createdBy: "u1",
  startedAt: START,
  endedAt: START,
  parentEventId: null,
  createdAt: START,
  updatedAt: START,
  deletedAt: null,
};

function bottle(details: BottleDetails): AppEvent {
  return { ...BASE, type: "feed_bottle", details };
}

function solid(details: SolidDetails): AppEvent {
  return { ...BASE, type: "feed_solid", details };
}

function diaper(details: DiaperDetails): AppEvent {
  return { ...BASE, type: "diaper", details };
}

function sleep(details: SleepDetails, endedAt: string | null): AppEvent {
  return { ...BASE, type: "sleep", endedAt, details };
}

/** Сдвиг времени (правка задним числом): все поля общие для EventBase, юнион не ломаем. */
function retimed(e: AppEvent, startedAt: string, endedAt: string): AppEvent {
  return { ...e, startedAt, endedAt };
}

describe("eventTitle — бутылочка", () => {
  it("показывает вид: смеси", () => {
    expect(eventTitle(bottle({ volumeMl: 54, kind: "formula" }))).toBe("Бутылочка: 54 мл смеси");
  });

  it("показывает вид: воды", () => {
    expect(eventTitle(bottle({ volumeMl: 54, kind: "water" }))).toBe("Бутылочка: 54 мл воды");
  });

  it("легаси milk из старых строк БД не роняет заголовок", () => {
    expect(eventTitle(bottle({ volumeMl: 54, kind: "milk" }))).toBe("Бутылочка: 54 мл сцеженного");
  });

  it("без kind — только объём", () => {
    expect(eventTitle(bottle({ volumeMl: 54 }))).toBe("Бутылочка: 54 мл");
  });
});

describe("eventTitle — прикорм", () => {
  it("еда + количество", () => {
    expect(eventTitle(solid({ food: "Кабачок", amount: 120, unit: "g" }))).toBe("Прикорм: Кабачок, 120 г");
  });

  it("только еда", () => {
    expect(eventTitle(solid({ food: "Кабачок" }))).toBe("Прикорм: Кабачок");
  });

  it("только количество в мл", () => {
    expect(eventTitle(solid({ amount: 50, unit: "ml" }))).toBe("Прикорм: 50 мл");
  });

  it("пусто — нейтральный заголовок", () => {
    expect(eventTitle(solid({}))).toBe("Прикорм");
  });
});

describe("eventTitle — подгузник", () => {
  it("пописал", () => {
    expect(eventTitle(diaper({ kind: "pee" }))).toBe("Подгузник: пописал");
  });

  it("покакал", () => {
    expect(eventTitle(diaper({ kind: "poop" }))).toBe("Подгузник: покакал");
  });

  it("легаси both — нейтральный заголовок", () => {
    expect(eventTitle(diaper({ kind: "both" }))).toBe("Подгузник");
  });
});

describe("eventTitle — легаси-тип вне EventType", () => {
  it("неизвестный тип даёт нейтральный заголовок вместо undefined", () => {
    // Имитация старой локальной записи (грудь) до очистки истории: юнион уже не содержит этот тип.
    const legacy = { ...BASE, type: "feed_breast", details: { side: "left" } } as unknown as AppEvent;
    expect(eventTitle(legacy)).toBe("Событие");
  });
});

describe("eventSubtitle", () => {
  it("мгновенное событие — одним временем без диапазона", () => {
    expect(eventSubtitle(bottle({ volumeMl: 54, kind: "formula" }))).toBe(formatClock(START));
  });

  it("мгновенное событие после правки задним числом — диапазоном", () => {
    const backdated = retimed(bottle({ volumeMl: 54 }), "2026-10-21T10:00:00Z", END);
    expect(eventSubtitle(backdated)).toBe(`${formatClock("2026-10-21T10:00:00Z")} → ${formatClock(END)}`);
  });

  it("сон — длительность и диапазон", () => {
    const text = eventSubtitle(sleep({ dayTag: "night" }, END));
    expect(text).toBe(`${formatDuration(2 * 60 * 60_000)} · ${formatClock(START)} → ${formatClock(END)}`);
  });

  it("активный сон — «с HH:MM · идёт»", () => {
    const text = eventSubtitle(sleep({ dayTag: "day" }, null));
    expect(text).toBe(`с ${formatClock(START)} · идёт`);
  });

  it("легаси-тип без endedAt не падает и показывает время", () => {
    const legacy = { ...BASE, type: "feed_breast", details: { side: "left" } } as unknown as AppEvent;
    expect(eventSubtitle(legacy)).toBe(formatClock(START));
  });
});
