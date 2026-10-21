import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "../ui/button";
import { Input, Label } from "../ui/field";
import { Segmented } from "../ui/segmented";
import { Dialog, SheetContent } from "../ui/dialog";
import { useAddEvent } from "../../hooks/queries";
import { dayKeyOf, formatClock } from "../../lib/time";
import type { DayTag } from "../../lib/types";

interface SleepStartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  familyId: string;
  userId: string;
}

/** Старт сна: время + правка + тег день/ночь + условия (решения Q13–Q14). */
export function SleepStartSheet({
  open,
  onOpenChange,
  childId,
  familyId,
  userId,
}: SleepStartSheetProps): React.JSX.Element {
  const hour = new Date().getHours();
  const [dayTag, setDayTag] = useState<DayTag>(hour >= 21 || hour < 6 ? "night" : "day");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [dateKey, setDateKey] = useState(dayKeyOf(new Date().toISOString()));
  const [time, setTime] = useState(formatClock(new Date().toISOString()));
  const [error, setError] = useState<string | null>(null);
  const addEvent = useAddEvent();

  const start = (): void => {
    setError(null);
    const startedAt = new Date(`${dateKey}T${time}`);
    if (Number.isNaN(startedAt.getTime())) {
      setError("Проверь время засыпания");
      return;
    }
    const details: { dayTag: DayTag; place?: string; note?: string } = { dayTag };
    if (place !== "") details.place = place;
    if (note !== "") details.note = note;
    void addEvent({
      childId,
      familyId,
      createdBy: userId,
      type: "sleep",
      startedAt: startedAt.toISOString(),
      endedAt: null,
      details,
    }).then(() => onOpenChange(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Укладываем спать">
        {error !== null && (
          <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
        )}
        <Segmented
          accent="sleep"
          value={dayTag}
          onChange={setDayTag}
          options={[
            { value: "day", label: "Дневной" },
            { value: "night", label: "Ночной" },
          ]}
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="sl-date">Заснул</Label>
            <Input id="sl-date" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="sl-time">во</Label>
            <Input id="sl-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <Label htmlFor="sl-place">Место (необязательно)</Label>
          <Input id="sl-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Кроватка, коляска, руки…" />
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <Label htmlFor="sl-note">Заметка (необязательно)</Label>
          <Input id="sl-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Укачивали…" />
        </div>
        <Button size="lg" className="mt-4 w-full bg-sleep text-white hover:opacity-90" onClick={() => void start()}>
          <span className="flex items-center gap-2">
            {dayTag === "night" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Спать!
          </span>
        </Button>
      </SheetContent>
    </Dialog>
  );
}
