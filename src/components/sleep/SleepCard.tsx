import { useNow } from "../../hooks/useNow";
import { useActiveSleep, useEditEvent } from "../../hooks/queries";
import { formatClock } from "../../lib/time";
import { Button } from "../ui/button";

interface SleepCardProps {
  childId: string;
}

/** Таймер активного сна в формате «ЧЧ:ММ» — крупная цифра, как в эталоне (00:47). */
function formatTimer(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Активный сон: стеклянная карточка с таймером и кнопкой «Завершить» (эталон v1-liquid-glass). */
export function SleepCard({ childId }: SleepCardProps): React.JSX.Element | null {
  const { data: sleep } = useActiveSleep(childId);
  const now = useNow(1000);
  const editEvent = useEditEvent();

  if (sleep === undefined || sleep === null) return null;
  const elapsedMs = now.getTime() - new Date(sleep.startedAt).getTime();

  const finish = (): void => {
    void editEvent(sleep.id, { endedAt: new Date().toISOString() });
  };

  return (
    <section className="glass relative overflow-hidden rounded-3xl p-5">
      {/* Радиальное голубое пятно — чистый декор, клики не перехватывает */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[30%] -top-[40%] h-60 w-60"
        style={{ background: "radial-gradient(closest-side, var(--tint-sleep), transparent)" }}
      />
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
        {sleep.details.dayTag === "night" ? "Ночной сон" : "Дневной сон"}
      </p>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[52px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">
            {formatTimer(elapsedMs)}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-sleep">
            <span aria-hidden="true" className="h-[7px] w-[7px] animate-pulse rounded-full bg-sleep" />
            начался в {formatClock(sleep.startedAt)}
          </span>
        </div>
        <Button tone="sleep" onClick={finish} className="shrink-0">
          Завершить
        </Button>
      </div>
    </section>
  );
}
