import { Clock, Info, Moon, Utensils } from "lucide-react";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";
import type { Tip } from "../../lib/advisor/engine";

const ICONS: Record<Tip["icon"], React.JSX.Element> = {
  sleep: <Moon className="h-4 w-4 text-sleep" />,
  food: <Utensils className="h-4 w-4 text-food" />,
  window: <Clock className="h-4 w-4 text-ai" />,
  info: <Info className="h-4 w-4 text-muted-foreground" />,
};

export function TipCard({ tip, accent = false }: { tip: Tip; accent?: boolean }): React.JSX.Element {
  return (
    <Card
      className={cn(
        "ambient flex items-start gap-3 p-4",
        accent && "ambient-sleep",
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {ICONS[tip.icon]}
      </span>
      <p className="text-sm leading-snug">{tip.text}</p>
    </Card>
  );
}
