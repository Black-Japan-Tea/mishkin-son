import { useState } from "react";
import { Button } from "../ui/button";
import { Input, Label } from "../ui/field";
import { cn } from "../../lib/utils";
import { addChild, editChild } from "../../sync/writes";
import type { Child, ChildSex } from "../../lib/types";

interface ChildFormProps {
  familyId: string;
  initial?: Child;
  onSaved: (child: Child) => void;
}

/** Стеклянное поле Liquid Glass: полупрозрачный фон, hairline-штрих, синий фокус. */
const GLASS_FIELD = "border-stroke bg-glass-strong focus-visible:border-sleep/50";

/**
 * Сегмент пола: активная плитка подсвечивается цветом роли
 * (мальчик — сон-синий, девочка — еда-изумруд), как .types в превью.
 * sex === null — обе плитки нейтральные.
 */
function SexTile({
  selected,
  tone,
  label,
  onClick,
}: {
  selected: boolean;
  tone: "sleep" | "food";
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors",
        selected
          ? tone === "sleep"
            ? "border-sleep/40 bg-tint-sleep text-sleep"
            : "border-food/40 bg-tint-food text-food"
          : "border-stroke bg-transparent text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

/** Профиль ребёнка: имя, дата рождения, пол, вес/рост при рождении, аватар (Q9). */
export function ChildForm({ familyId, initial, onSaved }: ChildFormProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  // null = «не выбрано»: пол обязателен только при добавлении (валидация ниже)
  const [sex, setSex] = useState<ChildSex | null>(initial?.sex ?? null);
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
    // Пол обязателен только при добавлении: при редактировании сохраняем null как есть
    if (initial === undefined && sex === null) {
      setError("Укажи пол малыша");
      return;
    }
    setSaving(true);
    try {
      const patch = {
        name: name.trim(),
        birthDate,
        sex,
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
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor="ch-name" className="text-xs">
          Имя
        </Label>
        <Input id="ch-name" className={GLASS_FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder="Мишка" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ch-birth" className="text-xs">
          Дата рождения
        </Label>
        <Input id="ch-birth" className={GLASS_FIELD} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Пол</Label>
        <div className="flex gap-2">
          <SexTile selected={sex === "male"} tone="sleep" label="Мальчик" onClick={() => setSex("male")} />
          <SexTile selected={sex === "female"} tone="food" label="Девочка" onClick={() => setSex("female")} />
        </div>
      </div>
      {/* Одноколоночная сетка: длинные метки («Вес при рождении, г») переносятся по-разному
          в двух колонках, и инпуты встают не по одной линии — стек держит их ровно на любой ширине */}
      <div className="grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="ch-weight" className="text-xs">
            Вес при рождении, г
          </Label>
          <Input id="ch-weight" className={GLASS_FIELD} inputMode="numeric" value={weightG} onChange={(e) => setWeightG(e.target.value)} placeholder="3400" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="ch-height" className="text-xs">
            Рост при рождении, см
          </Label>
          <Input id="ch-height" className={GLASS_FIELD} inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="52" />
        </div>
      </div>
      <Button
        disabled={saving}
        onClick={() => void save()}
        className="bg-linear-to-b from-emerald-400 to-food text-white shadow-lg shadow-food/40 active:scale-95"
      >
        {saving ? "Сохраняю…" : initial === undefined ? "Добавить малыша" : "Сохранить"}
      </Button>
    </div>
  );
}
