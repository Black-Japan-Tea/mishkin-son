import { Clock, Info, Moon } from "lucide-react";
import { UtensilsIcon } from "../icons";
import type { Tip } from "../../lib/advisor/engine";
import { cn } from "../../lib/utils";

// Иконка и тон плашки задаются типом совета; окно бодрствования относится ко сну
const TIP_VISUALS: Record<Tip["icon"], { tile: string; icon: React.JSX.Element }> = {
  sleep: { tile: "bg-tint-sleep", icon: <Moon className="h-4 w-4 text-sleep" /> },
  window: { tile: "bg-tint-sleep", icon: <Clock className="h-4 w-4 text-sleep" /> },
  food: { tile: "bg-tint-food", icon: <UtensilsIcon className="h-4 w-4 text-food" /> },
  info: { tile: "bg-glass-strong", icon: <Info className="h-4 w-4 text-muted-foreground" /> },
};

/** Стеклянная карточка наблюдения: иконка на тон-плашке слева, текст 13px/1.5 (эталон «Наблюдения»). */
export function TipCard({ tip }: { tip: Tip }): React.JSX.Element {
  const visual = TIP_VISUALS[tip.icon];
  return (
    <div className="glass flex items-start gap-3 rounded-[24px] p-3.5">
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          visual.tile,
        )}
      >
        {visual.icon}
      </span>
      <p className="text-[13px] leading-[1.5]">{tip.text}</p>
    </div>
  );
}
