import { Moon, Sun, Milk, Apple, Droplets, Baby } from "lucide-react";
import { formatClock, formatDuration } from "../../lib/time";
import { cn } from "../../lib/utils";
import type { AppEvent } from "../../lib/types";

/** Заголовок и иконка события — единое место описания типов. */
export function eventIcon(e: AppEvent): React.JSX.Element {
  const cls = "h-4 w-4";
  switch (e.type) {
    case "sleep":
      return e.details.dayTag === "night" ? <Moon className={cn(cls, "text-sleep")} /> : <Sun className={cn(cls, "text-sleep")} />;
    case "feed_bottle":
      return <Milk className={cn(cls, "text-food")} />;
    case "feed_solid":
      return <Apple className={cn(cls, "text-food")} />;
    case "feed_water":
      return <Droplets className={cn(cls, "text-info")} />;
    case "diaper":
      return <Baby className={cn(cls, "text-info")} />;
    default:
      // Легаси-типы из старых локальных БД не должны ронять ленту (D2).
      return <Baby className={cn(cls, "text-info")} />;
  }
}

/** Виды бутылочки; "milk" — легаси из старых строк БД, отображаем, но новым не пишем (D2). */
const BOTTLE_KIND_LABELS: Record<string, string> = {
  formula: "смеси",
  water: "воды",
  milk: "сцеженного",
};

export function eventTitle(e: AppEvent): string {
  switch (e.type) {
    case "sleep":
      return e.details.dayTag === "night" ? "Ночной сон" : "Дневной сон";
    case "feed_bottle": {
      const kindLabel = BOTTLE_KIND_LABELS[e.details.kind ?? ""] ?? undefined;
      return kindLabel === undefined
        ? `Бутылочка: ${e.details.volumeMl} мл`
        : `Бутылочка: ${e.details.volumeMl} мл ${kindLabel}`;
    }
    case "feed_solid": {
      // Прикорм — два независимых поля (что ел + сколько), заголовок собирает их через запятую.
      const parts: string[] = [];
      if (e.details.food !== undefined && e.details.food !== "") parts.push(e.details.food);
      if (e.details.amount !== undefined) {
        parts.push(`${e.details.amount} ${e.details.unit === "ml" ? "мл" : "г"}`);
      }
      return parts.length > 0 ? `Прикорм: ${parts.join(", ")}` : "Прикорм";
    }
    case "feed_water":
      return e.details.volumeMl !== undefined ? `Вода: ${e.details.volumeMl} мл` : "Вода";
    case "diaper":
      // "both" — легаси-значение из БД: нейтральный заголовок вместо падения.
      return e.details.kind === "pee" ? "Подгузник: пописал" : e.details.kind === "poop" ? "Подгузник: покакал" : "Подгузник";
    default:
      // Легаси-тип вне актуального EventType — нейтральный заголовок вместо undefined в UI.
      return "Событие";
  }
}

export function eventSubtitle(e: AppEvent): string {
  const parts: string[] = [];
  if (e.type === "sleep") {
    // Сон — интервал: длительность + диапазон, активный — «с HH:MM · идёт».
    if (e.endedAt !== null) {
      const dur = new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime();
      if (dur > 60_000) parts.push(formatDuration(dur));
      parts.push(`${formatClock(e.startedAt)} → ${formatClock(e.endedAt)}`);
    } else {
      parts.push(`с ${formatClock(e.startedAt)} · идёт`);
    }
  } else {
    // Мгновенные события пишутся одним временем (startedAt === endedAt);
    // диапазон показываем только при правке задним числом.
    if (e.endedAt !== null && e.endedAt !== e.startedAt) {
      parts.push(`${formatClock(e.startedAt)} → ${formatClock(e.endedAt)}`);
    } else {
      parts.push(formatClock(e.startedAt));
    }
  }
  if (e.type === "sleep" && e.details.place !== undefined) parts.push(e.details.place);
  if (e.type === "sleep" && e.details.note !== undefined) parts.push(e.details.note);
  if (e.type === "feed_solid" && e.details.note !== undefined) parts.push(e.details.note);
  if (e.parentEventId !== null) parts.push("внутри сна");
  return parts.join(" · ");
}

interface EventRowProps {
  event: AppEvent;
  nested?: boolean;
  onClick: (e: AppEvent) => void;
}

export function EventRow({ event, nested = false, onClick }: EventRowProps): React.JSX.Element {
  const active = event.endedAt === null;
  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-card/90 px-3 py-2.5 text-left transition-colors hover:bg-accent",
        nested && "ml-4 border-dashed",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {eventIcon(event)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">
          {eventTitle(event)}
          {active && <span className="ml-2 inline-block text-xs font-bold text-sleep">идёт</span>}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{eventSubtitle(event)}</span>
      </span>
    </button>
  );
}
