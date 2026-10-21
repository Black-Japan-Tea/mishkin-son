import { Input, Label, Textarea } from "../ui/field";
import { Segmented } from "../ui/segmented";
import type { DetailsState } from "./details";
import type { EventType } from "../../lib/types";

interface EventDetailsFieldsProps {
  type: EventType;
  details: DetailsState;
  patch: (patch: Partial<DetailsState>) => void;
}

/** Поля деталей по типу события (сон/грудь/бутылочка/прикорм/вода/подгузник). */
export function EventDetailsFields({ type, details, patch }: EventDetailsFieldsProps): React.JSX.Element | null {
  switch (type) {
    case "sleep":
      return (
        <div className="flex flex-col gap-3">
          <Label>День или ночь</Label>
          <Segmented
            value={details.dayTag}
            onChange={(dayTag) => patch({ dayTag })}
            options={[{ value: "day", label: "День" }, { value: "night", label: "Ночь" }]}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="ev-place">Место (необязательно)</Label>
            <Input
              id="ev-place"
              value={details.place}
              onChange={(e) => patch({ place: e.target.value })}
              placeholder="Кроватка, коляска…"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ev-note">Заметка</Label>
            <Textarea id="ev-note" value={details.note} onChange={(e) => patch({ note: e.target.value })} />
          </div>
        </div>
      );
    case "feed_breast":
      return (
        <>
          <Label>Сторона</Label>
          <Segmented
            value={details.side}
            onChange={(side) => patch({ side })}
            options={[
              { value: "left", label: "Лево" },
              { value: "right", label: "Право" },
              { value: "both", label: "Обе" },
            ]}
          />
        </>
      );
    case "feed_bottle":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ev-ml">Объём, мл</Label>
            <Input
              id="ev-ml"
              inputMode="numeric"
              value={details.ml}
              onChange={(e) => patch({ ml: e.target.value })}
              placeholder="120"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Тип</Label>
            <Segmented
              value={details.kind}
              onChange={(kind) => patch({ kind })}
              options={[
                { value: "formula", label: "Смесь" },
                { value: "milk", label: "Сцеженное" },
              ]}
            />
          </div>
        </div>
      );
    case "feed_solid":
      return (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ev-food">Что ел</Label>
            <Input
              id="ev-food"
              value={details.food}
              onChange={(e) => patch({ food: e.target.value })}
              placeholder="Кабачок…"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ev-note">Заметка</Label>
            <Textarea id="ev-note" value={details.note} onChange={(e) => patch({ note: e.target.value })} />
          </div>
        </>
      );
    case "feed_water":
      return (
        <div className="flex flex-col gap-1">
          <Label htmlFor="ev-water">Объём, мл</Label>
          <Input
            id="ev-water"
            inputMode="numeric"
            value={details.waterMl}
            onChange={(e) => patch({ waterMl: e.target.value })}
            placeholder="50"
          />
        </div>
      );
    case "diaper":
      return (
        <Segmented
          value={details.diaperKind}
          onChange={(diaperKind) => patch({ diaperKind })}
          options={[
            { value: "pee", label: "Попис" },
            { value: "poop", label: "Кака" },
            { value: "both", label: "И то и то" },
          ]}
        />
      );
  }
}
