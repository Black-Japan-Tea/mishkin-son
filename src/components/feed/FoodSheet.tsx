import { useEffect, useState } from "react";
import { useAddEvent } from "../../hooks/queries";
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

/** Кнопка «Еда»: bottom sheet с выбором типа (Q54). Грудь убрана (D1), вода — через бутылочку. */
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent title={night ? "Ночное кормление" : "Кормление"}>
        {error !== null && (
          <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
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

        <div className="mt-4 flex flex-col gap-4">
          {type === "bottle" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ml">Объём, мл</Label>
              <Input
                id="ml"
                inputMode="numeric"
                value={ml}
                onChange={(e) => setMl(e.target.value)}
                placeholder="120"
              />
              <Label>Тип</Label>
              <Segmented
                value={kind}
                onChange={setKind}
                options={[
                  { value: "formula", label: "Смесь" },
                  { value: "water", label: "Вода" },
                ]}
              />
              <Button className="mt-2" onClick={() => void instant()}>
                Записать
              </Button>
            </div>
          )}

          {type === "solid" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="food">Что ел</Label>
              <Input
                id="food"
                value={food}
                onChange={(e) => setFood(e.target.value)}
                placeholder="Кабачок, каша…"
              />
              <Label htmlFor="amount">Сколько (необязательно)</Label>
              <Input
                id="amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="120"
              />
              <Segmented
                value={unit}
                onChange={setUnit}
                options={[
                  { value: "g", label: "г" },
                  { value: "ml", label: "мл" },
                ]}
              />
              <Button className="mt-2" onClick={() => void instant()}>
                Записать
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Dialog>
  );
}
