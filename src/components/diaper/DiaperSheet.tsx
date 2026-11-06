import { useState } from "react";
import { useAddEvent } from "../../hooks/queries";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Dialog, SheetContent } from "../ui/dialog";
import type { DiaperKind } from "../../lib/types";

interface DiaperSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  familyId: string;
  userId: string;
}

const KIND_TILES: ReadonlyArray<{ value: DiaperKind; label: string }> = [
  { value: "pee", label: "Пописал" },
  { value: "poop", label: "Покакал" },
];

/** Подгузники в v1: одна кнопка с выбором типа (решение Q29).
    Liquid Glass: крупные плитки с тинтом еды — как .types в превью (padding 16px). */
export function DiaperSheet({
  open,
  onOpenChange,
  childId,
  familyId,
  userId,
}: DiaperSheetProps): React.JSX.Element {
  const [kind, setKind] = useState<DiaperKind>("pee");
  const addEvent = useAddEvent();

  const record = (): void => {
    void addEvent({
      childId,
      familyId,
      createdBy: userId,
      type: "diaper",
      details: { kind },
    }).then(() => onOpenChange(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Подгузник">
        <div className="mt-1 flex gap-2">
          {KIND_TILES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={kind === t.value}
              onClick={() => setKind(t.value)}
              className={cn(
                "flex-1 rounded-[14px] border px-3 py-4 text-[13px] font-bold transition-colors duration-200",
                kind === t.value
                  ? "border-food/40 bg-tint-food text-food"
                  : "border-stroke bg-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button size="lg" className="mt-4 w-full" onClick={record}>
          Записать
        </Button>
      </SheetContent>
    </Dialog>
  );
}
