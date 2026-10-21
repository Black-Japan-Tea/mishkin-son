import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

/** «1 ч 47 мин» / «47 мин» — формат таймера сна (решение Q18). */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} мин`;
  return `${h} ч ${m} мин`;
}

export function formatClock(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "d MMMM", { locale: ru });
}

/** Локальный ключ дня 'YYYY-MM-DD' — группировка событий по локальной дате (Q50/Q51). */
export function dayKeyOf(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

export function dayKeyOfDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Возраст «3 нед 4 д» → «4 мес 12 д» (решение Q10). */
export function formatAge(birthDate: string, now: Date = new Date()): string {
  const birth = parseISO(birthDate);
  const days = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
  if (days < 14) return `${days} дн`;
  if (days < 60) {
    const w = Math.floor(days / 7);
    const d = days % 7;
    return d === 0 ? `${w} нед` : `${w} нед ${d} д`;
  }
  const months = Math.floor(days / 30.4375);
  const d = days - Math.floor(months * 30.4375);
  return d === 0 ? `${months} мес` : `${months} мес ${Math.floor(d)} д`;
}

export function ageInMonths(birthDate: string, now: Date = new Date()): number {
  const birth = parseISO(birthDate);
  return Math.max(0, (now.getTime() - birth.getTime()) / (86400000 * 30.4375));
}

/** «22:00» → 1320 минут от начала суток. */
export function hhmmToMinutes(v: string): number {
  const [h, m] = v.split(":");
  const hour = Number.parseInt(h ?? "0", 10);
  const min = Number.parseInt(m ?? "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(min)) return 0;
  return hour * 60 + min;
}
