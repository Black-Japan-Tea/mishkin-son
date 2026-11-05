import { Card } from "../ui/card";
import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

/** Тон блока: цветовые токены совпадают с кнопками главной (решение №4). */
type Tone = "sleep" | "food";

const TONE_BADGE: Record<Tone, string> = {
  sleep: "bg-sleep",
  food: "bg-food",
};

const TONE_AMBIENT: Record<Tone, string> = {
  sleep: "ambient-sleep",
  food: "ambient-food",
};

interface TipsSectionProps {
  title: string;
  icon: ReactNode;
  tone: Tone;
  /** Короткая сводка дня (уже отформатирована вызывающей стороной) */
  summary: string;
  /** Советы блока */
  children: ReactNode;
}

/** Блок страницы наблюдений: плашка-заголовок в токенах главной, сводка дня и список советов. */
export function TipsSection({ title, icon, tone, summary, children }: TipsSectionProps): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-sm font-bold text-white",
          TONE_BADGE[tone],
        )}
      >
        {icon}
        {title}
      </span>
      <Card className={cn("ambient p-3 text-sm leading-snug", TONE_AMBIENT[tone])}>{summary}</Card>
      {children}
    </section>
  );
}
