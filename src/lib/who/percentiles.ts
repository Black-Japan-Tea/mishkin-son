import { ageInMonths } from "../time";
import { headForAge, lengthForAge, seriesAt, weightForAge, type GrowthSeries } from "./growth-data";
import type { ChildSex, MeasurementType } from "../types";

/** Приближение центиля через нормальное распределение — задокументированное упрощение LMS ВОЗ. */

function erf(x: number): number {
  // Абрамовиц–Стиган 7.1.26, |err| < 1.5e-7
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function zToPercentile(z: number): number {
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  return Math.round(cdf * 100);
}

export function percentileLabel(percentile: number): string {
  if (percentile < 3) return "ниже обычного диапазона";
  if (percentile > 97) return "выше обычного диапазона";
  return "в обычном диапазоне";
}

export function seriesFor(type: MeasurementType, sex: ChildSex | null): GrowthSeries {
  const key: "male" | "female" = sex === "female" ? "female" : "male";
  switch (type) {
    case "weight":
      return weightForAge[key];
    case "height":
      return lengthForAge[key];
    case "head":
      return headForAge[key];
  }
}

export function measurementPercentile(
  type: MeasurementType,
  sex: ChildSex | null,
  birthDate: string,
  value: number,
  measuredAt: string,
): number {
  const months = ageInMonths(birthDate, new Date(measuredAt));
  const { median, sd } = seriesAt(seriesFor(type, sex), months);
  if (sd === 0) return 50;
  return zToPercentile((value - median) / sd);
}
