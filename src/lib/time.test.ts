import { describe, expect, it } from "vitest";
import { formatAge, formatDuration, hhmmToMinutes } from "./time";

describe("formatDuration", () => {
  it("форматирует часы и минуты", () => {
    expect(formatDuration(0)).toBe("0 мин");
    expect(formatDuration(59_000)).toBe("0 мин");
    expect(formatDuration(60_000)).toBe("1 мин");
    expect(formatDuration(3_600_000)).toBe("1 ч 0 мин");
    expect(formatDuration(3600_000 + 47 * 60_000)).toBe("1 ч 47 мин");
  });
});

describe("formatAge", () => {
  it("дни → недели → месяцы", () => {
    const birth = "2026-10-01";
    const now = new Date("2026-10-05T12:00:00");
    expect(formatAge(birth, now)).toBe("4 дн");
    const now2 = new Date("2026-10-20T12:00:00");
    expect(formatAge(birth, now2)).toBe("2 нед 5 д");
    const now3 = new Date("2026-12-15T12:00:00");
    expect(formatAge(birth, now3)).toContain("мес");
  });
});

describe("hhmmToMinutes", () => {
  it("парсит время", () => {
    expect(hhmmToMinutes("22:00")).toBe(1320);
    expect(hhmmToMinutes("07:30")).toBe(450);
  });
});
