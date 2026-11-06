import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "../components/ui/button";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import { DayFeed } from "../components/day/DayFeed";
import { NewEventDialog } from "../components/event/EventDialog";
import { useChildEvents, useDayEvents } from "../hooks/queries";
import { useAuth } from "../stores/auth";
import { useChildren } from "../stores/children";
import { useFamily } from "../stores/family";
import { dayKeyOf } from "../lib/time";

/** История: календарь в стеклянной карточке + лента выбранного дня (решение Q58). */
export function HistoryPage(): React.JSX.Element {
  const userId = useAuth((s) => s.userId) ?? "";
  const { activeId } = useChildren();
  const family = useFamily((s) => s.family);
  const childId = activeId ?? "";
  const [dayKey, setDayKey] = useState(dayKeyOf(new Date().toISOString()));
  const [adding, setAdding] = useState(false);

  const { data: dayEvents } = useDayEvents(childId !== "" ? childId : null, dayKey);
  const { data: allEvents } = useChildEvents(childId !== "" ? childId : null);

  // Число записей по дням — для точек-маркеров и счётчика месяца в шапке календаря
  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of allEvents ?? []) {
      const key = dayKeyOf(e.startedAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [allEvents]);

  // «28 ноября · сегодня» — подпись даты над лентой выбранного дня
  const selectedDate = parseISO(dayKey);
  const dayTitle = isSameDay(selectedDate, new Date())
    ? `${format(selectedDate, "d MMMM", { locale: ru })} · сегодня`
    : format(selectedDate, "d MMMM", { locale: ru });

  if (childId === "" || family === null) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="glass rounded-[24px] p-4">
        <MonthCalendar selectedDayKey={dayKey} onSelect={setDayKey} dayCounts={dayCounts} />
      </div>
      <h2 className="px-1 text-base font-bold">{dayTitle}</h2>
      <DayFeed events={dayEvents} emptyText="В этот день записей нет" />
      <Button
        variant="outline"
        onClick={() => setAdding(true)}
        className="mx-auto w-48"
      >
        <Plus className="h-4 w-4" /> Добавить событие
      </Button>
      {adding && (
        <NewEventDialog
          childId={childId}
          familyId={family.id}
          userId={userId}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}
