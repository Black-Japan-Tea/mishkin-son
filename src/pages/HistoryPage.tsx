import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import { DayFeed } from "../components/day/DayFeed";
import { NewEventDialog } from "../components/event/EventDialog";
import { useChildEvents, useDayEvents } from "../hooks/queries";
import { useAuth } from "../stores/auth";
import { useChildren } from "../stores/children";
import { useFamily } from "../stores/family";
import { dayKeyOf } from "../lib/time";

/** История: календарь сверху + лента выбранного дня (решение Q58). */
export function HistoryPage(): React.JSX.Element {
  const userId = useAuth((s) => s.userId) ?? "";
  const { activeId } = useChildren();
  const family = useFamily((s) => s.family);
  const childId = activeId ?? "";
  const [dayKey, setDayKey] = useState(dayKeyOf(new Date().toISOString()));
  const [adding, setAdding] = useState(false);

  const { data: dayEvents } = useDayEvents(childId !== "" ? childId : null, dayKey);
  const { data: allEvents } = useChildEvents(childId !== "" ? childId : null);

  const marked = useMemo(() => {
    const set = new Set<string>();
    for (const e of allEvents ?? []) set.add(dayKeyOf(e.startedAt));
    return set;
  }, [allEvents]);

  if (childId === "" || family === null) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="ambient p-3">
        <MonthCalendar selectedDayKey={dayKey} onSelect={setDayKey} markedDayKeys={marked} />
      </Card>
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
