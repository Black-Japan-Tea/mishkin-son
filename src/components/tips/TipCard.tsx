import { Clock, Info, Moon, Utensils } from "lucide-react";
import { Card } from "../ui/card";
import type { Tip } from "../../lib/advisor/engine";

const ICONS: Record<Tip["icon"], React.JSX.Element> = {
  sleep: <Moon className="h-4 w-4 text-sleep" />,
  food: <Utensils className="h-4 w-4 text-food" />,
  window: <Clock className="h-4 w-4 text-ai" />,
  info: <Info className="h-4 w-4 text-muted-foreground" />,
};

// Акцент блока переехал в сводку дня (TipsSection); карточка совета остаётся нейтральной
export function TipCard({ tip }: { tip: Tip }): React.JSX.Element {
  return (
    <Card className="ambient flex items-start gap-3 p-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {ICONS[tip.icon]}
      </span>
      <p className="text-sm leading-snug">{tip.text}</p>
    </Card>
  );
}
