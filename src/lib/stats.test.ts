import { describe, expect, it } from "vitest";
import { feedsByDaySplit, sleepByDay, sleepByDaySplit, feedsByDay } from "./stats";
import type { AppEvent, BottleDetails, SolidDetails, WaterDetails } from "./types";

// Фикстуры в стиле engine.test.ts: минуты/часы подобраны так, чтобы локальный
// день совпадал с UTC-днём в широком диапазоне таймзон.

function sleep(id: string, startIso: string, endIso: string, dayTag: "day" | "night"): AppEvent {
  return {
    id,
    childId: "c1",
    familyId: "f1",
    createdBy: "u1",
    type: "sleep",
    startedAt: startIso,
    endedAt: endIso,
    parentEventId: null,
    createdAt: startIso,
    updatedAt: startIso,
    deletedAt: null,
    details: { dayTag },
  };
}

function bottle(id: string, startIso: string, details: BottleDetails): AppEvent {
  return { id, childId: "c1", familyId: "f1", createdBy: "u1", type: "feed_bottle", startedAt: startIso, endedAt: startIso, parentEventId: null, createdAt: startIso, updatedAt: startIso, deletedAt: null, details };
}

function solid(id: string, startIso: string, details: SolidDetails): AppEvent {
  return { id, childId: "c1", familyId: "f1", createdBy: "u1", type: "feed_solid", startedAt: startIso, endedAt: startIso, parentEventId: null, createdAt: startIso, updatedAt: startIso, deletedAt: null, details };
}

function water(id: string, startIso: string, details: WaterDetails): AppEvent {
  return { id, childId: "c1", familyId: "f1", createdBy: "u1", type: "feed_water", startedAt: startIso, endedAt: startIso, parentEventId: null, createdAt: startIso, updatedAt: startIso, deletedAt: null, details };
}

const KEYS = ["2026-11-05", "2026-11-06", "2026-11-07"];

describe("sleepByDaySplit", () => {
  it("разделяет стек ночной/дневной по details.dayTag", () => {
    const events = [
      sleep("s1", "2026-11-06T08:00:00Z", "2026-11-06T09:30:00Z", "day"),
      sleep("s2", "2026-11-06T19:00:00Z", "2026-11-07T04:00:00Z", "night"),
    ];
    const split = sleepByDaySplit(events, ["2026-11-06"]);
    expect(split).toEqual([{ dayKey: "2026-11-06", nightHours: 9, dayHours: 1.5 }]);
  });

  it("сумма стеков совпадает с sleepByDay (день засыпания)", () => {
    const events = [
      sleep("s1", "2026-11-06T08:00:00Z", "2026-11-06T09:00:00Z", "day"),
      sleep("s2", "2026-11-06T10:00:00Z", "2026-11-06T11:20:00Z", "day"),
      sleep("s3", "2026-11-06T19:00:00Z", "2026-11-07T03:40:00Z", "night"),
    ];
    const keys = ["2026-11-06"];
    const split = sleepByDaySplit(events, keys)[0];
    const total = sleepByDay(events, keys)[0];
    if (split === undefined || total === undefined) throw new Error("нет строки за день");
    expect(split.nightHours + split.dayHours).toBe(total.hours);
  });

  it("суммирует несколько сегментов одного тега с округлением до 0,1", () => {
    const events = [
      // 50 мин + 40 мин дневного = 90 мин = 1,5 ч
      sleep("s1", "2026-11-06T09:00:00Z", "2026-11-06T09:50:00Z", "day"),
      sleep("s2", "2026-11-06T11:00:00Z", "2026-11-06T11:40:00Z", "day"),
      sleep("s3", "2026-11-06T19:00:00Z", "2026-11-07T01:10:00Z", "night"),
    ];
    expect(sleepByDaySplit(events, ["2026-11-06"])).toEqual([
      { dayKey: "2026-11-06", nightHours: 6.2, dayHours: 1.5 },
    ]);
  });

  it("пустой день даёт нули, чужой день не попадает в выборку", () => {
    const events = [
      sleep("s1", "2026-11-05T08:00:00Z", "2026-11-05T09:00:00Z", "day"),
      sleep("s2", "2026-11-05T19:00:00Z", "2026-11-06T04:00:00Z", "night"),
    ];
    expect(sleepByDaySplit([], KEYS)).toEqual([
      { dayKey: "2026-11-05", nightHours: 0, dayHours: 0 },
      { dayKey: "2026-11-06", nightHours: 0, dayHours: 0 },
      { dayKey: "2026-11-07", nightHours: 0, dayHours: 0 },
    ]);
    // Сон 5-го целиком относится ко дню засыпания; 6-й и 7-й пустые.
    expect(sleepByDaySplit(events, KEYS)).toEqual([
      { dayKey: "2026-11-05", nightHours: 9, dayHours: 1 },
      { dayKey: "2026-11-06", nightHours: 0, dayHours: 0 },
      { dayKey: "2026-11-07", nightHours: 0, dayHours: 0 },
    ]);
  });

  it("игнорирует удалённые события и активный сон без endedAt", () => {
    const live = sleep("s1", "2026-11-06T08:00:00Z", "2026-11-06T09:00:00Z", "day");
    const active = sleep("s2", "2026-11-06T19:00:00Z", "", "night");
    active.endedAt = null;
    // Дубль с deletedAt не должен удвоить час; активный сон не даёт длительности.
    const events = [live, { ...live, id: "s1-del", deletedAt: "2026-11-06T10:00:00Z" }, active];
    expect(sleepByDaySplit(events, ["2026-11-06"])).toEqual([
      { dayKey: "2026-11-06", nightHours: 0, dayHours: 1 },
    ]);
  });
});

describe("feedsByDaySplit", () => {
  it("разделяет смесь и воду по details.kind бутылочки", () => {
    const events = [
      bottle("b1", "2026-11-06T08:00:00Z", { volumeMl: 240, kind: "formula" }),
      bottle("b2", "2026-11-06T12:00:00Z", { volumeMl: 70, kind: "water" }),
      bottle("b3", "2026-11-06T16:00:00Z", { volumeMl: 180, kind: "formula" }),
    ];
    expect(feedsByDaySplit(events, ["2026-11-06"])).toEqual([
      { dayKey: "2026-11-06", mixMl: 420, waterMl: 70, count: 3 },
    ]);
  });

  it("легаси feed_water идёт в воду в мл, но не считается кормлением", () => {
    const events = [
      bottle("b1", "2026-11-06T08:00:00Z", { volumeMl: 200, kind: "formula" }),
      water("w1", "2026-11-06T10:00:00Z", { volumeMl: 50 }),
      // Легаси-строка может нести volumeMl = null/undefined — падение в 0 без исключения.
      water("w2", "2026-11-06T11:00:00Z", {}),
    ];
    expect(feedsByDaySplit(events, ["2026-11-06"])).toEqual([
      { dayKey: "2026-11-06", mixMl: 200, waterMl: 50, count: 1 },
    ]);
  });

  it("прикорм учитывается в count, но не в мл; согласуется с feedsByDay.count", () => {
    const events = [
      bottle("b1", "2026-11-06T08:00:00Z", { volumeMl: 210, kind: "formula" }),
      solid("sd1", "2026-11-06T13:00:00Z", { food: "кабачок", amount: 90, unit: "g" }),
      bottle("b2", "2026-11-06T17:00:00Z", { volumeMl: 60, kind: "water" }),
    ];
    const keys = ["2026-11-06"];
    const split = feedsByDaySplit(events, keys)[0];
    expect(split).toEqual({ dayKey: "2026-11-06", mixMl: 210, waterMl: 60, count: 3 });
    expect(split?.count).toBe(feedsByDay(events, keys)[0]?.count);
  });

  it("легаси-строка kind бутылочки (не «water») трактуется как смесь", () => {
    const events = [bottle("b1", "2026-11-06T08:00:00Z", { volumeMl: 150, kind: "milk" })];
    expect(feedsByDaySplit(events, ["2026-11-06"])).toEqual([
      { dayKey: "2026-11-06", mixMl: 150, waterMl: 0, count: 1 },
    ]);
  });

  it("пустой день и чужой день дают нули", () => {
    const events = [
      bottle("b1", "2026-11-05T08:00:00Z", { volumeMl: 240, kind: "water" }),
      water("w1", "2026-11-05T12:00:00Z", { volumeMl: 30 }),
    ];
    expect(feedsByDaySplit([], ["2026-11-06"])).toEqual([
      { dayKey: "2026-11-06", mixMl: 0, waterMl: 0, count: 0 },
    ]);
    expect(feedsByDaySplit(events, ["2026-11-06"])).toEqual([
      { dayKey: "2026-11-06", mixMl: 0, waterMl: 0, count: 0 },
    ]);
  });

  it("удалённые кормления не попадают в стек", () => {
    const b = bottle("b1", "2026-11-06T08:00:00Z", { volumeMl: 240, kind: "formula" });
    const events = [b, { ...b, id: "b1-del", deletedAt: "2026-11-06T09:00:00Z" }];
    expect(feedsByDaySplit(events, ["2026-11-06"])).toEqual([
      { dayKey: "2026-11-06", mixMl: 240, waterMl: 0, count: 1 },
    ]);
  });
});
