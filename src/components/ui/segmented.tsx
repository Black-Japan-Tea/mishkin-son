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
  /** Цветовой акцент выбранного (персик/шалфей/семантика) */
  accent?: "primary" | "secondary" | "sleep" | "food" | "info" | "destructive";
}

const ACCENT_CLASS: Record<NonNullable<SegmentedProps<string>["accent"]>, string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  sleep: "bg-sleep text-white",
  food: "bg-food text-white",
  info: "bg-ai text-white",
  destructive: "bg-destructive text-white",
};

/**
 * Базис сегмента по числу опций: перенос строк перестаёт зависеть от ширины текста.
 * 2–3 опции — всегда один ровный ряд; 4+ — ровная сетка по 2 в ряд.
 * Без этого на 320px «Подгузник» из 4-опционного набора уезжал на вторую строку растянутым.
 */
const ITEM_BASIS: Record<number, string> = {
  2: "basis-[calc(50%-0.25rem)]",
  3: "basis-[calc(33.333%-5.33px)]",
};

/** Сегментированный выбор (вместо select — крупнее и удобнее одной рукой). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  accent = "primary",
}: SegmentedProps<T>) {
  const basis = ITEM_BASIS[options.length] ?? "basis-[calc(50%-0.25rem)]";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-w-0 flex-1 whitespace-nowrap rounded-lg border border-border px-3 py-2.5 text-sm font-semibold transition-colors",
            basis,
            value === o.value
              ? ACCENT_CLASS[accent]
              : "bg-card text-foreground hover:bg-accent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
