import { useMemo } from "react";
import { Moon, Sparkles, Utensils } from "lucide-react";
import { TipCard } from "../components/tips/TipCard";
import { TipsSection } from "../components/tips/TipsSection";
import { useChildEvents } from "../hooks/queries";
import { useChildren } from "../stores/children";
import { generateTips } from "../lib/advisor/engine";
import { foodSummary, formatFoodSummary, formatSleepSummary, sleepSummary } from "../lib/advisor/summary";
import { dayKeyOf } from "../lib/time";

interface PageContent {
  tips: ReturnType<typeof generateTips>;
  sleepTips: ReturnType<typeof generateTips>;
  foodTips: ReturnType<typeof generateTips>;
  infoTips: ReturnType<typeof generateTips>;
  sleepLine: string | null;
  foodLine: string | null;
}

const EMPTY: PageContent = {
  tips: [],
  sleepTips: [],
  foodTips: [],
  infoTips: [],
  sleepLine: null,
  foodLine: null,
};

/** Экран «Наблюдения»: баннер-дисклеймер сверху, затем блоки «Сон» и «Еда» со сводкой дня (решения №3/№4). */
export function TipsPage(): React.JSX.Element {
  const { activeId } = useChildren();
  const childId = activeId ?? "";
  const child = useChildren((s) => s.children.find((c) => c.id === activeId));
  const { data: events, isLoading } = useChildEvents(childId !== "" ? childId : null);

  const content = useMemo<PageContent>(() => {
    if (child === undefined || events === undefined) return EMPTY;
    // Дисклеймер вынесен в баннер вверху страницы — в списках советов ему не место (решение №3)
    const tips = generateTips(child, events).filter((tip) => tip.id !== "disclaimer");
    const dayKey = dayKeyOf(new Date().toISOString());
    return {
      tips,
      // Окно бодрствования относится ко сну
      sleepTips: tips.filter((tip) => tip.icon === "sleep" || tip.icon === "window"),
      foodTips: tips.filter((tip) => tip.icon === "food"),
      infoTips: tips.filter((tip) => tip.icon === "info"),
      sleepLine: formatSleepSummary(sleepSummary(events, dayKey)),
      foodLine: formatFoodSummary(foodSummary(events, dayKey)),
    };
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

      {/* Системное уведомление, а не карточка: без окантовки, чтобы не сливалось с наблюдениями (решение №3) */}
      <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Это наблюдения по данным трекера, а не медицинская рекомендация. При вопросах о здоровье — педиатр.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Анализирую записи…</p>}

      {!isLoading && content.sleepLine !== null && content.foodLine !== null && (
        <>
          <TipsSection
            title="Сон"
            tone="sleep"
            icon={<Moon className="h-4 w-4" aria-hidden />}
            summary={content.sleepLine}
          >
            {content.sleepTips.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </TipsSection>

          <TipsSection
            title="Еда"
            tone="food"
            icon={<Utensils className="h-4 w-4" aria-hidden />}
            summary={content.foodLine}
          >
            {content.foodTips.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </TipsSection>

          {content.infoTips.length > 0 && (
            <div className="flex flex-col gap-3">
              {content.infoTips.map((tip) => (
                <TipCard key={tip.id} tip={tip} />
              ))}
            </div>
          )}
        </>
      )}

      {!isLoading && content.tips.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Запиши первые сны и кормления — и здесь появятся наблюдения.
        </p>
      )}
    </div>
  );
}
