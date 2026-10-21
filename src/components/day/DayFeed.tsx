import { useState } from "react";
import { EventRow } from "./EventRow";
import { EventDialog } from "../event/EventDialog";
import type { AppEvent } from "../../lib/types";

interface DayFeedProps {
  events: AppEvent[] | undefined;
  emptyText?: string;
}

/** Лента дня: сна и еда в хронологии; ночные кормления — с отступом под своим сном. */
export function DayFeed({ events, emptyText = "Пока пусто — нажми «Сон» или «Еда»" }: DayFeedProps): React.JSX.Element {
  const [selected, setSelected] = useState<AppEvent | null>(null);
  if (events === undefined) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Загрузка…</p>;
  }
  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  const sorted = [...events].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((e) => (
        <div key={e.id}>
          <EventRow event={e} onClick={setSelected} />
          {e.type === "sleep" &&
            sorted
              .filter((n) => n.parentEventId === e.id)
              .map((n) => <EventRow key={n.id} event={n} nested onClick={setSelected} />)}
        </div>
      ))}
      {selected !== null && (
        <EventDialog event={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
