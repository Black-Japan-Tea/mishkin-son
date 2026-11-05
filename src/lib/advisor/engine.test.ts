import { describe, expect, it } from "vitest";
import { generateTips } from "./engine";
import { feedStatsOnDay, medianWakeWindowMin, sleepMsOnDay } from "./patterns";
import { formatClock } from "../time";
import type { AppEvent, BottleDetails, Child, SolidDetails, WaterDetails } from "../types";

const CHILD: Child = {
  id: "c1",
  familyId: "f1",
  name: "Мишка",
  birthDate: "2026-08-21",
  sex: "male",
  birthWeightG: 3400,
  birthHeightCm: 52,
  avatarUrl: null,
  createdAt: "2026-08-21T00:00:00Z",
  updatedAt: "2026-08-21T00:00:00Z",
  deletedAt: null,
};

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

/** Мгновенное событие кормления: startedAt === endedAt (время одним значением). */
function bottleFeed(id: string, startIso: string, details: BottleDetails): AppEvent {
  return { id, childId: "c1", familyId: "f1", createdBy: "u1", type: "feed_bottle", startedAt: startIso, endedAt: startIso, parentEventId: null, createdAt: startIso, updatedAt: startIso, deletedAt: null, details };
}

function solidFeed(id: string, startIso: string, details: SolidDetails): AppEvent {
  return { id, childId: "c1", familyId: "f1", createdBy: "u1", type: "feed_solid", startedAt: startIso, endedAt: startIso, parentEventId: null, createdAt: startIso, updatedAt: startIso, deletedAt: null, details };
}

function waterFeed(id: string, startIso: string, details: WaterDetails): AppEvent {
  return { id, childId: "c1", familyId: "f1", createdBy: "u1", type: "feed_water", startedAt: startIso, endedAt: startIso, parentEventId: null, createdAt: startIso, updatedAt: startIso, deletedAt: null, details };
}

describe("patterns", () => {
  it("считает сон за день по дню засыпания", () => {
    const events = [
      sleep("s1", "2026-10-20T08:00:00Z", "2026-10-20T09:30:00Z", "day"),
      sleep("s2", "2026-10-20T20:00:00Z", "2026-10-21T05:00:00Z", "night"),
    ];
    expect(sleepMsOnDay(events, "2026-10-20")).toBe((90 + 540) * 60_000);
    expect(sleepMsOnDay(events, "2026-10-21")).toBe(0);
  });

  it("медианное окно бодрствования", () => {
    const events = [
      sleep("a", "2026-10-19T08:00:00Z", "2026-10-19T10:00:00Z", "day"),
      sleep("b", "2026-10-19T13:00:00Z", "2026-10-19T14:00:00Z", "day"), // окно 180 мин
      sleep("c", "2026-10-19T17:00:00Z", "2026-10-19T18:00:00Z", "day"), // окно 180 мин
    ];
    expect(medianWakeWindowMin(events)).toBe(180);
  });

  it("считает кормления по бутылочке и прикорму, вода — только в мл", () => {
    const events = [
      bottleFeed("f1", "2026-10-20T08:00:00Z", { volumeMl: 120, kind: "formula" }),
      solidFeed("f2", "2026-10-20T11:00:00Z", { food: "Кабачок", amount: 80, unit: "g" }),
      waterFeed("f3", "2026-10-20T12:00:00Z", { volumeMl: 30 }),
      // Вчерашняя бутылочка не попадает в счёт сегодняшнего дня.
      bottleFeed("f4", "2026-10-19T18:00:00Z", { volumeMl: 999, kind: "water" }),
    ];
    expect(feedStatsOnDay(events, "2026-10-20")).toEqual({ count: 2, ml: 150 });
  });
});

describe("generateTips", () => {
  const now = new Date("2026-10-21T12:00:00Z");

  it("даёт сводку и дисклеймер даже без событий", () => {
    const tips = generateTips(CHILD, [], now);
    expect(tips.some((t) => t.id === "today-summary")).toBe(true);
    expect(tips.some((t) => t.id === "disclaimer")).toBe(true);
    expect(tips.some((t) => t.id === "window-unknown")).toBe(true);
  });

  it("прогнозирует окно сна по медианному окну бодрствования", () => {
    const events = [
      sleep("a", "2026-10-20T08:00:00Z", "2026-10-20T10:00:00Z", "day"),
      sleep("b", "2026-10-20T13:00:00Z", "2026-10-20T14:00:00Z", "day"),
      sleep("c", "2026-10-20T17:00:00Z", "2026-10-20T18:00:00Z", "day"),
      sleep("d", "2026-10-20T20:00:00Z", "2026-10-21T05:00:00Z", "night"),
    ];
    const tips = generateTips(CHILD, events, now);
    const window = tips.find((t) => t.id === "window");
    expect(window).toBeDefined();
    // 05:00 UTC + медианное окно 180 мин; сравниваем через тот же formatClock (локальная зона)
    const predictedIso = new Date(new Date("2026-10-21T05:00:00Z").getTime() + 180 * 60_000).toISOString();
    expect(window?.text).toContain(formatClock(predictedIso));
  });

  it("не предсказывает окно при активном сне", () => {
    const active: AppEvent = {
      ...sleep("x", "2026-10-21T10:00:00Z", "2026-10-21T10:00:00Z", "day"),
      endedAt: null,
    };
    const tips = generateTips(CHILD, [active], now);
    expect(tips.some((t) => t.id === "window")).toBe(false);
  });
});
