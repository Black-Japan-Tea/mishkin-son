import { useState } from "react";
import { useAddEvent, useEditEvent, useInvalidateEvents } from "../../hooks/queries";
import { Button } from "../ui/button";
import { Input, Label } from "../ui/field";
import { Segmented } from "../ui/segmented";
import { SheetContent, Dialog } from "../ui/dialog";
import { BreastControls } from "./BreastControls";
import type { BottleKind, BreastSide } from "../../lib/types";

type FoodType = "breast" | "bottle" | "solid" | "water";

interface FoodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  familyId: string;
  userId: string;
  /** Ночной режим: минимум полей, всё мгновенно (Q21–Q22). */
  night?: boolean;
  parentEventId?: string | null;
}

/** Кнопка «Еда»: bottom sheet с выбором типа (Q54). Таймер — только у дневной груди (Q26/Q28). */
export function FoodSheet({
  open,
  onOpenChange,
  childId,
  familyId,
  userId,
  night = false,
  parentEventId = null,
}: FoodSheetProps): React.JSX.Element {
  const [type, setType] = useState<FoodType>("breast");
  const [side, setSide] = useState<BreastSide>("left");
  const [ml, setMl] = useState("");
  const [kind, setKind] = useState<BottleKind>("formula");
  const [food, setFood] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addEvent = useAddEvent();
  const editEvent = useEditEvent();
  const invalidate = useInvalidateEvents();

  const close = (): void => onOpenChange(false);

  const instant = async (): Promise<void> => {
    setError(null);
    const endedAt = new Date().toISOString();
    if (type === "bottle") {
      const volume = Number.parseInt(ml, 10);
      if (Number.isNaN(volume) || volume <= 0) {
        setError("Укажи объём в мл");
        return;
      }
      await addEvent({
        childId, familyId, createdBy: userId, type: "feed_bottle",
        startedAt: endedAt, endedAt, parentEventId, details: { volumeMl: volume, kind },
      });
    } else if (type === "breast") {
      await addEvent({
        childId, familyId, createdBy: userId, type: "feed_breast",
        startedAt: endedAt, endedAt, parentEventId, details: { side },
      });
    } else if (type === "solid") {
      await addEvent({
        childId, familyId, createdBy: userId, type: "feed_solid",
        startedAt: endedAt, endedAt, parentEventId, details: { food: food || undefined },
      });
    } else {
      const volume = Number.parseInt(ml, 10);
      await addEvent({
        childId, familyId, createdBy: userId, type: "feed_water",
        startedAt: endedAt, endedAt, parentEventId,
        details: Number.isNaN(volume) ? {} : { volumeMl: volume },
      });
    }
    invalidate();
    close();
  };

  const startBreastTimer = async (breastSide: BreastSide): Promise<void> => {
    await addEvent({
      childId, familyId, createdBy: userId, type: "feed_breast",
      startedAt: new Date().toISOString(), endedAt: null, details: { side: breastSide },
    });
    invalidate();
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
        <Segmented
          accent="food"
          value={type}
          onChange={setType}
          options={[
            { value: "breast", label: "Грудь" },
            { value: "bottle", label: "Бутылочка" },
            { value: "solid", label: "Прикорм" },
            { value: "water", label: "Вода" },
          ]}
        />

        <div className="mt-4 flex flex-col gap-4">
          {type === "breast" && (
            <BreastControls
              childId={childId}
              night={night}
              side={side}
              onSide={setSide}
              onInstant={async (breastSide) => {
                await addEvent({
                  childId, familyId, createdBy: userId, type: "feed_breast",
                  startedAt: new Date().toISOString(), endedAt: new Date().toISOString(),
                  parentEventId, details: { side: breastSide },
                });
                invalidate();
                close();
              }}
              onStartTimer={startBreastTimer}
              onEdited={() => {
                invalidate();
                close();
              }}
              editEvent={editEvent}
            />
          )}

          {type === "bottle" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ml">Объём, мл (обязательно)</Label>
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
                  { value: "milk", label: "Сцеженное" },
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
              <Button className="mt-2" onClick={() => void instant()}>
                Записать
              </Button>
            </div>
          )}

          {type === "water" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="water-ml">Объём, мл (необязательно)</Label>
              <Input
                id="water-ml"
                inputMode="numeric"
                value={ml}
                onChange={(e) => setMl(e.target.value)}
                placeholder="50"
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
