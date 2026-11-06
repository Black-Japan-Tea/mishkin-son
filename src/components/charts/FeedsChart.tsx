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
import { dayAxisLabel, type DailyFeedsSplit } from "../../lib/stats";

interface FeedsChartProps {
  days: DailyFeedsSplit[];
}

function buildOption(days: DailyFeedsSplit[], dark: boolean): ECOption {
  const p = palette(dark);
  const dates = days.length > 7; // 7 дней — пн–вс, 14 — числа через один
  const labels = days.map((d) => dayAxisLabel(d.dayKey, dates));
  const mix = days.map((d) => d.mixMl);
  const water = days.map((d) => d.waterMl);
  const counts = days.map((d) => d.count);
  const maxMl = days.reduce((m, d) => Math.max(m, d.mixMl + d.waterMl), 0);
  const maxCount = days.reduce((m, d) => Math.max(m, d.count), 0);
  const axis = { axisLine: { lineStyle: { color: p.split } }, axisTick: { show: false } };

  return {
    animationDuration: 500,
    grid: { left: 34, right: 30, top: 30, bottom: 20 },
    tooltip: {
      trigger: "axis",
      backgroundColor: p.tip,
      borderColor: p.split,
      textStyle: { color: p.text, fontSize: 11 },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const head = list[0];
        const lines = list.map((s) => {
          const isCount = s.seriesName === "Кормлений";
          const marker = typeof s.marker === "string" ? s.marker : "";
          return `${marker} ${s.seriesName ?? ""}: ${String(s.value)}${isCount ? "" : " мл"}`;
        });
        return `<b>${head?.name ?? ""}</b><br>${lines.join("<br>")}`;
      },
    },
    legend: {
      data: ["Смесь", "Вода", "Кормлений"],
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
    yAxis: [
      {
        type: "value",
        // ~400 мл по превью; выше — ось дотягивается до данных с шагом 100.
        max: Math.max(400, Math.ceil(maxMl / 100) * 100),
        axisLabel: { color: p.t3, fontSize: 10 },
        splitLine: { lineStyle: { color: p.split } },
      },
      {
        type: "value",
        max: Math.max(9, maxCount),
        splitLine: { show: false },
        axisLabel: { color: p.t3, fontSize: 10 },
      },
    ],
    series: [
      {
        name: "Смесь",
        type: "bar",
        stack: "f",
        barWidth: "58%",
        data: mix,
        itemStyle: { color: SERIES.mix },
      },
      {
        name: "Вода",
        type: "bar",
        stack: "f",
        data: water,
        itemStyle: { color: SERIES.water, borderRadius: [7, 7, 0, 0] },
      },
      {
        name: "Кормлений",
        type: "line",
        yAxisIndex: 1,
        data: counts,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 1.5, color: p.text },
        itemStyle: { color: p.text },
        // Цифры над точками — только на 7 днях, на 14 не мешают.
        label: { show: !dates, position: "top", color: p.t3, fontSize: 9 },
      },
    ],
  };
}

/** Кормления: стек «смесь + вода» (мл, левая ось) и линия числа кормлений (правая ось). */
export default function FeedsChart({ days }: FeedsChartProps): React.JSX.Element {
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
    chart.setOption(buildOption(days, dark), true);
  }, [days, dark]);

  return <div ref={containerRef} className="h-[180px] w-full" />;
}
