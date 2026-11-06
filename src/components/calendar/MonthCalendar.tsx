import { useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
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
  /** Число записей по дням (ключ 'YYYY-MM-DD'): точки-маркеры и счётчик месяца в шапке */
  dayCounts?: ReadonlyMap<string, number>;
}

/** «1 запись / 2 записи / 5 записей» — русские формы множественного числа для шапки месяца */
function recordsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} запись`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} записи`;
  return `${count} записей`;
}

/** Календарь истории: неделя с понедельника (Q96), выбор дня (Q58). */
export function MonthCalendar({
  selectedDayKey,
  onSelect,
  dayCounts = new Map<string, number>(),
}: MonthCalendarProps): React.JSX.Element {
  const selected = parseISO(selectedDayKey);
  const [month, setMonth] = useState<Date>(startOfMonth(selected));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  // Счётчик записей — по отображаемому месяцу, обновляется вместе с навигацией
  const monthCount = days.reduce((sum, day) => {
    if (!isSameMonth(day, month)) return sum;
    return sum + (dayCounts.get(format(day, "yyyy-MM-dd")) ?? 0);
  }, 0);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Прошлый месяц"
          onClick={() => setMonth(addDays(startOfMonth(month), -1))}
          className="glass-strong h-8 w-8 shrink-0 rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-[15px] font-bold capitalize">{format(month, "LLLL yyyy", { locale: ru })}</span>
        <span className="ml-auto text-xs text-faint">{recordsLabel(monthCount)}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Следующий месяц"
          onClick={() => setMonth(addDays(endOfMonth(month), 1))}
          className="glass-strong h-8 w-8 shrink-0 rounded-full"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-faint">
        {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => (
          <span key={d} className="py-1 font-semibold">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const isSelected = isSameDay(day, selected);
          const today = isToday(day);
          const dim = !isSameMonth(day, month);
          const hasEvents = (dayCounts.get(dayKey) ?? 0) > 0;
          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onSelect(dayKey)}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                today
                  ? "bg-sleep text-white"
                  : isSelected
                    ? "bg-tint-sleep text-sleep"
                    : dim
                      ? "text-muted-foreground/40 hover:bg-accent"
                      : "hover:bg-accent",
              )}
            >
              {day.getDate()}
              {hasEvents && !today && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-food" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
