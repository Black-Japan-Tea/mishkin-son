import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input, Label } from "../components/ui/field";
import { ConfirmEmailError, useAuth } from "../stores/auth";

export function RegisterPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { signUp, recheck } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    signUp(email.trim(), password)
      .then(() => navigate("/", { replace: true }))
      .catch((err: unknown) => {
        if (err instanceof ConfirmEmailError) {
          setAwaitingConfirm(true);
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => setBusy(false));
  };

  if (awaitingConfirm) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center p-4">
        <Card className="ambient w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-secondary" /> Подтверди email
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>Мы отправили письмо на {email}. Перейди по ссылке из письма, затем продолжи.</p>
            <Button
              onClick={() =>
                recheck()
                  .then(() => navigate("/", { replace: true }))
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
              }
            >
              Я подтвердил — продолжить
            </Button>
            {error !== null && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 font-semibold text-destructive">{error}</p>
            )}
            <Link to="/login" className="text-center text-muted-foreground underline">
              Вход
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      <Card className="ambient">
        <CardHeader>
          <CardTitle>Регистрация</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            {error !== null && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
            )}
            <div className="flex flex-col gap-1">
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="reg-password">Пароль (от 6 символов)</Label>
              <Input id="reg-password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Создаю…" : "Создать аккаунт"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="font-bold text-primary">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
