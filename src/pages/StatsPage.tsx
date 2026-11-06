import { useMemo, useState, lazy, Suspense } from "react";
import { Segmented } from "../components/ui/segmented";
import { useChildEvents } from "../hooks/queries";
import { useChildren } from "../stores/children";
import { feedsByDaySplit, lastNDayKeys, sleepByDaySplit } from "../lib/stats";
import { sleepNormForAge, normHoursLabel } from "../lib/advisor/norms";
import { averageSleepMs } from "../lib/advisor/patterns";
import { formatDuration } from "../lib/time";

// recharts/echarts тяжёлые — графики в отдельные lazy-чанки (echarts не попадает в главный бандл)
const SleepBars = lazy(() => import("../components/charts/SleepBars"));
const FeedsChart = lazy(() => import("../components/charts/FeedsChart"));

function ChartFallback(): React.JSX.Element {
  return <div className="flex h-48 items-center justify-center text-sm text-faint">Строю график…</div>;
}

type Range = "7" | "14";

/** Подпись секции карточки — как .lbl в превью. */
function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{children}</p>
  );
}

/** Подсказка под графиком — как .subline в превью. */
function Subline({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="mt-2 text-[11px] text-faint">{children}</p>;
}

/** Статистика v1 «Liquid Glass»: стек ночной+дневной сон с нормой ВОЗ, стек смесь+вода и линия кормлений. */
export function StatsPage(): React.JSX.Element {
  const { activeId } = useChildren();
  const childId = activeId ?? "";
  const { data: events } = useChildEvents(childId !== "" ? childId : null);
  const child = useChildren((s) => s.children.find((c) => c.id === activeId));
  const [range, setRange] = useState<Range>("7");

  // Переключатель 7/14 реально пересобирает данные по dayKeys периода.
  const view = useMemo(() => {
    const n = Number.parseInt(range, 10);
    const keys = lastNDayKeys(n);
    return {
      days: keys,
      sleep: sleepByDaySplit(events ?? [], keys),
      feeds: feedsByDaySplit(events ?? [], keys),
      avgMs: averageSleepMs(events ?? [], keys),
    };
  }, [events, range]);

  if (child === undefined) {
    return <p className="py-10 text-center text-sm text-faint">Загрузка…</p>;
  }

  const norm = sleepNormForAge(child.birthDate);
  const normHours: [number, number] = [norm.totalMin[0] / 60, norm.totalMin[1] / 60];

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: "7", label: "7 дней" },
          { value: "14", label: "14 дней" },
        ]}
      />

      <section className="glass rounded-3xl p-4">
        <SectionLabel>Сон по дням · стек: ночной + дневной</SectionLabel>
        <Suspense fallback={<ChartFallback />}>
          <SleepBars days={view.sleep} normHours={normHours} />
        </Suspense>
        <Subline>
          Заштрихованная зона — норма ВОЗ {normHoursLabel(norm.totalMin)} · пунктир — среднее за
          период
        </Subline>
        <p className="mt-2 text-[11px] text-faint">
          Средний сон за период: {formatDuration(view.avgMs)}
        </p>
      </section>

      <section className="glass rounded-3xl p-4">
        <SectionLabel>Кормления · мл по типам и количество</SectionLabel>
        <Suspense fallback={<ChartFallback />}>
          <FeedsChart days={view.feeds} />
        </Suspense>
        <Subline>Стек: смесь + вода (мл, левая ось) · линия — число кормлений (правая ось)</Subline>
      </section>

      <p className="text-center text-[11px] leading-snug text-faint">
        Ночной сон учитывается в день засыпания.
        <br />
        Норма для возраста согласно ВОЗ, не медицинская оценка.
      </p>
    </div>
  );
}
