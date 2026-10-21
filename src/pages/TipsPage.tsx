import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { TipCard } from "../components/tips/TipCard";
import { useChildEvents } from "../hooks/queries";
import { useChildren } from "../stores/children";
import { generateTips } from "../lib/advisor/engine";

/** Экран «Советы»: движок считается по запросу при открытии (решения Q73–Q80). */
export function TipsPage(): React.JSX.Element {
  const { activeId } = useChildren();
  const childId = activeId ?? "";
  const child = useChildren((s) => s.children.find((c) => c.id === activeId));
  const { data: events, isLoading } = useChildEvents(childId !== "" ? childId : null);

  const tips = useMemo(() => {
    if (child === undefined || events === undefined) return [];
    return generateTips(child, events);
  }, [child, events]);

  if (child === undefined) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-ai" />
        <h1 className="text-base font-bold">Наблюдения</h1>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Анализирую записи…</p>}

      {tips.map((tip) => (
        <TipCard key={tip.id} tip={tip} accent={tip.icon === "sleep" && tip.id === "today-summary"} />
      ))}

      {!isLoading && tips.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Запиши первые сны и кормления — и здесь появятся наблюдения.
        </p>
      )}
    </div>
  );
}
