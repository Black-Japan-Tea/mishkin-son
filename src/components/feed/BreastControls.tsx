import { useActiveBreast } from "../../hooks/queries";
import { useNow } from "../../hooks/useNow";
import { formatDuration } from "../../lib/time";
import { Button } from "../ui/button";
import { Segmented } from "../ui/segmented";
import type { AppEvent, BreastSide } from "../../lib/types";

interface BreastControlsProps {
  childId: string;
  night: boolean;
  side: BreastSide;
  onSide: (side: BreastSide) => void;
  /** Записать мгновенное кормление (ночь) */
  onInstant: (side: BreastSide) => Promise<void>;
  /** Начать таймер (день) */
  onStartTimer: (side: BreastSide) => Promise<void>;
  onEdited: () => void;
  editEvent: (id: string, patch: Partial<Omit<AppEvent, "id" | "createdAt">>) => Promise<unknown>;
}

/** Управление грудным кормлением: ночь — мгновенная запись, день — таймер (Q21–Q22, Q26). */
export function BreastControls({
  childId,
  night,
  side,
  onSide,
  onInstant,
  onStartTimer,
  onEdited,
  editEvent,
}: BreastControlsProps): React.JSX.Element {
  const { data: activeBreast } = useActiveBreast(childId);
  const now = useNow(1000);

  const finish = (id: string, startedAt: string, feedSide: BreastSide): void => {
    void editEvent(id, {
      endedAt: new Date().toISOString(),
      details: {
        side: feedSide,
        durationMin: Math.max(1, Math.round((now.getTime() - new Date(startedAt).getTime()) / 60000)),
      },
    }).then(onEdited);
  };

  return (
    <div className="flex flex-col gap-2">
      <Segmented
        value={side}
        onChange={onSide}
        options={[
          { value: "left", label: "Лево" },
          { value: "right", label: "Право" },
          { value: "both", label: "Обе" },
        ]}
      />
      {night ? (
        <Button className="mt-2" onClick={() => void onInstant(side)}>
          Записать
        </Button>
      ) : activeBreast === undefined || activeBreast === null ? (
        <Button className="mt-2" onClick={() => void onStartTimer(side)}>
          Начать кормление
        </Button>
      ) : (
        <Button
          className="mt-2"
          onClick={() => finish(activeBreast.id, activeBreast.startedAt, activeBreast.details.side)}
        >
          Завершить ({formatDuration(now.getTime() - new Date(activeBreast.startedAt).getTime())})
        </Button>
      )}
    </div>
  );
}
