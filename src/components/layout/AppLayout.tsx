import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Baby, BarChart3, CalendarDays, CloudOff, House, RefreshCw, Settings, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatAge } from "../../lib/time";
import { useChildren } from "../../stores/children";
import { useSyncStatus } from "../../sync/status";

const TABS = [
  { to: "/", label: "Главная", icon: House },
  { to: "/history", label: "История", icon: CalendarDays },
  { to: "/stats", label: "Статистика", icon: BarChart3 },
  { to: "/tips", label: "Советы", icon: Sparkles },
  { to: "/child", label: "Профиль", icon: Baby },
] as const;

export function AppLayout(): React.JSX.Element {
  const navigate = useNavigate();
  const { children, activeId } = useChildren();
  const sync = useSyncStatus();
  const active = children.find((c) => c.id === activeId) ?? null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 bg-background/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate("/children")}
          className="flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-1.5 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
            {active === null ? "?" : active.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold">{active === null ? "Выбери малыша" : active.name}</span>
            {active !== null && (
              <span className="text-xs text-muted-foreground">
                {formatAge(active.birthDate, new Date())}
              </span>
            )}
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Синхронизация"
            onClick={() => navigate("/settings")}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            {sync.configState === "unconfigured" ? (
              <CloudOff className="h-5 w-5 text-warning" />
            ) : sync.syncing ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <span className={cn("block h-2.5 w-2.5 rounded-full", sync.online ? "bg-success" : "bg-destructive")} />
            )}
          </button>
          <button
            type="button"
            aria-label="Настройки"
            onClick={() => navigate("/settings")}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
