import { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Button } from "../ui/button";
import { EventForm } from "./EventForm";
import { useRemoveEvent } from "../../hooks/queries";
import type { AppEvent } from "../../lib/types";

interface EventDialogProps {
  event: AppEvent;
  onClose: () => void;
}

/** Правка события: все поля + удаление с подтверждением (Q34/Q35). */
export function EventDialog({ event, onClose }: EventDialogProps): React.JSX.Element {
  const removeEvent = useRemoveEvent();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { childId, familyId, createdBy } = event;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Событие">
        <EventForm
          childId={childId}
          familyId={familyId}
          userId={createdBy}
          initial={event}
          onSaved={onClose}
        />
        {confirmDelete ? (
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                void removeEvent(event.id).then(onClose);
              }}
            >
              Удалить окончательно
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Отмена
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="mt-3 w-full text-destructive" onClick={() => setConfirmDelete(true)}>
            Удалить событие
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Диалог добавления события задним числом (Q33). */
export function NewEventDialog(props: {
  childId: string;
  familyId: string;
  userId: string;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent title="Добавить событие">
        <EventForm
          childId={props.childId}
          familyId={props.familyId}
          userId={props.userId}
          initial={null}
          onSaved={props.onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
