import { lazy, Suspense, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input, Label } from "../components/ui/field";
import { Segmented } from "../components/ui/segmented";
import { ChildForm } from "../components/child/ChildForm";
import { useMeasurements, useInvalidateMeasurements } from "../hooks/queries";
import { addMeasurement, removeMeasurement } from "../sync/writes";
import { useChildren } from "../stores/children";
import { dayKeyOf, formatDate } from "../lib/time";
import { measurementPercentile, percentileLabel } from "../lib/who/percentiles";
import type { Child, MeasurementType } from "../lib/types";

// recharts тяжёлый — график роста в отдельный lazy-чанк
const GrowthChart = lazy(() => import("../components/charts/GrowthChart"));

const TYPE_LABEL: Record<MeasurementType, string> = {
  weight: "Вес, кг",
  height: "Рост, см",
  head: "Голова, см",
};

/** Профиль ребёнка: данные, антропометрия (журнал + графики ВОЗ) — план §7.4. */
export function ChildProfilePage(): React.JSX.Element {
  const { children, activeId } = useChildren();
  const child = children.find((c) => c.id === activeId);
  const [chartType, setChartType] = useState<MeasurementType>("weight");
  const { data: measurements } = useMeasurements(child?.id ?? null);
  const invalidate = useInvalidateMeasurements();

  if (child === undefined) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="ambient">
        <CardHeader>
          <CardTitle>Данные малыша</CardTitle>
        </CardHeader>
        <CardContent>
          <ChildForm familyId={child.familyId} initial={child} onSaved={invalidate} />
        </CardContent>
      </Card>

      <MeasurementsSection childId={child.id} sex={child.sex} birthDate={child.birthDate} />

      <Card className="ambient">
        <CardHeader>
          <CardTitle>Кривые развития (ВОЗ)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Segmented
            accent="sleep"
            value={chartType}
            onChange={setChartType}
            options={[
              { value: "weight", label: "Вес" },
              { value: "height", label: "Рост" },
              { value: "head", label: "Голова" },
            ]}
          />
          <Suspense
            fallback={
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                Строю график…
              </div>
            }
          >
            <GrowthChart
              type={chartType}
              sex={child.sex}
              birthDate={child.birthDate}
              measurements={measurements ?? []}
            />
          </Suspense>
          <p className="text-xs text-muted-foreground">
            Справочные кривые ВОЗ (медиана и ±2SD). Не медицинская оценка развития.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MeasurementsSection({
  childId,
  sex,
  birthDate,
}: {
  childId: string;
  sex: Child["sex"];
  birthDate: string;
}): React.JSX.Element {
  const { data: measurements } = useMeasurements(childId);
  const invalidate = useInvalidateMeasurements();
  const [type, setType] = useState<MeasurementType>("weight");
  const [value, setValue] = useState("");
  const [dateKey, setDateKey] = useState(dayKeyOf(new Date().toISOString()));
  const [error, setError] = useState<string | null>(null);

  const add = (): void => {
    setError(null);
    const parsed = Number.parseFloat(value.replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Введи число");
      return;
    }
    void addMeasurement({
      childId,
      type,
      value: parsed,
      measuredAt: new Date(`${dateKey}T12:00`).toISOString(),
    }).then(invalidate);
    setValue("");
  };

  return (
    <Card className="ambient">
      <CardHeader>
        <CardTitle>Измерения</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error !== null && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
        )}
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "weight", label: "Вес" },
            { value: "height", label: "Рост" },
            { value: "head", label: "Голова" },
          ]}
        />
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="ms-value">{TYPE_LABEL[type]}</Label>
            <Input
              id="ms-value"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="8.5"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ms-date">Дата</Label>
            <Input id="ms-date" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
          </div>
          <Button onClick={add}>+</Button>
        </div>

        <div className="flex flex-col gap-1.5">
          {(measurements ?? [])
            .slice()
            .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
            .map((m) => {
              const p = measurementPercentile(m.type, sex, birthDate, m.value, m.measuredAt);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-bold">
                      {TYPE_LABEL[m.type]}: {m.value}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDate(m.measuredAt)} · {percentileLabel(p)} ({p}%)
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label="Удалить измерение"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void removeMeasurement(m.id).then(invalidate)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
