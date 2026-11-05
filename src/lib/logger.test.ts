import { describe, expect, it } from "vitest";
import {
  LOG_CAPACITY,
  LoggerRing,
  MAX_STACK_LINES,
  MAX_STRING_LENGTH,
  sanitizeLogData,
  type LogEntryInput,
} from "./logger-ring";

function entry(overrides: Partial<LogEntryInput> = {}): LogEntryInput {
  return {
    ts: "2026-11-06T10:00:00.000Z",
    level: "warn",
    scope: "test",
    message: "событие",
    ...overrides,
  };
}

describe("LoggerRing: переполнение", () => {
  it("старые записи вытесняются при превышении ёмкости", () => {
    const ring = new LoggerRing(LOG_CAPACITY);
    const total = LOG_CAPACITY + 5;
    for (let i = 0; i < total; i++) {
      ring.push(entry({ message: `событие ${i}` }));
    }
    expect(ring.size).toBe(LOG_CAPACITY);
    const all = ring.all();
    expect(all[0]?.message).toBe("событие 5");
    expect(all.at(-1)?.message).toBe(`событие ${total - 1}`);
  });

  it("'all' возвращает копию: мутирование результата не трогает буфер", () => {
    const ring = new LoggerRing(3);
    ring.push(entry({ message: "a" }));
    const copy = [...ring.all()];
    copy.pop();
    expect(ring.size).toBe(1);
  });
});

describe("LoggerRing: дедуп подряд идущих", () => {
  it("одинаковые подряд склеиваются в одну запись со счётчиком", () => {
    const ring = new LoggerRing(10);
    for (let i = 0; i < 5; i++) {
      ring.push(entry({ ts: `2026-11-06T10:00:0${i}.000Z` }));
    }
    expect(ring.size).toBe(1);
    const record = ring.all()[0];
    expect(record?.count).toBe(5);
    expect(record?.ts).toBe("2026-11-06T10:00:04.000Z");
  });

  it("другое событие рвёт серию: повторы до и после считаются отдельно", () => {
    const ring = new LoggerRing(10);
    ring.push(entry({ message: "a" }));
    ring.push(entry({ message: "a" }));
    ring.push(entry({ message: "b" }));
    ring.push(entry({ message: "a" }));
    const all = ring.all();
    expect(all.map((r) => r.message)).toEqual(["a", "b", "a"]);
    expect(all.map((r) => r.count)).toEqual([2, 1, 1]);
  });

  it("разные данные при том же сообщении не склеиваются", () => {
    const ring = new LoggerRing(10);
    ring.push(entry({ data: { attempt: 1 } }));
    ring.push(entry({ data: { attempt: 2 } }));
    expect(ring.size).toBe(2);
  });

  it("одинаковые данные с разным порядком ключей склеиваются", () => {
    const ring = new LoggerRing(10);
    ring.push(entry({ data: { code: 5, kind: "net" } }));
    ring.push(entry({ data: { kind: "net", code: 5 } }));
    expect(ring.size).toBe(1);
  });
});

describe("LoggerRing: hydrate и clear", () => {
  it("сохранённые записи становятся старшими, буфер обрезается до ёмкости", () => {
    const ring = new LoggerRing(3);
    ring.push(entry({ message: "новый-1" }));
    ring.push(entry({ message: "новый-2" }));
    ring.hydrate([
      { ts: "t1", level: "info", scope: "old", message: "старый-1", count: 1 },
      { ts: "t2", level: "info", scope: "old", message: "старый-2", count: 1 },
      { ts: "t3", level: "info", scope: "old", message: "старый-3", count: 2 },
    ]);
    expect(ring.size).toBe(3);
    const messages = ring.all().map((r) => r.message);
    // Обрезка всегда хранит самые свежие: старейший сохранённый вытеснен первым.
    expect(messages).toEqual(["старый-3", "новый-1", "новый-2"]);
  });

  it("битые записи из хранилища отбрасываются", () => {
    const ring = new LoggerRing(10);
    ring.hydrate([
      { ts: "t", level: "warn", scope: "s", message: "ok", count: 1 },
      { ts: 123, level: "warn", scope: "s", message: "битый ts", count: 1 },
      null,
      { ts: "t", level: "ужас", scope: "s", message: "битый level", count: 1 },
    ]);
    expect(ring.size).toBe(1);
  });

  it("clear опустошает буфер", () => {
    const ring = new LoggerRing(10);
    ring.push(entry());
    ring.clear();
    expect(ring.size).toBe(0);
  });
});

describe("LoggerRing: сериализация", () => {
  it("toJSON содержит только сериализуемые поля записи", () => {
    const ring = new LoggerRing(10);
    ring.push(entry({ data: { attempt: 1 } }));
    const parsed: unknown = JSON.parse(ring.toJSON());
    expect(Array.isArray(parsed)).toBe(true);
    const first = (parsed as Record<string, unknown>[]).at(0);
    expect(Object.keys(first ?? {}).sort()).toEqual([
      "count",
      "data",
      "level",
      "message",
      "scope",
      "ts",
    ]);
    expect(first?.["count"]).toBe(1);
  });
});

describe("sanitizeLogData", () => {
  it("Error вычленяется в name/message/короткий стек", () => {
    const error = new TypeError("boom");
    const out = sanitizeLogData({ error });
    expect(out).toBeDefined();
    const described = (out as Record<string, unknown>)["error"] as Record<string, unknown>;
    expect(described["name"]).toBe("TypeError");
    expect(described["message"]).toBe("boom");
    expect(String(described["stack"]).split("\n").length).toBeLessThanOrEqual(MAX_STACK_LINES);
  });

  it("длинная строка обрезается (приватность и размер)", () => {
    const out = sanitizeLogData({ text: "x".repeat(MAX_STRING_LENGTH + 50) });
    const text = String((out as Record<string, unknown>)["text"]);
    expect(text.length).toBeLessThanOrEqual(MAX_STRING_LENGTH + 1);
    expect(text.startsWith("x".repeat(MAX_STRING_LENGTH))).toBe(true);
  });

  it("функции, циклы и bigint не ломают сериализацию", () => {
    const cyclic: Record<string, unknown> = { kind: "cycle" };
    cyclic["self"] = cyclic;
    const out = sanitizeLogData({ fn: () => 1, big: 10n, cyclic }) as Record<string, unknown>;
    expect(out["fn"]).toBe("[function]");
    expect(out["big"]).toBe("10");
    expect(((out["cyclic"] as Record<string, unknown>)["self"] as string)).toBe("[circular]");
    expect(JSON.parse(JSON.stringify(out))).toBeDefined();
  });

  it("Date превращается в ISO-строку", () => {
    const out = sanitizeLogData({ at: new Date("2026-11-06T10:00:00Z") }) as Record<string, unknown>;
    expect(out["at"]).toBe("2026-11-06T10:00:00.000Z");
  });

  it("примитив и массив оборачиваются в value, undefined даёт undefined", () => {
    expect(sanitizeLogData(undefined)).toBeUndefined();
    expect(sanitizeLogData(null)).toBeUndefined();
    expect(sanitizeLogData(42)).toEqual({ value: 42 });
    expect(sanitizeLogData(["a"])).toEqual({ value: ["a"] });
  });

  it("глубина вложенности ограничена маркером", () => {
    const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } };
    const out = sanitizeLogData(deep) as Record<string, unknown>;
    const b = out["a"] as Record<string, unknown>;
    const c = b["b"] as Record<string, unknown>;
    const d = c["c"] as Record<string, unknown>;
    // Четвёртый уровень вложенности уже за пределами MAX_DATA_DEPTH.
    expect(d["d"]).toBe("[глубина]");
  });
});
