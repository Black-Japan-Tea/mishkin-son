import { useEffect, useState } from "react";

/** Тикающие «сейчас»: таймер сна пересчитывается от времени старта (решение Q20). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
