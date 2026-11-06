import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input, Label } from "../components/ui/field";
import { useAuth } from "../stores/auth";

/** Стеклянное поле Liquid Glass: полупрозрачный фон, штрих var(--stroke), синий фокус. */
const GLASS_FIELD = "border-stroke bg-glass-strong focus-visible:border-sleep/50";

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    signIn(email.trim(), password)
      .then(() => navigate("/", { replace: true }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(false));
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      {/* Логотип и название — над стеклянной карточкой, как в превью */}
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tint-sleep">
          <Moon className="h-7 w-7 text-sleep" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Мишкин сон</h1>
          <p className="text-sm text-muted-foreground">Суточный трекер малыша</p>
        </div>
      </div>
      <Card className="glass rounded-4xl">
        <CardHeader>
          <CardTitle className="font-extrabold">Вход</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            {error !== null && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
            )}
            <div className="flex flex-col gap-1">
              <Label htmlFor="email" className="text-xs">
                Email
              </Label>
              <Input
                id="email"
                className={GLASS_FIELD}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="password" className="text-xs">
                Пароль
              </Label>
              <Input
                id="password"
                className={GLASS_FIELD}
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {/* Основное действие: изумруд-градиент «еда» + пружина нажатия */}
            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className="mt-1 bg-linear-to-b from-emerald-400 to-food text-white shadow-lg shadow-food/40 active:scale-95"
            >
              {busy ? "Вхожу…" : "Войти"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link to="/register" className="font-bold text-primary">
              Зарегистрироваться
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
