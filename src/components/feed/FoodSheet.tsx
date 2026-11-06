import { useEffect, useState } from "react";
import { useAddEvent } from "../../hooks/queries";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input, Label } from "../ui/field";
import { Segmented } from "../ui/segmented";
import { SheetContent, Dialog } from "../ui/dialog";
import type { BottleKind, SolidUnit } from "../../lib/types";

type FoodType = "bottle" | "solid";

interface FoodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  familyId: string;
  userId: string;
  /** Ночной режим: минимум полей, всё мгновенно, только бутылочка (Q21–Q22). */
  night?: boolean;
  parentEventId?: string | null;
}

/** Шаг степпера объёма, мл — как «+10» на детских трекерах. */
const ML_STEP = 10;

const KIND_TILES: ReadonlyArray<{ value: BottleKind; label: string }> = [
  { value: "formula", label: "Смесь" },
  { value: "water", label: "Вода" },
];

const UNIT_TILES: ReadonlyArray<{ value: SolidUnit; label: string }> = [
  { value: "g", label: "г" },
  { value: "ml", label: "мл" },
];

/* Плитка выбора (как .types в превью): активная — тинт еды + изумрудный бордер. */
function tileClass(active: boolean): string {
  return cn(
    "flex-1 whitespace-nowrap rounded-[14px] border px-3 py-2.5 text-[13px] font-bold transition-colors duration-200",
    active
      ? "border-food/40 bg-tint-food text-food"
      : "border-stroke bg-transparent text-muted-foreground hover:text-foreground",
  );
}

/** Кнопка «Еда»: bottom sheet с выбором типа (Q54). Грудь убрана (D1), вода — через бутылочку.
    Liquid Glass: сегмент-переключатель, степпер объёма с −/+ и плитки типа — как в превью. */
export function FoodSheet({
  open,
  onOpenChange,
  childId,
  familyId,
  userId,
  night = false,
  parentEventId = null,
}: FoodSheetProps): React.JSX.Element {
  const [type, setType] = useState<FoodType>("bottle");
  const [ml, setMl] = useState("");
  const [kind, setKind] = useState<BottleKind>("formula");
  const [food, setFood] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<SolidUnit>("g");
  const [error, setError] = useState<string | null>(null);
  const addEvent = useAddEvent();

  // Ночное кормление — только бутылочка; сбрасываем тип, чтобы ночью не показать прикорм из прошлого выбора.
  useEffect(() => {
    if (open && night) setType("bottle");
  }, [open, night]);

  const close = (): void => onOpenChange(false);

  const instant = async (): Promise<void> => {
    setError(null);
    const at = new Date().toISOString();
    if (type === "bottle") {
      const volume = Number.parseInt(ml, 10);
      if (Number.isNaN(volume) || volume <= 0) {
        setError("Укажи объём в мл");
        return;
      }
      await addEvent({
        childId, familyId, createdBy: userId, type: "feed_bottle",
        startedAt: at, endedAt: at, parentEventId, details: { volumeMl: volume, kind },
      });
    } else {
      const parsed = Number.parseInt(amount, 10);
      const hasAmount = !Number.isNaN(parsed) && parsed > 0;
      await addEvent({
        childId, familyId, createdBy: userId, type: "feed_solid",
        startedAt: at, endedAt: at, parentEventId,
        details: {
          ...(food !== "" ? { food } : {}),
          ...(hasAmount ? { amount: parsed, unit } : {}),
        },
      });
    }
    close();
  };

  // Степпер: от пустого инпута считаем от нуля, в минус не уходим
  const bumpMl = (delta: number): void => {
    const parsed = Number.parseInt(ml, 10);
    const base = Number.isNaN(parsed) ? 0 : parsed;
    setMl(String(Math.max(0, base + delta)));
  };

  const stbtnClass =
    "grid h-11 w-11 shrink-0 place-items-center rounded-[14px] glass-strong border border-stroke text-xl font-bold text-foreground transition-transform duration-150 active:scale-90";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent title={night ? "Ночное кормление" : "Кормление"}>
        {error !== null && (
          <p className="mb-3 rounded-[14px] bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
        {!night && (
          <Segmented
            accent="food"
            value={type}
            onChange={setType}
            options={[
              { value: "bottle", label: "Бутылочка" },
              { value: "solid", label: "Прикорм" },
            ]}
          />
        )}

        <div className="mt-4 flex flex-col gap-3">
          {type === "bottle" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ml">Объём, мл</Label>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label="Меньше"
                    onClick={() => bumpMl(-ML_STEP)}
                    className={stbtnClass}
                  >
                    −
                  </button>
                  <Input
                    id="ml"
                    inputMode="numeric"
                    value={ml}
                    onChange={(e) => setMl(e.target.value)}
                    placeholder="120"
                    className="text-center tabular-nums"
                  />
                  <button
                    type="button"
                    aria-label="Больше"
                    onClick={() => bumpMl(ML_STEP)}
                    className={stbtnClass}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Тип</Label>
                <div className="flex gap-2">
                  {KIND_TILES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={kind === t.value}
                      onClick={() => setKind(t.value)}
                      className={tileClass(kind === t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === "solid" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="food">Что ел</Label>
                <Input
                  id="food"
                  value={food}
                  onChange={(e) => setFood(e.target.value)}
                  placeholder="Кабачок, каша…"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount">Сколько (необязательно)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="amount"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="120"
                    className="min-w-0 flex-1 tabular-nums"
                  />
                  <div className="flex min-w-0 flex-1 gap-2">
                    {UNIT_TILES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        aria-pressed={unit === t.value}
                        onClick={() => setUnit(t.value)}
                        className={tileClass(unit === t.value)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <Button size="lg" className="mt-4 w-full" onClick={() => void instant()}>
          Записать
        </Button>
      </SheetContent>
    </Dialog>
  );
}
