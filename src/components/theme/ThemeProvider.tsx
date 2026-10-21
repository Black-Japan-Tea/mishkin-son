import { useEffect } from "react";
import { useSettings, resolveDarkNow } from "../../stores/settings";

/**
 * Применяет тему к <html>: 4 режима (светлая/тёмная/система/расписание).
 * Расписание проверяется каждую минуту; переход — плавный 200 мс (решения Q68–Q71).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { themeMode, scheduleStart, scheduleEnd } = useSettings();

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = (): void => {
      const dark = resolveDarkNow(themeMode, scheduleStart, scheduleEnd, media.matches);
      const root = document.documentElement;
      const changed = root.classList.contains("dark") !== dark;
      if (changed) {
        root.classList.add("theme-anim");
        root.classList.toggle("dark", dark);
        window.setTimeout(() => root.classList.remove("theme-anim"), 250);
      }
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta !== null) meta.setAttribute("content", dark ? "#17140F" : "#FAF6F0");
    };

    apply();
    media.addEventListener("change", apply);
    const timer = window.setInterval(apply, 60_000);
    return () => {
      media.removeEventListener("change", apply);
      window.clearInterval(timer);
    };
  }, [themeMode, scheduleStart, scheduleEnd]);

  return <>{children}</>;
}
