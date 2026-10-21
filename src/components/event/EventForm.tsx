import { format } from "date-fns";
import { useState } from "react";
import { Button } from "../ui/button";
import { EventScheduleFields } from "./EventScheduleFields";
import { EventDetailsFields } from "./EventDetailsFields";
import { buildEventDetails, needsEnd, type DetailsState } from "./details";
import { useAddEvent, useEditEvent } from "../../hooks/queries";
import type { AppEvent, EventType } from "../../lib/types";

interface EventFormProps {
  childId: string;
  familyId: string;
  userId: string;
  initial: AppEvent | null;
  onSaved: () => void;
}

/** Полная форма события: правка всего и всегда (Q34) + задним числом (Q33). */
export function EventForm({ childId, familyId, userId, initial, onSaved }: EventFormProps): React.JSX.Element {
  const init = initial;
  const startInit = init !== null ? new Date(init.startedAt) : new Date();
  const [type, setType] = useState<EventType>(init?.type ?? "sleep");
  const [dateKey, setDateKey] = useState(format(startInit, "yyyy-MM-dd"));
  const [start, setStart] = useState(format(startInit, "HH:mm"));
  const [end, setEnd] = useState(
    init !== null && init.endedAt !== null ? format(new Date(init.endedAt), "HH:mm") : "",
  );
  const [details, setDetails] = useState<DetailsState>({
    dayTag: init !== null && init.type === "sleep" ? init.details.dayTag : "day",
    place: init !== null && init.type === "sleep" ? (init.details.place ?? "") : "",
    note: init !== null && (init.type === "sleep" || init.type === "feed_solid") ? (init.details.note ?? "") : "",
    side: init !== null && init.type === "feed_breast" ? init.details.side : "left",
    ml: init !== null && init.type === "feed_bottle" ? String(init.details.volumeMl) : "",
    kind: init !== null && init.type === "feed_bottle" ? (init.details.kind ?? "formula") : "formula",
    food: init !== null && init.type === "feed_solid" ? (init.details.food ?? "") : "",
    waterMl:
      init !== null && init.type === "feed_water" && init.details.volumeMl !== undefined
        ? String(init.details.volumeMl)
        : "",
    diaperKind: init !== null && init.type === "diaper" ? init.details.kind : "pee",
  });
  const [error, setError] = useState<string | null>(null);
  const addEvent = useAddEvent();
  const editEvent = useEditEvent();

  const patchDetails = (patch: Partial<DetailsState>): void =>
    setDetails((prev) => ({ ...prev, ...patch }));

  const save = async (): Promise<void> => {
    setError(null);
    const startedAt = new Date(`${dateKey}T${start}`);
    const endedAtLocal = needsEnd(type) && end !== "" ? new Date(`${dateKey}T${end}`) : null;
    if (Number.isNaN(startedAt.getTime())) {
      setError("Проверь дату и время начала");
      return;
    }
    if (endedAtLocal !== null && endedAtLocal.getTime() <= startedAt.getTime()) {
      setError("Конец должен быть позже начала");
      return;
    }
    if (type === "feed_bottle") {
      const volume = Number.parseInt(details.ml, 10);
      if (Number.isNaN(volume) || volume <= 0) {
        setError("Укажи объём в мл");
        return;
      }
    }
    const patch = {
      type,
      startedAt: startedAt.toISOString(),
      endedAt:
        endedAtLocal !== null ? endedAtLocal.toISOString() : needsEnd(type) ? null : startedAt.toISOString(),
      details: buildEventDetails(type, details) as never,
    };
    if (init === null) {
      await addEvent({ childId, familyId, createdBy: userId, ...patch });
    } else {
      await editEvent(init.id, patch);
    }
    onSaved();
  };

  return (
    <div className="flex flex-col gap-3">
      {error !== null && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
      )}
      <EventScheduleFields
        type={type}
        onType={setType}
        dateKey={dateKey}
        onDate={setDateKey}
        start={start}
        onStart={setStart}
        end={end}
        onEnd={setEnd}
      />
      <EventDetailsFields type={type} details={details} patch={patchDetails} />
      <Button className="mt-1" onClick={() => void save()}>
        {initial === null ? "Добавить" : "Сохранить"}
      </Button>
    </div>
  );
}
