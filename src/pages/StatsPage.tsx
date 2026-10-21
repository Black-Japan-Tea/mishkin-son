import { useMemo, useState, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Segmented } from "../components/ui/segmented";
import { useChildEvents } from "../hooks/queries";
import { useChildren } from "../stores/children";
import { sleepByDay, feedsByDay, lastNDayKeys } from "../lib/stats";
import { normHoursLabel, sleepNormForAge } from "../lib/advisor/norms";
import { averageSleepMs } from "../lib/advisor/patterns";
import { formatDuration } from "../lib/time";

// recharts тяжёлый — графики в отдельный lazy-чанк
const SleepBars = lazy(() => import("../components/charts/SleepBars"));
const FeedsChart = lazy(() => import("../components/charts/FeedsChart"));

function ChartFallback(): React.JSX.Element {
  return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Строю график…</div>;
}

type Range = "7" | "14";

/** Статистика v1: сон vs норма возраста + кормления (решение Q59). */
export function StatsPage(): React.JSX.Element {
  const { activeId } = useChildren();
  const childId = activeId ?? "";
  const { data: events } = useChildEvents(childId !== "" ? childId : null);
  const child = useChildren((s) => s.children.find((c) => c.id === activeId));
  const [range, setRange] = useState<Range>("7");

  const view = useMemo(() => {
    const n = Number.parseInt(range, 10);
    const keys = lastNDayKeys(n);
    return {
      days: keys,
      sleep: sleepByDay(events ?? [], keys),
      feeds: feedsByDay(events ?? [], keys),
      avgMs: averageSleepMs(events ?? [], keys),
    };
  }, [events, range]);

  if (child === undefined) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>;
  }

  const norm = sleepNormForAge(child.birthDate);
  const normHours: [number, number] = [norm.totalMin[0] / 60, norm.totalMin[1] / 60];
  const totalFeeds = view.feeds.reduce((s, d) => s + d.count, 0);
  const totalMl = view.feeds.reduce((s, d) => s + d.ml, 0);

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

      <Card className="ambient">
        <CardHeader>
          <CardTitle>Сон по дням · норма {normHoursLabel(norm.totalMin)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ChartFallback />}>
            <SleepBars days={view.sleep} normHours={normHours} />
          </Suspense>
          <p className="mt-2 text-xs text-muted-foreground">
            Средний сон за период: {formatDuration(view.avgMs)}
          </p>
        </CardContent>
      </Card>

      <Card className="ambient">
        <CardHeader>
          <CardTitle>Кормления · всего {totalFeeds}, {totalMl} мл</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ChartFallback />}>
            <FeedsChart days={view.feeds} />
          </Suspense>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Ночной сон учитывается в день засыпания. Полосы — норма для возраста, не медицинская оценка.
      </p>
    </div>
  );
}
