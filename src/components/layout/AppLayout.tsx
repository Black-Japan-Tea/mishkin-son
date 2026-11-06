import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Baby,
  BarChart3,
  CalendarDays,
  CloudOff,
  House,
  Moon,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { formatAge } from "../../lib/time";
import { useChildren } from "../../stores/children";
import { useSyncStatus } from "../../sync/status";
import { resolveDarkNow, useSettings } from "../../stores/settings";

const TABS = [
  { to: "/stats", label: "Статистика", icon: BarChart3 },
  { to: "/history", label: "История", icon: CalendarDays },
  { to: "/", label: "Главная", icon: House },
  { to: "/tips", label: "Советы", icon: Sparkles },
  { to: "/child", label: "Профиль", icon: Baby },
] as const;

/** Активный таб: «/» — только точное совпадение, остальные — по префиксу. */
function isActiveTab(to: string, pathname: string): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

/** Плавающий стеклянный док со скользящей пилюлей (эталон v1-liquid-glass). */
function Dock(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  const activeIndex = TABS.findIndex((t) => isActiveTab(t.to, location.pathname));

  const movePill = useCallback((): void => {
    const button = buttonRefs.current[activeIndex] ?? null;
    if (button !== null) setPill({ left: button.offsetLeft, width: button.offsetWidth });
  }, [activeIndex]);

  // Позиция пилюли: сразу, после кадра, при загрузке/ресайзе и после загрузки шрифтов
  useEffect(() => {
    movePill();
    const raf = window.requestAnimationFrame(movePill);
    const reposition = (): void => movePill();
    window.addEventListener("load", reposition);
    window.addEventListener("resize", reposition);
    void document.fonts.ready.then(reposition);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("load", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [movePill]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom))] z-40">
      <div className="pointer-events-auto mx-auto max-w-md px-[22px]">
        <nav
          aria-label="Основная навигация"
          className="glass relative flex h-16 items-center rounded-full p-1.5"
        >
          <span
            aria-hidden="true"
            className="glass-strong absolute inset-y-1.5 rounded-full transition-[left,width] duration-500 ease-[cubic-bezier(0.3,1.3,0.4,1)]"
            style={{ left: pill.left, width: pill.width }}
          />
          {TABS.map(({ to, label, icon: Icon }, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={to}
                type="button"
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(to)}
                className={cn(
                  "relative z-[1] flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-bold transition-[color,transform] duration-300 active:scale-[0.92]",
                  active ? "text-sleep" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function AppLayout(): React.JSX.Element {
  const navigate = useNavigate();
  const { children, activeId } = useChildren();
  const sync = useSyncStatus();
  const active = children.find((c) => c.id === activeId) ?? null;

  // Быстрая смена темы: цикл light↔dark поверх любых режимов (system/schedule перекрываются)
  const { themeMode, scheduleStart, scheduleEnd, setThemeMode } = useSettings();
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent): void => setSystemDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  const dark = resolveDarkNow(themeMode, scheduleStart, scheduleEnd, systemDark);

  // Шапка усиливает блюр/тень, когда контент уходит под неё
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerStyle = scrolled
    ? {
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        boxShadow:
          dark
            ? "0 14px 44px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.07)"
            : "0 14px 44px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.28)",
      }
    : undefined;

  const iconButtonClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] glass-strong border border-stroke transition-transform duration-150 active:scale-90";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col pt-2.5">
      <header
        className={cn(
          "glass sticky top-0 z-40 mx-3.5 flex items-center gap-2.5 rounded-[22px] px-3 py-2.5 transition-shadow duration-300",
        )}
        style={headerStyle}
      >
        <button
          type="button"
          onClick={() => navigate("/children")}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[14px] bg-tint-sleep text-[15px] font-extrabold text-sleep">
            {active === null ? "?" : active.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold">
              {active === null ? "Выбери малыша" : active.name}
            </span>
            {active !== null && (
              <span className="block truncate text-xs text-muted-foreground">
                {formatAge(active.birthDate, new Date())}
              </span>
            )}
          </span>
        </button>

        {/* Точка синка: зелёное свечение — ок, спиннер — синк идёт, туча — конфиг не задан */}
        <span
          title="Синхронизация"
          className="flex h-9 w-9 shrink-0 items-center justify-center"
        >
          {sync.configState === "unconfigured" ? (
            <CloudOff className="h-[18px] w-[18px] text-warning" />
          ) : sync.syncing ? (
            <RefreshCw className="h-[18px] w-[18px] animate-spin text-muted-foreground" />
          ) : (
            <span
              className={cn(
                "block h-2 w-2 rounded-full",
                sync.online
                  ? "bg-food shadow-[0_0_10px_var(--food)]"
                  : "bg-destructive shadow-[0_0_10px_var(--destructive)]",
              )}
            />
          )}
        </span>

        <button
          type="button"
          aria-label="Сменить тему"
          onClick={() => {
            void setThemeMode(dark ? "light" : "dark");
          }}
          className={iconButtonClass}
        >
          {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <button
          type="button"
          aria-label="Настройки"
          onClick={() => navigate("/settings")}
          className={iconButtonClass}
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </header>

      {/* Нижний отступ 120px — воздух под плавающим доком (эталон main) */}
      <main className="relative z-[2] flex-1 px-3.5 pb-[120px] pt-3">
        <Outlet />
      </main>

      <Dock />
    </div>
  );
}
