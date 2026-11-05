/**
 * Чистая синхронная логика журнала приложения: кольцевой буфер фиксированной ёмкости,
 * склейка подряд идущих одинаковых записей и санитизация данных.
 * Без IndexedDB и DOM — полностью тестируется в изоляции (см. logger.test.ts).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Ёмкость кольца (требование Ф5: ~200 последних событий). */
export const LOG_CAPACITY = 200;
/** Приватность: длинные строки обрезаем — в журнале не место пользовательскому контенту. */
export const MAX_STRING_LENGTH = 300;
/** Сколько первых строк стека ошибки сохраняем (диагностики достаточно, мусора меньше). */
export const MAX_STACK_LINES = 3;

const MAX_DATA_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;

export interface LogRecord {
  /** ISO-время последнего occurrence (при склейке повторов обновляется). */
  ts: string;
  level: LogLevel;
  scope: string;
  message: string;
  /** Сколько подряд одинаковых событий склеено в запись (1 = единичное событие). */
  count: number;
  /** Уже санитизированные данные: без функций, циклов, огромных строк. */
  data?: Record<string, unknown>;
}

export interface LogEntryInput {
  ts: string;
  level: LogLevel;
  scope: string;
  message: string;
  data?: Record<string, unknown>;
}

export class LoggerRing {
  private items: LogRecord[] = [];

  constructor(private readonly capacity: number = LOG_CAPACITY) {}

  get size(): number {
    return this.items.length;
  }

  /** Копия буфера, старые → новые: наружу отдаём копию, чтобы буфер не мутировали. */
  all(): readonly LogRecord[] {
    return [...this.items];
  }

  /**
   * Добавить запись. Подряд идущие одинаковые события (уровень + scope + сообщение + данные)
   * склеиваются в одну запись с инкрементом count — зациклившаяся ошибка не заспамит буфер.
   */
  push(input: LogEntryInput): LogRecord {
    const last = this.items.at(-1);
    if (last !== undefined && isSameEvent(last, input)) {
      last.count += 1;
      last.ts = input.ts;
      return last;
    }
    const record: LogRecord = {
      ts: input.ts,
      level: input.level,
      scope: input.scope,
      message: input.message,
      count: 1,
      ...(input.data !== undefined ? { data: input.data } : {}),
    };
    this.items.push(record);
    if (this.items.length > this.capacity) this.items.shift();
    return record;
  }

  /**
   * Дозагрузка сохранённых записей при старте. Сохранённые всегда старше того, что успело
   * накопиться в памяти до открытия IndexedDB, поэтому просто подклеиваем их спереди.
   */
  hydrate(persisted: unknown[]): void {
    this.items = [...persisted.filter(isValidRecord), ...this.items].slice(-this.capacity);
  }

  clear(): void {
    this.items = [];
  }

  toJSON(): string {
    return JSON.stringify(this.items);
  }
}

/**
 * Санитизация данных записи: вычленяет из Error имя/сообщение/короткий стек, снимает
 * функции, циклы, Date → ISO, длинные строки обрезает. Для пустых данных — undefined.
 */
export function sanitizeLogData(data: unknown): Record<string, unknown> | undefined {
  if (data === undefined || data === null) return undefined;
  if (data instanceof Error) return { error: describeError(data) };
  if (typeof data === "object" && !Array.isArray(data)) {
    return sanitizeValue(data, new WeakSet(), 0) as Record<string, unknown>;
  }
  return { value: sanitizeValue(data, new WeakSet(), 0) };
}

/** Краткое описание ошибки: только имя, сообщение и первые строки стека. */
export function describeError(e: Error): Record<string, unknown> {
  const stack =
    typeof e.stack === "string" && e.stack !== ""
      ? e.stack.split("\n").slice(0, MAX_STACK_LINES).join("\n").trim()
      : undefined;
  return { name: e.name, message: truncate(e.message), ...(stack !== undefined ? { stack } : {}) };
}

function truncate(s: string): string {
  return s.length > MAX_STRING_LENGTH ? `${s.slice(0, MAX_STRING_LENGTH)}…` : s;
}

function isSameEvent(a: LogRecord, b: LogEntryInput): boolean {
  return (
    a.level === b.level &&
    a.scope === b.scope &&
    a.message === b.message &&
    stableKey(a.data) === stableKey(b.data)
  );
}

function stableKey(data: Record<string, unknown> | undefined): string {
  return data === undefined ? "" : stringifyStable(data, new WeakSet());
}

/** Детерминированная сериализация для сравнения: ключи отсортированы, циклы — маркер. */
function stringifyStable(value: unknown, seen: WeakSet<object>): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (seen.has(value)) return '"[circular]"';
  seen.add(value);
  const parts = Array.isArray(value)
    ? value.map((v) => stringifyStable(v, seen))
    : Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${JSON.stringify(k)}:${stringifyStable(v, seen)}`);
  seen.delete(value);
  return Array.isArray(value) ? `[${parts.join(",")}]` : `{${parts.join(",")}}`;
}

function sanitizeValue(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (value === null) return null;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "function") return "[function]";
  if (typeof value === "undefined") return undefined;
  // bigint не переживает JSON.stringify, symbol не сериализуем — приводим к строке.
  if (typeof value === "bigint" || typeof value === "symbol") return String(value);
  if (typeof value !== "object") return value; // number | boolean остаются как есть
  if (seen.has(value)) return "[circular]";
  if (value instanceof Error) return describeError(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Set) return sanitizeValue(Array.from(value), seen, depth);
  if (value instanceof Map) return sanitizeValue(Array.from(value.entries()), seen, depth);
  if (depth >= MAX_DATA_DEPTH) return "[глубина]";
  seen.add(value);
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((v) => sanitizeValue(v, seen, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) items.push(`[ещё ${value.length - MAX_ARRAY_ITEMS}]`);
    seen.delete(value);
    return items;
  }
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    const sanitized = sanitizeValue(v, seen, depth + 1);
    if (sanitized !== undefined) out[truncate(key)] = sanitized;
  }
  seen.delete(value);
  return out;
}

function isLogLevel(v: unknown): v is LogLevel {
  return v === "debug" || v === "info" || v === "warn" || v === "error";
}

/** Защита от битых записей из хранилища: битое отбрасываем, а не роняем старт. */
function isValidRecord(r: unknown): r is LogRecord {
  if (typeof r !== "object" || r === null) return false;
  const rec = r as Record<string, unknown>;
  return (
    typeof rec.ts === "string" &&
    isLogLevel(rec.level) &&
    typeof rec.scope === "string" &&
    typeof rec.message === "string" &&
    typeof rec.count === "number" &&
    Number.isFinite(rec.count)
  );
}
