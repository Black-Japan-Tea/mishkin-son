import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ChildForm } from "../components/child/ChildForm";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { formatAge } from "../lib/time";
import { useChildren } from "../stores/children";
import { useFamily } from "../stores/family";
import type { Child } from "../lib/types";

export function ChildSelectPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { children, activeId, setActive } = useChildren();
  const family = useFamily((s) => s.family);
  const [creating, setCreating] = useState(false);
  const familyId = family?.id ?? "";

  const pick = (child: Child): void => {
    void setActive(child.id).then(() => navigate("/", { replace: true }));
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 p-4">
      <h1 className="text-center text-xl font-extrabold">Кто у нас сегодня?</h1>
      {children.map((child) => (
        <Card
          key={child.id}
          role="button"
          tabIndex={0}
          onClick={() => pick(child)}
          onKeyDown={(e) => e.key === "Enter" && pick(child)}
          className={`ambient flex cursor-pointer items-center gap-3 p-4 ${
            child.id === activeId ? "border-primary" : ""
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-extrabold text-secondary-foreground">
            {child.name.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <span className="block font-bold">{child.name}</span>
            <span className="block text-xs text-muted-foreground">{formatAge(child.birthDate)}</span>
          </span>
        </Card>
      ))}
      <Button variant="outline" onClick={() => setCreating(true)}>
        <Plus className="h-4 w-4" /> Добавить малыша
      </Button>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent title="Новый малыш">
          <ChildForm
            familyId={familyId}
            onSaved={(child) => {
              setCreating(false);
              void useChildren.getState().refresh().then(() => pick(child));
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
