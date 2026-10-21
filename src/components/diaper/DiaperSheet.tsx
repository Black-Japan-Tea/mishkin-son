import { useState } from "react";
import { useAddEvent } from "../../hooks/queries";
import { Button } from "../ui/button";
import { Segmented } from "../ui/segmented";
import { Dialog, SheetContent } from "../ui/dialog";
import type { DiaperKind } from "../../lib/types";

interface DiaperSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  familyId: string;
  userId: string;
}

/** Подгузники в v1: одна кнопка с выбором типа (решение Q29). */
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
        <Segmented
          accent="info"
          value={kind}
          onChange={setKind}
          options={[
            { value: "pee", label: "Попис" },
            { value: "poop", label: "Кака" },
            { value: "both", label: "И то и то" },
          ]}
        />
        <Button className="mt-4 w-full" onClick={record}>
          Записать
        </Button>
      </SheetContent>
    </Dialog>
  );
}
