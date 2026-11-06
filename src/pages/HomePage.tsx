import { useMemo, useState } from "react";
import { ZzIcon, BottleIcon, BriefsIcon } from "../components/icons";
import { SleepCard } from "../components/sleep/SleepCard";
import { SleepStartSheet } from "../components/sleep/SleepStartSheet";
import { FoodSheet } from "../components/feed/FoodSheet";
import { DiaperSheet } from "../components/diaper/DiaperSheet";
import { DayFeed } from "../components/day/DayFeed";
import { useAuth } from "../stores/auth";
import { useChildren } from "../stores/children";
import { useFamily } from "../stores/family";
import { useDayEvents } from "../hooks/queries";
import { useNow } from "../hooks/useNow";
import { dayKeyOf, formatDuration } from "../lib/time";
import { feedStatsOnDay, liveEvents, sleepMsOnDay } from "../lib/advisor/patterns";

/** Метка-капс в карточках — 11px, разрядка wide, как .lbl в эталоне. */
function Label({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{children}</p>
  );
}

/** Кнопка быстрого действия: стеклянная плитка с цветной плашкой иконки (эталон .qa). */
function ActionTile(props: {
  label: string;
  icon: React.JSX.Element;
  plateClass: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="glass flex flex-col items-center gap-2 rounded-3xl px-2.5 py-4 text-[13px] font-bold transition-transform duration-150 active:scale-95"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${props.plateClass}`}>
        {props.icon}
      </span>
      {props.label}
    </button>
  );
}

/** Главный экран: карточка сна, действия, сводки и лента дня (эталон «ГЛАВНАЯ»). */
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
    const live = liveEvents(events ?? []);
    // Активный сон не входит в sleepMsOnDay (только завершённые) — добавляем живой таймер
    const activeSleep = live.find((e) => e.type === "sleep" && e.endedAt === null);
    const activeMs =
      activeSleep !== undefined ? now.getTime() - new Date(activeSleep.startedAt).getTime() : 0;
    return {
      sleepMs: sleepMsOnDay(live, todayKey) + activeMs,
      feed: feedStatsOnDay(live, todayKey),
    };
  }, [events, todayKey, now]);

  const feedBreakdown = [
    summary.feed.formulaMl > 0 ? `смесь ${summary.feed.formulaMl}` : null,
    summary.feed.waterMl > 0 ? `вода ${summary.feed.waterMl}` : null,
  ]
    .filter((p) => p !== null)
    .join(" · ");

  if (childId === "" || family === null) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <SleepCard childId={childId} />

      <div className="grid grid-cols-3 gap-2.5">
        <ActionTile
          label="Сон"
          icon={<ZzIcon className="h-[22px] w-[22px]" />}
          plateClass="bg-tint-sleep text-sleep"
          onClick={() => setSleepOpen(true)}
        />
        <ActionTile
          label="Еда"
          icon={<BottleIcon className="h-[22px] w-[22px]" />}
          plateClass="bg-tint-food text-food"
          onClick={() => setFoodOpen(true)}
        />
        <ActionTile
          label="Подгузник"
          icon={<BriefsIcon className="h-[22px] w-[22px]" />}
          plateClass="bg-secondary text-muted-foreground"
          onClick={() => setDiaperOpen(true)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="glass rounded-3xl px-4 py-3.5">
          <Label>Сна сегодня</Label>
          <p className="mt-0.5 text-xl font-extrabold tracking-[-0.01em]">
            {formatDuration(summary.sleepMs)}
          </p>
          <p className="text-[11px] text-muted-foreground">из нормы 13–16 ч</p>
        </div>
        <div className="glass rounded-3xl px-4 py-3.5">
          <Label>Кормлений</Label>
          <p className="mt-0.5 text-xl font-extrabold tracking-[-0.01em]">
            {summary.feed.count} · {summary.feed.ml} мл
          </p>
          <p className="text-[11px] text-muted-foreground">
            {feedBreakdown === "" ? "—" : feedBreakdown}
          </p>
        </div>
      </div>

      <h2 className="mt-1 px-0.5 text-base font-extrabold tracking-[-0.01em]">Сегодня</h2>
      <DayFeed events={events} />

      <SleepStartSheet open={sleepOpen} onOpenChange={setSleepOpen} childId={childId} familyId={family.id} userId={userId} />
      <FoodSheet open={foodOpen} onOpenChange={setFoodOpen} childId={childId} familyId={family.id} userId={userId} />
      <DiaperSheet open={diaperOpen} onOpenChange={setDiaperOpen} childId={childId} familyId={family.id} userId={userId} />
    </div>
  );
}
