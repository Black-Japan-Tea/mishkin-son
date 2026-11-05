import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
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

  const generate = (): void => {
    setInviteError(null);
    invite()
      .then(setInviteCode)
      .catch((e: unknown) => setInviteError(e instanceof Error ? e.message : String(e)));
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="ambient">
        <CardHeader>
          <CardTitle>Тема</CardTitle>
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

      <Card className="ambient">
        <CardHeader>
          <CardTitle>Семья{family !== null ? `: ${family.name}` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="font-bold">{m.displayName}</span>
              <span className="text-xs text-muted-foreground">{m.email ?? ""}</span>
            </div>
          ))}
          {inviteCode !== null && (
            <p className="rounded-lg bg-accent px-3 py-2 text-center font-mono text-lg font-extrabold tracking-widest">
              {inviteCode}
            </p>
          )}
          {inviteError !== null && <p className="text-sm text-destructive">{inviteError}</p>}
          <Button variant="outline" onClick={generate}>
            {inviteCode === null ? "Создать код приглашения" : "Новый код"}
          </Button>
        </CardContent>
      </Card>

      <Card className="ambient">
        <CardHeader>
          <CardTitle>Синхронизация</CardTitle>
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

      <Card className="ambient">
        <CardHeader>
          <CardTitle>Данные</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => void exportJson()}>
            Экспортировать JSON
          </Button>
        </CardContent>
      </Card>

      <Card className="ambient">
        <CardHeader>
          <CardTitle>Журнал приложения</CardTitle>
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

      <Card className="ambient">
        <CardHeader>
          <CardTitle>Аккаунт</CardTitle>
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
