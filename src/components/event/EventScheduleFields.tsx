import { Input, Label } from "../ui/field";
import { Segmented } from "../ui/segmented";
import { TYPE_OPTIONS, needsEnd } from "./details";
import type { EventType } from "../../lib/types";

interface EventScheduleFieldsProps {
  type: EventType;
  onType: (t: EventType) => void;
  dateKey: string;
  onDate: (v: string) => void;
  start: string;
  onStart: (v: string) => void;
  end: string;
  onEnd: (v: string) => void;
}

/** Тип события + дата/время начала и конца. */
export function EventScheduleFields({
  type,
  onType,
  dateKey,
  onDate,
  start,
  onStart,
  end,
  onEnd,
}: EventScheduleFieldsProps): React.JSX.Element {
  return (
    <>
      <Segmented value={type} onChange={onType} options={TYPE_OPTIONS} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="ev-date">Дата</Label>
          <Input id="ev-date" type="date" value={dateKey} onChange={(e) => onDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="ev-start">Начало</Label>
          <Input id="ev-start" type="time" value={start} onChange={(e) => onStart(e.target.value)} />
        </div>
        {needsEnd(type) && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="ev-end">Конец (можно пусто — идёт)</Label>
            <Input id="ev-end" type="time" value={end} onChange={(e) => onEnd(e.target.value)} />
          </div>
        )}
      </div>
    </>
  );
}
