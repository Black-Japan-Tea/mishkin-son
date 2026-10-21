import { describe, expect, it } from "vitest";
import { percentileLabel, zToPercentile } from "./percentiles";
import { seriesAt, weightForAge } from "./growth-data";

describe("percentiles", () => {
  it("медианное значение даёт ~50%", () => {
    const { median, sd } = seriesAt(weightForAge.male, 6);
    const p = zToPercentile(0);
    expect(p).toBe(50);
    expect(median).toBeGreaterThan(5);
    expect(sd).toBeGreaterThan(0);
  });

  it("+2SD уходит за 95%", () => {
    expect(zToPercentile(2)).toBeGreaterThanOrEqual(95);
    expect(zToPercentile(-2)).toBeLessThanOrEqual(5);
  });

  it("метки формулируются мягко", () => {
    expect(percentileLabel(50)).toBe("в обычном диапазоне");
    expect(percentileLabel(1)).toBe("ниже обычного диапазона");
    expect(percentileLabel(99)).toBe("выше обычного диапазона");
  });
});
