import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, RefreshCw, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input, Label } from "../components/ui/field";
import { Segmented } from "../components/ui/segmented";
import { useAuth } from "../stores/auth";
import { useFamily } from "../stores/family";
import { useSettings } from "../stores/settings";
import { useSyncStatus } from "../sync/status";
import { refreshPendingCount, syncNow } from "../sync/engine";
import { exportJson } from "../lib/export";
import { clearLog, exportLog } from "../lib/logger";

/** Стеклянная карточка Liquid Glass: радиус 24, hairline-штрих и блюр из .glass. */
const GLASS_CARD = "glass rounded-3xl";

const THEME_OPTIONS = [
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
  { value: "system", label: "Системная" },
  { value: "schedule", label: "По часам" },
] as const;

/** Скачивание журнала: тот же механизм, что у экспорта данных (lib/export.ts). */
function downloadLog(json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mishkin-log-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Настройки: тема, семья, синк, экспорт, аккаунт (план §7.5). */
export function SettingsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { email, signOut } = useAuth();
  const { themeMode, scheduleStart, scheduleEnd, setThemeMode, setSchedule } = useSettings();
  const { family, members, invite } = useFamily();
  const sync = useSyncStatus();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === "function";

  const generate = (): void => {
    setInviteError(null);
    invite()
      .then(setInviteCode)
      .catch((e: unknown) => setInviteError(e instanceof Error ? e.message : String(e)));
  };

  const copyCode = (): void => {
    if (inviteCode === null) return;
    navigator.clipboard
      .writeText(inviteCode)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setInviteError("Не удалось скопировать — выдели код и скопируй вручную"));
  };

  const shareCode = (): void => {
    if (inviteCode === null) return;
    void navigator
      .share({
        title: "Мишкин сон",
        text: `Мой код для нашей семьи: ${inviteCode}. В приложении выбери «Семья → По коду».`,
      })
      .catch(() => {});
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className={GLASS_CARD}>
        <CardHeader>
          <CardTitle className="font-extrabold">Тема</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Segmented value={themeMode} onChange={(v) => void setThemeMode(v)} options={THEME_OPTIONS} />
          {themeMode === "schedule" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="th-start">Тёмная с</Label>
                <Input
                  id="th-start"
                  type="time"
                  value={scheduleStart}
                  onChange={(e) => void setSchedule(e.target.value, scheduleEnd)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="th-end">до</Label>
                <Input
                  id="th-end"
                  type="time"
                  value={scheduleEnd}
                  onChange={(e) => void setSchedule(scheduleStart, e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={GLASS_CARD}>
        <CardHeader>
          <CardTitle className="font-extrabold">Семья{family !== null ? `: ${family.name}` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between gap-2 rounded-xl border border-stroke bg-glass-strong px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-bold">{m.displayName}</span>
              <span className="min-w-0 truncate text-xs text-muted-foreground">{m.email ?? ""}</span>
            </div>
          ))}
          {inviteCode !== null && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-stroke bg-glass-strong px-3 py-4">
              <span className="text-xs text-muted-foreground">Код действует 24 часа</span>
              <p className="select-all font-mono text-4xl font-extrabold tracking-[0.35em]">
                {inviteCode}
              </p>
              <div className="mt-1 flex w-full gap-2">
                <Button className="flex-1" onClick={copyCode}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Скопировать
                    </>
                  )}
                </Button>
                {canShare && (
                  <Button variant="outline" className="flex-1" onClick={shareCode}>
                    <Share2 className="h-4 w-4" />
                    Поделиться
                  </Button>
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Отправь код близкому: он зарегистрируется в приложении, на экране «Семья»
                выберет «По коду», введёт код — и увидит того же малыша.
              </p>
            </div>
          )}
          {inviteError !== null && <p className="text-sm text-destructive">{inviteError}</p>}
          <Button variant="outline" onClick={generate}>
            {inviteCode === null ? "Создать код приглашения" : "Новый код"}
          </Button>
        </CardContent>
      </Card>

      <Card className={GLASS_CARD}>
        <CardHeader>
          <CardTitle className="font-extrabold">Синхронизация</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">
            {sync.configState === "unconfigured"
              ? "Облако не настроено — заполни .env (см. README)."
              : sync.online
                ? "Онлайн"
                : "Офлайн — события сохраняются локально"}
          </p>
          <p className="text-muted-foreground">
            Не синхронизировано: {sync.pending}
            {sync.lastSyncAt !== null && ` · последний синк ${new Date(sync.lastSyncAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
          {sync.error !== null && <p className="text-destructive">{sync.error}</p>}
          <Button
            variant="outline"
            disabled={sync.syncing}
            onClick={() => {
              void syncNow().then(refreshPendingCount);
            }}
          >
            <RefreshCw className={sync.syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Синхронизировать
          </Button>
        </CardContent>
      </Card>

      <Card className={GLASS_CARD}>
        <CardHeader>
          <CardTitle className="font-extrabold">Данные</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => void exportJson()}>
            Экспортировать JSON
          </Button>
        </CardContent>
      </Card>

      <Card className={GLASS_CARD}>
        <CardHeader>
          <CardTitle className="font-extrabold">Журнал приложения</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">
            Последние 200 событий приложения; без личных данных.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void exportLog().then(downloadLog)}
          >
            Экспорт журнала
          </Button>
          <Button variant="outline" className="w-full" onClick={() => void clearLog()}>
            Очистить журнал
          </Button>
        </CardContent>
      </Card>

      <Card className={GLASS_CARD}>
        <CardHeader>
          <CardTitle className="font-extrabold">Аккаунт</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">{email ?? ""}</p>
          <Button
            variant="destructive"
            onClick={() => {
              void signOut().then(() => navigate("/login", { replace: true }));
            }}
          >
            Выйти
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
