import { cn } from "../../lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
  /** Цветовой акцент активного сегмента: еда/сон — свои тинты, neutral — плотное стекло */
  accent?: "food" | "sleep" | "neutral";
}

const ACCENT_ACTIVE: Record<NonNullable<SegmentedProps<string>["accent"]>, string> = {
  food: "bg-tint-food text-food",
  sleep: "bg-tint-sleep text-sleep",
  neutral: "bg-glass-strong text-foreground",
};

/**
 * Базис сегмента по числу опций: перенос строк перестаёт зависеть от ширины текста.
 * 2–3 опции — всегда один ровный ряд; 4+ — ровная сетка по 2 в ряд.
 * Без этого на 320px «Подгузник» из 4-опционного набора уезжал на вторую строку растянутым.
 * Расчёт под gap-1 (4px) стеклянного контейнера.
 */
const ITEM_BASIS: Record<number, string> = {
  2: "basis-[calc(50%-0.125rem)]",
  3: "basis-[calc(33.333%-2.67px)]",
};

/** Сегментированный выбор (вместо select — крупнее и удобнее одной рукой).
    Liquid Glass: единое стеклянное «лоще», активный сегмент подсвечен тинтом роли. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  accent = "food",
}: SegmentedProps<T>) {
  const basis = ITEM_BASIS[options.length] ?? "basis-[calc(50%-0.125rem)]";
  return (
    <div className={cn("flex flex-wrap gap-1 rounded-2xl glass p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-w-0 flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors duration-200",
            basis,
            value === o.value
              ? ACCENT_ACTIVE[accent]
              : "bg-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
