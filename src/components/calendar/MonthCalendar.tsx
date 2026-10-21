import { useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface MonthCalendarProps {
  selectedDayKey: string;
  onSelect: (dayKey: string) => void;
  /** Дни, в которые есть события — точка-маркер */
  markedDayKeys?: ReadonlySet<string>;
}

/** Календарь истории: неделя с понедельника (Q96), выбор дня (Q58). */
export function MonthCalendar({
  selectedDayKey,
  onSelect,
  markedDayKeys = new Set<string>(),
}: MonthCalendarProps): React.JSX.Element {
  const selected = parseISO(selectedDayKey);
  const [month, setMonth] = useState<Date>(startOfMonth(selected));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Прошлый месяц" onClick={() => setMonth(addDays(startOfMonth(month), -1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-bold capitalize">{format(month, "LLLL yyyy", { locale: ru })}</span>
        <Button variant="ghost" size="icon" aria-label="Следующий месяц" onClick={() => setMonth(addDays(endOfMonth(month), 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => (
          <span key={d} className="py-1 font-semibold">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const isSelected = isSameDay(day, selected);
          const dim = !isSameMonth(day, month);
          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onSelect(dayKey)}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : dim
                    ? "text-muted-foreground/50 hover:bg-accent"
                    : "hover:bg-accent",
              )}
            >
              {day.getDate()}
              {markedDayKeys.has(dayKey) && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-food" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function dayKeyToDate(dayKey: string): Date {
  return parse(dayKey, "yyyy-MM-dd", new Date());
}
