import { useState } from "react";
import { Button } from "../ui/button";
import { Input, Label } from "../ui/field";
import { Segmented } from "../ui/segmented";
import { addChild, editChild } from "../../sync/writes";
import type { Child, ChildSex } from "../../lib/types";

interface ChildFormProps {
  familyId: string;
  initial?: Child;
  onSaved: (child: Child) => void;
}

/** Профиль ребёнка: имя, дата рождения, пол, вес/рост при рождении, аватар (Q9). */
export function ChildForm({ familyId, initial, onSaved }: ChildFormProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [sex, setSex] = useState<ChildSex | "unknown">(initial?.sex ?? "unknown");
  const [weightG, setWeightG] = useState(initial?.birthWeightG !== null && initial?.birthWeightG !== undefined ? String(initial.birthWeightG) : "");
  const [heightCm, setHeightCm] = useState(initial?.birthHeightCm !== null && initial?.birthHeightCm !== undefined ? String(initial.birthHeightCm) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (): Promise<void> => {
    setError(null);
    if (name.trim() === "") {
      setError("Введи имя малыша");
      return;
    }
    if (birthDate === "") {
      setError("Укажи дату рождения");
      return;
    }
    setSaving(true);
    try {
      const patch = {
        name: name.trim(),
        birthDate,
        sex: sex === "unknown" ? null : sex,
        birthWeightG: weightG === "" ? null : Number.parseInt(weightG, 10),
        birthHeightCm: heightCm === "" ? null : Number.parseFloat(heightCm.replace(",", ".")),
      };
      const child =
        initial === undefined
          ? await addChild({ familyId, ...patch })
          : await editChild(initial.id, patch);
      if (child !== undefined) onSaved(child);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error !== null && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor="ch-name">Имя</Label>
        <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Мишка" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ch-birth">Дата рождения</Label>
        <Input id="ch-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Пол</Label>
        <Segmented
          value={sex}
          onChange={setSex}
          options={[
            { value: "male", label: "Мальчик" },
            { value: "female", label: "Девочка" },
            { value: "unknown", label: "Пока скрыть" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="ch-weight">Вес при рождении, г</Label>
          <Input id="ch-weight" inputMode="numeric" value={weightG} onChange={(e) => setWeightG(e.target.value)} placeholder="3400" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="ch-height">Рост при рождении, см</Label>
          <Input id="ch-height" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="52" />
        </div>
      </div>
      <Button disabled={saving} onClick={() => void save()}>
        {saving ? "Сохраняю…" : initial === undefined ? "Добавить малыша" : "Сохранить"}
      </Button>
    </div>
  );
}
