import { describe, expect, it } from "vitest";
import { dayKeyOf } from "../time";
import { foodSummary, formatFoodSummary, formatSleepSummary, sleepSummary } from "./summary";
import type { BottleEvent, DiaperEvent, SleepEvent, SolidEvent, WaterEvent } from "../types";

// День выводим из самих событий: тест не зависит от часового пояса машины
const DAY = dayKeyOf("2026-10-20T08:00:00Z");

function baseFields(id: string, startedAt: string, endedAt: string | null) {
  return {
    id,
    childId: "c1",
    familyId: "f1",
    createdBy: "u1",
    startedAt,
    endedAt,
    parentEventId: null,
    createdAt: startedAt,
    updatedAt: startedAt,
    deletedAt: null,
  };
}

function sleep(id: string, startIso: string, endIso: string | null, dayTag: "day" | "night"): SleepEvent {
  return { ...baseFields(id, startIso, endIso), type: "sleep", details: { dayTag } };
}

// kind в БД — легаси-строка (D2 в types.ts), поэтому в тестах не ограничиваем юнионом
function bottle(id: string, startIso: string, volumeMl: number, kind?: string): BottleEvent {
  return { ...baseFields(id, startIso, null), type: "feed_bottle", details: { volumeMl, kind } };
}

function water(id: string, startIso: string, volumeMl: number): WaterEvent {
  return { ...baseFields(id, startIso, null), type: "feed_water", details: { volumeMl } };
}

function solid(id: string, startIso: string, food?: string): SolidEvent {
  return { ...baseFields(id, startIso, null), type: "feed_solid", details: { food } };
}

function diaper(id: string, startIso: string): DiaperEvent {
  return { ...baseFields(id, startIso, null), type: "diaper", details: { kind: "pee" } };
}

describe("sleepSummary", () => {
  it("пустой список — нулевая сводка и текст-заглушка", () => {
    const s = sleepSummary([], DAY);
    expect(s).toEqual({ naps: 0, napsTotalMs: 0, totalMs: 0, avgNapMs: 0 });
    expect(formatSleepSummary(s)).toBe("Сна сегодня не было");
  });

  it("два дневных сна: сумма и средняя; ночной сон не в дневных, но в общем", () => {
    const events = [
      sleep("n1", "2026-10-20T08:00:00Z", "2026-10-20T09:00:00Z", "day"), // 60 мин
      sleep("n2", "2026-10-20T12:00:00Z", "2026-10-20T13:30:00Z", "day"), // 90 мин
      sleep("k1", "2026-10-20T20:00:00Z", "2026-10-20T23:00:00Z", "night"), // 180 мин
    ];
    const s = sleepSummary(events, DAY);
    expect(s.naps).toBe(2);
    expect(s.napsTotalMs).toBe(150 * 60_000);
    expect(s.avgNapMs).toBe(75 * 60_000);
    expect(s.totalMs).toBe((150 + 180) * 60_000);
    expect(formatSleepSummary(s)).toBe(
      "дневных снов: 2, всего 2 ч 30 мин, в среднем 1 ч 15 мин · весь сон за день 5 ч 30 мин",
    );
  });

  it("активный (незавершённый) сон не учитывается", () => {
    const events = [sleep("a1", "2026-10-20T10:00:00Z", null, "day")];
    const s = sleepSummary(events, DAY);
    expect(s.naps).toBe(0);
    expect(s.totalMs).toBe(0);
    expect(formatSleepSummary(s)).toBe("Сна сегодня не было");
  });
});

describe("foodSummary", () => {
  it("пустой список — нулевая сводка и текст-заглушка", () => {
    const f = foodSummary([], DAY);
    expect(f.feeds).toBe(0);
    expect(f.bottleMl).toBe(0);
    expect(f.bottleMlByKind).toEqual({ formula: 0, milk: 0, water: 0, other: 0 });
    expect(f.waterMl).toBe(0);
    expect(f.solids).toBe(0);
    expect(f.solidFoods).toEqual([]);
    expect(formatFoodSummary(f)).toBe("Кормлений сегодня не было");
  });

  it("бутылочки: суммы мл с разбивкой formula/water, вода из поильника отдельно", () => {
    const events = [
      bottle("b1", "2026-10-20T08:00:00Z", 150, "formula"),
      bottle("b2", "2026-10-20T11:00:00Z", 100, "water"),
      water("w1", "2026-10-20T14:00:00Z", 120),
    ];
    const f = foodSummary(events, DAY);
    expect(f.feeds).toBe(2); // вода — питьё, не кормление
    expect(f.bottleMl).toBe(250);
    expect(f.bottleMlByKind.formula).toBe(150);
    expect(f.bottleMlByKind.water).toBe(100);
    expect(f.waterMl).toBe(120);
    const line = formatFoodSummary(f);
    expect(line).toContain("смесь 150 мл");
    expect(line).toContain("вода 100 мл");
    expect(line).toContain("вода 120 мл");
  });

  it("легаси-kind «milk» и запись без kind попадают в свои корзины", () => {
    const f = foodSummary(
      [
        bottle("b1", "2026-10-20T08:00:00Z", 100, "milk"),
        bottle("b2", "2026-10-20T11:00:00Z", 50),
      ],
      DAY,
    );
    expect(f.bottleMlByKind.milk).toBe(100);
    expect(f.bottleMlByKind.other).toBe(50);
    const line = formatFoodSummary(f);
    expect(line).toContain("молоко 100 мл");
    expect(line).toContain("другое 50 мл");
  });

  it("прикорм: с названием и без — считаются оба, в списке только названные", () => {
    const events = [
      solid("s1", "2026-10-20T10:00:00Z", "Каша"),
      solid("s2", "2026-10-20T16:00:00Z"),
    ];
    const f = foodSummary(events, DAY);
    expect(f.feeds).toBe(2);
    expect(f.solids).toBe(2);
    expect(f.solidFoods).toEqual(["Каша"]);
    expect(formatFoodSummary(f)).toContain("прикорм: 2 (Каша)");
  });

  it("смешанный день: удалённые и посторонние события не считаются", () => {
    const removed = solid("s0", "2026-10-20T09:00:00Z", "Пюре");
    removed.deletedAt = "2026-10-20T09:05:00Z";
    const events = [
      sleep("n1", "2026-10-20T08:00:00Z", "2026-10-20T09:30:00Z", "day"),
      bottle("b1", "2026-10-20T10:00:00Z", 180, "formula"),
      solid("s1", "2026-10-20T12:00:00Z", "Каша"),
      water("w1", "2026-10-20T13:00:00Z", 50),
      diaper("d1", "2026-10-20T13:30:00Z"),
      removed,
    ];
    const f = foodSummary(events, DAY);
    expect(f.feeds).toBe(2); // бутылочка + прикорм; вода и подгузник не входят
    expect(f.bottleMl).toBe(180);
    expect(f.solidFoods).toEqual(["Каша"]); // удалённое «Пюре» и безымянный прикорм не попадают
    const s = sleepSummary(events, DAY);
    expect(s.naps).toBe(1);
    expect(s.totalMs).toBe(90 * 60_000);
    expect(formatSleepSummary(s)).toBe(
      "дневных снов: 1, всего 1 ч 30 мин · весь сон за день 1 ч 30 мин",
    );
  });
});
