import { Moon, Sun, Droplets, Baby } from "lucide-react";
import { BottleIcon, BriefsIcon, UtensilsIcon } from "../icons";
import { formatClock, formatDuration } from "../../lib/time";
import { cn } from "../../lib/utils";
import type { AppEvent } from "../../lib/types";

/** Иконка события по типу — единое место описания (фирменные начертания + lucide). */
export function eventIcon(e: AppEvent): React.JSX.Element {
  const cls = "h-[22px] w-[22px]";
  switch (e.type) {
    case "sleep":
      return e.details.dayTag === "night" ? <Moon className={cls} /> : <Sun className={cls} />;
    case "feed_bottle":
      return <BottleIcon className={cls} />;
    case "feed_solid":
      return <UtensilsIcon className={cls} />;
    case "feed_water":
      // Легаси-тип из старых БД: вода — капли, нейтральная плашка (кормлением не считается)
      return <Droplets className={cls} />;
    case "diaper":
      return <BriefsIcon className={cls} />;
    default:
      // Легаси-типы из старых локальных БД не должны ронять ленту (D2).
      return <Baby className={cls} />;
  }
}

/** Плашка под иконку: сон — синий тинт, еда — изумрудный, остальное — нейтральное стекло. */
export function eventPlate(e: AppEvent): string {
  switch (e.type) {
    case "sleep":
      return "bg-tint-sleep text-sleep";
    case "feed_bottle":
    case "feed_solid":
      return "bg-tint-food text-food";
    default:
      return "bg-secondary text-muted-foreground";
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

/**
 * Подзаголовок строки ленты: время мгновенных событий уходит в правую колонку,
 * поэтому в тексте остаются только примечания; без них — прочерк (как в превью).
 * СобытиеSleep и правка задним числом показывают интервал целиком.
 */
function rowSubtitle(e: AppEvent): string {
  if (e.type === "sleep" || (e.endedAt !== null && e.endedAt !== e.startedAt)) {
    return eventSubtitle(e);
  }
  const parts: string[] = [];
  if (e.type === "feed_solid" && e.details.note !== undefined && e.details.note !== "") {
    parts.push(e.details.note);
  }
  if (e.parentEventId !== null) parts.push("внутри сна");
  return parts.length > 0 ? parts.join(" · ") : "—";
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
        "glass flex w-full items-center gap-3 rounded-2xl px-3.5 py-[13px] text-left transition-transform duration-150 active:scale-[0.98]",
        nested && "ml-4 border-dashed",
      )}
    >
      <span
        className={cn(
          "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px]",
          eventPlate(event),
        )}
      >
        {eventIcon(event)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">
          {eventTitle(event)}
          {active && <span className="ml-2 inline-block text-xs font-bold text-sleep">идёт</span>}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{rowSubtitle(event)}</span>
      </span>
      <time className="shrink-0 text-xs font-semibold tabular-nums text-faint">
        {formatClock(event.startedAt)}
      </time>
    </button>
  );
}
