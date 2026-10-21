import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input, Label } from "../components/ui/field";
import { useFamily } from "../stores/family";

export function FamilyPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { create, join } = useFamily();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const proceed = (e: React.FormEvent): void => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const action = mode === "create" ? create(name.trim()) : join(code);
    action.then(() => navigate("/", { replace: true }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(false));
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      <Card className="ambient">
        <CardHeader>
          <CardTitle>Семья</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button variant={mode === "create" ? "default" : "outline"} className="flex-1" onClick={() => setMode("create")}>
              Создать
            </Button>
            <Button variant={mode === "join" ? "default" : "outline"} className="flex-1" onClick={() => setMode("join")}>
              По коду
            </Button>
          </div>
          <form className="flex flex-col gap-3" onSubmit={proceed}>
            {error !== null && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
            )}
            {mode === "create" ? (
              <div className="flex flex-col gap-1">
                <Label htmlFor="fam-name">Название семьи</Label>
                <Input id="fam-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Семья Ивановых" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Label htmlFor="fam-code">Код приглашения</Label>
                <Input id="fam-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC123" className="uppercase" />
              </div>
            )}
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Секунду…" : mode === "create" ? "Создать семью" : "Вступить"}
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Второй родитель или бабушка вводят код, который создаст первый участник (в Настройках → Семья).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
