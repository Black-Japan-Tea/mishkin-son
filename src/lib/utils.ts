import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** id генерирует клиент — офлайн-вставки идемпотентны (решение Q49). */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // fallback для окружений без randomUUID (старые WebView)
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random()
    .toString(16)
    .slice(2)}-${Math.random().toString(16).slice(2)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
