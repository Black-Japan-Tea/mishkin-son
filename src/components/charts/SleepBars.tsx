import { useEffect, useRef } from "react";
import {
  disposeChart,
  initChart,
  resizeChart,
  useChartTheme,
  type ECOption,
  type EChartsType,
} from "../../lib/charts/echarts";
import { palette, SERIES } from "../../lib/charts/palette";
import { dayAxisLabel, type DailySleepSplit } from "../../lib/stats";

interface SleepBarsProps {
  days: DailySleepSplit[];
  /** Норма возраста, часы [от, до] — границы зоны нормы ВОЗ (из sleepNormForAge). */
  normHours: [number, number];
}

/** «14,5» — запятая как разделитель, как в превью. */
function fmtHours(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

/** Целые часы без «,0» — для подписи зоны нормы. */
function fmtHourWhole(v: number): string {
  return Number.isInteger(v) ? String(v) : fmtHours(v);
}

function buildOption(days: DailySleepSplit[], normHours: [number, number], dark: boolean): ECOption {
  const p = palette(dark);
  const dates = days.length > 7; // 7 дней — пн–вс, 14 — числа через один
  const labels = days.map((d) => dayAxisLabel(d.dayKey, dates));
  const totals = days.map((d) => Math.round((d.nightHours + d.dayHours) * 10) / 10);
  const avg = totals.length === 0 ? 0 : totals.reduce((a, b) => a + b, 0) / totals.length;
  const axis = { axisLine: { lineStyle: { color: p.split } }, axisTick: { show: false } };

  return {
    animationDuration: 500,
    grid: { left: 30, right: 6, top: 30, bottom: 20 },
    tooltip: {
      trigger: "axis",
      backgroundColor: p.tip,
      borderColor: p.split,
      textStyle: { color: p.text, fontSize: 11 },
      valueFormatter: (v) => `${fmtHours(Number(v))} ч`,
    },
    legend: {
      data: ["Ночной", "Дневной"],
      top: 0,
      left: 0,
      icon: "roundRect",
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 10,
      textStyle: { color: p.t2, fontSize: 10 },
    },
    xAxis: {
      type: "category",
      data: labels,
      ...axis,
      axisLabel: { color: p.t3, fontSize: 10, interval: dates ? 1 : 0 },
    },
    yAxis: {
      type: "value",
      max: Math.max(17, Math.ceil(normHours[1]) + 1),
      interval: 4,
      axisLabel: { color: p.t3, fontSize: 10, formatter: "{value} ч" },
      splitLine: { lineStyle: { color: p.split } },
    },
    series: [
      {
        name: "Ночной",
        type: "bar",
        stack: "s",
        barWidth: "58%",
        data: days.map((d) => d.nightHours),
        itemStyle: { color: SERIES.night },
      },
      {
        name: "Дневной",
        type: "bar",
        stack: "s",
        data: days.map((d) => d.dayHours),
        itemStyle: { color: SERIES.daySleep, borderRadius: [7, 7, 0, 0] },
        label: {
          show: true,
          position: "top",
          color: p.text,
          fontSize: 10,
          fontWeight: 700,
          // ИТОГО дня: ночной + дневной, формат «14,5».
          formatter: (pr) => fmtHours(totals[pr.dataIndex] ?? 0),
        },
        markArea: {
          silent: true,
          itemStyle: { color: SERIES.normArea },
          label: { show: true, position: "insideTopRight", color: p.t3, fontSize: 9 },
          data: [
            [
              {
                yAxis: normHours[0],
                name: `норма ВОЗ ${fmtHourWhole(normHours[0])}–${fmtHourWhole(normHours[1])} ч`,
              },
              { yAxis: normHours[1] },
            ],
          ],
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dashed", color: SERIES.avgLine, width: 1 },
          label: {
            show: true,
            position: "insideEndTop",
            color: p.t3,
            fontSize: 9,
            formatter: `среднее ${fmtHours(avg)} ч`,
          },
          data: [{ yAxis: avg }],
        },
      },
    ],
  };
}

/** Сон по дням: стек «ночной + дневной», зона нормы ВОЗ и пунктир среднего. */
export default function SleepBars({ days, normHours }: SleepBarsProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const dark = useChartTheme();

  useEffect(() => {
    const el = containerRef.current;
    if (el === null) return;
    const chart = initChart(el);
    chartRef.current = chart;
    const onResize = (): void => resizeChart(chart);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      disposeChart(chart);
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (chart === null) return;
    // notMerge: полная пересборка — меняются и данные, и палитра темы.
    chart.setOption(buildOption(days, normHours, dark), true);
  }, [days, normHours, dark]);

  return <div ref={containerRef} className="h-[220px] w-full" />;
}
