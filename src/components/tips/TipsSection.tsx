import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Тон блока: цветовые токены совпадают с кнопками главной (решение №4). */
type Tone = "sleep" | "food";

const TONE_PILL: Record<Tone, string> = {
  sleep: "bg-sleep",
  food: "bg-food",
};

interface TipsSectionProps {
  title: string;
  icon: ReactNode;
  tone: Tone;
  /** Сводка дня (уже отформатирована вызывающей стороной) — отдельной стеклянной карточкой под плашкой */
  summary?: string;
  /** Советы блока */
  children: ReactNode;
}

/** Блок «Наблюдений»: компактная цветная пилюля-заголовок, затем сводка дня и стеклянные карточки советов. */
export function TipsSection({ title, icon, tone, summary, children }: TipsSectionProps): React.JSX.Element {
  return (
    <section className="flex flex-col gap-2.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold text-white",
          TONE_PILL[tone],
        )}
      >
        {icon}
        {title}
      </span>
      {summary !== undefined && summary !== "" && (
        <div className="glass rounded-[24px] p-3.5 text-[13px] leading-[1.5]">{summary}</div>
      )}
      {children}
    </section>
  );
}
