import { Timer } from "lucide-react";
import { useNow } from "../../hooks/useNow";
import { useActiveBreast, useEditEvent, useInvalidateEvents } from "../../hooks/queries";
import { formatClock, formatDuration } from "../../lib/time";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

interface ActiveBreastCardProps {
  childId: string;
}

/** Активное грудное кормление: таймер + завершение (Q26/Q28 — таймер только у груди). */
export function ActiveBreastCard({ childId }: ActiveBreastCardProps): React.JSX.Element | null {
  const { data: feed } = useActiveBreast(childId);
  const now = useNow(1000);
  const editEvent = useEditEvent();
  const invalidate = useInvalidateEvents();

  if (feed === undefined || feed === null) return null;

  const finish = (): void => {
    void editEvent(feed.id, {
      endedAt: new Date().toISOString(),
      details: {
        side: feed.details.side,
        durationMin: Math.max(1, Math.round((now.getTime() - new Date(feed.startedAt).getTime()) / 60000)),
      },
    }).then(invalidate);
  };

  return (
    <Card className="ambient ambient-food flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Timer className="h-5 w-5 text-food" />
        <div>
          <p className="text-sm font-bold">Грудь: {feed.details.side === "left" ? "лево" : feed.details.side === "right" ? "право" : "обе"}</p>
          <p className="text-xs text-muted-foreground">с {formatClock(feed.startedAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-extrabold tabular-nums">
          {formatDuration(now.getTime() - new Date(feed.startedAt).getTime())}
        </span>
        <Button size="sm" variant="outline" onClick={finish}>
          Завершить
        </Button>
      </div>
    </Card>
  );
}
