/**
 * Тонкая типизированная обёртка над ECharts (модульная сборка без «any»).
 * Регистрируем только то, что нужно странице статистики: бары, линии, сетка,
 * тултип, легенда и зоны/линии пометок (норма ВОЗ + среднее). Полный бандл
 * echarts не тянем — график живёт в lazy-чанке (React.lazy в StatsPage).
 */
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { init, use } from "echarts/core";
import type {
  ComposeOption,
  EChartsInitOpts,
  EChartsType,
  ResizeOpts,
  SetOptionOpts,
} from "echarts/core";
import type {
  BarSeriesOption,
  LineSeriesOption,
} from "echarts/charts";
import type {
  GridComponentOption,
  LegendComponentOption,
  MarkAreaComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import { useEffect, useState } from "react";

// Одноразовая модульная регистрация компонентов (идемпотентна внутри сборки).
use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

/** Строгий тип опций: только зарегистрированные серии/компоненты. */
export type ECOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | MarkAreaComponentOption
  | MarkLineComponentOption
>;

export type { EChartsType, EChartsInitOpts, ResizeOpts, SetOptionOpts };

/** Инициализация canvas-инстанса на переданном DOM-узле. */
export function initChart(el: HTMLElement, opts?: EChartsInitOpts): EChartsType {
  return init(el, null, { renderer: "canvas", ...opts });
}

/** Перерисовка при изменении размеров контейнера (window resize). */
export function resizeChart(chart: EChartsType, opts?: ResizeOpts): void {
  chart.resize(opts);
}

/** Освобождение инстанса (unmount компонента). */
export function disposeChart(chart: EChartsType): void {
  chart.dispose();
}

/**
 * Тема интерфейса = класс .dark на <html> (волна 0). Слежка через
 * MutationObserver на атрибуте class: ThemeProvider просто переключает класс,
 * поэтому этого достаточно — matchMedia не нужен.
 */
export function useChartTheme(): boolean {
  const [dark, setDark] = useState(() =>
    typeof document === "undefined" ? false : document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}
