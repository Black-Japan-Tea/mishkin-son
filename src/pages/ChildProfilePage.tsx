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

/** Стеклянная карточка Liquid Glass: радиус 24, hairline-штрих и блюр из .glass. */
const GLASS_CARD = "glass rounded-3xl";

/** Стеклянное поле Liquid Glass: полупрозрачный фон, штрих var(--stroke), синий фокус. */
const GLASS_FIELD = "border-stroke bg-glass-strong focus-visible:border-sleep/50";

/** «2026-08-21» → «21.08.2026» — без date-fns: ключ дня уже приходит в ISO-формате. */
function birthDdMmYyyy(iso: string): string {
  return iso.split("-").reverse().join(".");
}

/** Подпись в шапке: «родился 21.08.2026 · мальчик»; без пола, если он ещё не выбран. */
function birthLine(child: Child): string {
  const sexLabel = child.sex === "male" ? "мальчик" : child.sex === "female" ? "девочка" : null;
  return sexLabel === null ? `родился ${birthDdMmYyyy(child.birthDate)}` : `родился ${birthDdMmYyyy(child.birthDate)} · ${sexLabel}`;
}

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
      {/* Шапка профиля: круглая ава в тоне сна + имя + дата рождения и пол */}
      <Card className={`${GLASS_CARD} flex items-center gap-3.5 p-3.5`}>
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-tint-sleep text-xl font-extrabold text-sleep select-none">
          {child.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold leading-tight">{child.name}</p>
          <p className="text-xs text-muted-foreground">{birthLine(child)}</p>
        </div>
      </Card>

      <Card className={GLASS_CARD}>
        <CardHeader>
          <CardTitle className="font-extrabold">Данные малыша</CardTitle>
        </CardHeader>
        <CardContent>
          <ChildForm familyId={child.familyId} initial={child} onSaved={invalidate} />
        </CardContent>
      </Card>

      <MeasurementsSection childId={child.id} sex={child.sex} birthDate={child.birthDate} />

      <Card className={GLASS_CARD}>
        <CardHeader>
          <CardTitle className="font-extrabold">Кривые развития (ВОЗ)</CardTitle>
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
    <Card className={GLASS_CARD}>
      <CardHeader>
        <CardTitle className="font-extrabold">Измерения</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error !== null && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
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
        {/* Узкие экраны (<360): значение, дата и «+» стеком — иначе нативная дата
            выдавливает поле значения до ширины в несколько пикселей */}
        <div className="flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Label htmlFor="ms-value" className="text-xs">
              {TYPE_LABEL[type]}
            </Label>
            <Input
              id="ms-value"
              className={GLASS_FIELD}
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="8.5"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <Label htmlFor="ms-date" className="text-xs">
              Дата
            </Label>
            <Input id="ms-date" className={GLASS_FIELD} type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
          </div>
          <Button className="active:scale-95" onClick={add}>
            +
          </Button>
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
                  className="flex items-center justify-between gap-2 rounded-xl border border-stroke bg-glass-strong px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
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
                    className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
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
