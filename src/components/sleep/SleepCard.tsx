import { useState } from "react";
import { Moon, Sun, Timer } from "lucide-react";
import { useNow } from "../../hooks/useNow";
import { useActiveSleep, useEditEvent, useRemoveEvent } from "../../hooks/queries";
import { formatClock, formatDuration } from "../../lib/time";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FoodSheet } from "../feed/FoodSheet";

interface SleepCardProps {
  childId: string;
  familyId: string;
  userId: string;
}

/** Активный сон: таймер с нуля, тап → «Проснулся / Поел» (план §5.1, Q17–Q20). */
export function SleepCard({ childId, familyId, userId }: SleepCardProps): React.JSX.Element | null {
  const { data: sleep } = useActiveSleep(childId);
  const now = useNow(1000);
  const editEvent = useEditEvent();
  const removeEvent = useRemoveEvent();
  const [panelOpen, setPanelOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);

  if (sleep === undefined || sleep === null) return null;
  const elapsedMs = now.getTime() - new Date(sleep.startedAt).getTime();
  const cancellable = elapsedMs < 60_000;

  const wake = (): void => {
    void editEvent(sleep.id, { endedAt: new Date().toISOString() }).then(() => setPanelOpen(false));
  };

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setPanelOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setPanelOpen((v) => !v)}
        className={cn("ambient ambient-sleep breathing cursor-pointer border-border bg-card/90 p-5")}
      >
        <div className="flex items-center justify-between text-sleep">
          <span className="flex items-center gap-2 text-sm font-bold">
            {sleep.details.dayTag === "night" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {sleep.details.dayTag === "night" ? "Ночной сон" : "Дневной сон"}
          </span>
          <span className="text-xs text-muted-foreground">уснул в {formatClock(sleep.startedAt)}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <Timer className="h-6 w-6 text-sleep" />
          <span className="text-4xl font-extrabold tabular-nums">{formatDuration(elapsedMs)}</span>
        </div>

        {panelOpen && (
          <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="secondary" className="flex-1" onClick={wake}>
              Проснулся
            </Button>
            <Button
              className="ambient-food flex-1 bg-food text-white hover:opacity-90"
              onClick={() => setFoodOpen(true)}
            >
              Поел
            </Button>
          </div>
        )}

        {cancellable && panelOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-muted-foreground"
            onClick={() => {
              void removeEvent(sleep.id).then(() => setPanelOpen(false));
            }}
          >
            Случайно? Отменить запись сна
          </Button>
        )}
      </Card>

      <FoodSheet
        open={foodOpen}
        onOpenChange={setFoodOpen}
        childId={childId}
        familyId={familyId}
        userId={userId}
        night
        parentEventId={sleep.id}
      />
    </>
  );
}
