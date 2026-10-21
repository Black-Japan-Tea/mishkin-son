import { useMemo, useState } from "react";
import { Moon, Utensils } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { SleepCard } from "../components/sleep/SleepCard";
import { SleepStartSheet } from "../components/sleep/SleepStartSheet";
import { ActiveBreastCard } from "../components/feed/ActiveBreastCard";
import { FoodSheet } from "../components/feed/FoodSheet";
import { DiaperSheet } from "../components/diaper/DiaperSheet";
import { DayFeed } from "../components/day/DayFeed";
import { useAuth } from "../stores/auth";
import { useChildren } from "../stores/children";
import { useFamily } from "../stores/family";
import { useDayEvents } from "../hooks/queries";
import { useNow } from "../hooks/useNow";
import { dayKeyOf, formatDuration } from "../lib/time";
import { sleepMsOnDay } from "../lib/advisor/patterns";

/** Главный экран: кнопки + активный таймер + лента дня (план §7.1, Q53–Q55). */
export function HomePage(): React.JSX.Element {
  const userId = useAuth((s) => s.userId) ?? "";
  const { activeId } = useChildren();
  const family = useFamily((s) => s.family);
  const childId = activeId ?? "";
  const todayKey = dayKeyOf(new Date().toISOString());
  const now = useNow(30_000);
  const { data: events } = useDayEvents(childId !== "" ? childId : null, todayKey);

  const [sleepOpen, setSleepOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);
  const [diaperOpen, setDiaperOpen] = useState(false);

  const summary = useMemo(() => {
    const live = (events ?? []).filter((e) => e.deletedAt === null);
    const activeSleep = live.find((e) => e.type === "sleep" && e.endedAt === null);
    const activeMs =
      activeSleep !== undefined ? now.getTime() - new Date(activeSleep.startedAt).getTime() : 0;
    const sleepMs = sleepMsOnDay(live, todayKey) + activeMs;
    const feeds = live.filter((e) => e.type.startsWith("feed_")).length;
    return { sleepMs, feeds };
  }, [events, todayKey, now]);

  if (childId === "" || family === null) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SleepCard childId={childId} familyId={family.id} userId={userId} />
      <ActiveBreastCard childId={childId} />

      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="ambient ambient-sleep h-20 flex-col gap-1 bg-sleep text-white hover:opacity-90"
          onClick={() => setSleepOpen(true)}
        >
          <Moon className="h-6 w-6" />
          Сон
        </Button>
        <Button
          size="lg"
          className="ambient ambient-food h-20 flex-col gap-1 bg-food text-white hover:opacity-90"
          onClick={() => setFoodOpen(true)}
        >
          <Utensils className="h-6 w-6" />
          Еда
        </Button>
      </div>
      <Button variant="outline" onClick={() => setDiaperOpen(true)}>
        Подгузник
      </Button>

      <Card className="ambient flex items-center justify-around p-3 text-center text-sm">
        <span>
          <span className="block text-lg font-extrabold">{formatDuration(summary.sleepMs)}</span>
          <span className="text-xs text-muted-foreground">сна сегодня</span>
        </span>
        <span>
          <span className="block text-lg font-extrabold">{summary.feeds}</span>
          <span className="text-xs text-muted-foreground">кормлений</span>
        </span>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Сегодня</h2>
      </div>
      <DayFeed events={events} />

      <SleepStartSheet open={sleepOpen} onOpenChange={setSleepOpen} childId={childId} familyId={family.id} userId={userId} />
      <FoodSheet open={foodOpen} onOpenChange={setFoodOpen} childId={childId} familyId={family.id} userId={userId} />
      <DiaperSheet open={diaperOpen} onOpenChange={setDiaperOpen} childId={childId} familyId={family.id} userId={userId} />
    </div>
  );
}
