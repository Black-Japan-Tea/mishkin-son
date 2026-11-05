/**
 * Единый журнал приложения (Ф5): уровни debug/info/warn/error, зеркало в console,
 * кольцевой буфер ~200 записей с фоновой записью в IndexedDB.
 * Приватность: в журнал попадают только идентификаторы, коды ошибок и счётчики —
 * санитизация в logger-ring; имена/тексты пользователя сюда не передавать.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  LOG_CAPACITY,
  LoggerRing,
  sanitizeLogData,
  type LogLevel,
  type LogRecord,
} from "./logger-ring";

/** Отдельная БД и собственное соединение: lib/db.ts намеренно не трогаем. */
interface LogDbSchema extends DBSchema {
  log: { key: string; value: LogBufferValue };
}

interface LogBufferValue {
  key: string;
  records: readonly LogRecord[];
}

const DB_NAME = "mishkin-son-log";
const BUFFER_KEY = "ring";
/** Флаш пачкой с задержкой: частые записи не блокируют UI. */
const FLUSH_DELAY_MS = 400;

const ring = new LoggerRing(LOG_CAPACITY);

let dbPromise: Promise<IDBPDatabase<LogDbSchema>> | null = null;
let initPromise: Promise<void> | null = null;
let storageReady = false;
let handlersInstalled = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getLogDb(): Promise<IDBPDatabase<LogDbSchema>> {
  if (dbPromise === null) {
    dbPromise = openDB<LogDbSchema>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore("log");
      },
    });
  }
  return dbPromise;
}

/** Идемпотентная инициализация: открыть БД, дозагрузить буфер, досбросить накопленное. */
export function initLogger(): Promise<void> {
  if (initPromise !== null) return initPromise;
  initPromise = (async () => {
    try {
      const db = await getLogDb();
      const stored = await db.get("log", BUFFER_KEY);
      if (stored !== undefined && Array.isArray(stored.records)) {
        ring.hydrate([...stored.records]);
      }
      storageReady = true;
      await flushNow();
    } catch (e) {
      // Журнал не критичен: приложение живёт, записи остаются только в памяти.
      console.warn("Журнал: хранилище недоступно, записи только в памяти:", e);
    }
  })();
  return initPromise;
}

function logDebug(scope: string, message: string, data?: unknown): void {
  write("debug", scope, message, data);
}

function logInfo(scope: string, message: string, data?: unknown): void {
  write("info", scope, message, data);
}

function logWarn(scope: string, message: string, data?: unknown): void {
  write("warn", scope, message, data);
}

function logError(scope: string, message: string, data?: unknown): void {
  write("error", scope, message, data);
}

export { logDebug, logInfo, logWarn, logError };

function write(level: LogLevel, scope: string, message: string, data?: unknown): void {
  ring.push({
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    data: sanitizeLogData(data),
  });
  // В devtools отдаём сырые данные (включая живой Error) — диагностика не теряется.
  mirrorToConsole(level, scope, message, data);
  scheduleFlush();
}

const CONSOLE_BY_LEVEL: Record<LogLevel, (message: string, data?: unknown) => void> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function mirrorToConsole(level: LogLevel, scope: string, message: string, data: unknown): void {
  const print = CONSOLE_BY_LEVEL[level];
  if (data === undefined) print(`[${scope}] ${message}`);
  else print(`[${scope}] ${message}`, data);
}

/** Глобальные перехватчики: необработанные ошибки окна и отказы промисов. */
export function installGlobalErrorHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;
  window.addEventListener("error", (event) => {
    const detail =
      event.error instanceof Error
        ? { error: event.error }
        : {
            ...(event.filename !== "" ? { source: `${event.filename}:${event.lineno}:${event.colno}` } : {}),
          };
    logError("window", event.message === "" ? "Необработанная ошибка окна" : event.message, detail);
  });
  window.addEventListener("unhandledrejection", (event) => {
    logError("window", "Необработанный отказ промиса", { reason: event.reason });
  });
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushNow();
  }, FLUSH_DELAY_MS);
}

async function flushNow(): Promise<void> {
  if (!storageReady) return; // хранилище ещё не открылось — досинхронизирует initLogger
  try {
    const db = await getLogDb();
    await db.put("log", { key: BUFFER_KEY, records: ring.all() }, BUFFER_KEY);
  } catch (e) {
    console.warn("Журнал: запись в хранилище не удалась:", e);
  }
}

/** JSON для экспорта: «Настройки → Журнал приложения» скачивает его как файл. */
export async function exportLog(): Promise<string> {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      records: ring.all(),
    },
    null,
    2,
  );
}

/** Очистка буфера и хранилища (журнал не критичен — подтверждение не требуется). */
export async function clearLog(): Promise<void> {
  ring.clear();
  try {
    const db = await getLogDb();
    await db.put("log", { key: BUFFER_KEY, records: [] }, BUFFER_KEY);
  } catch (e) {
    console.warn("Журнал: не удалось очистить хранилище:", e);
  }
}
