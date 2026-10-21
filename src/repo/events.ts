import { getDb } from "../lib/db";
import { dayKeyOf } from "../lib/time";
import { newId, nowIso } from "../lib/utils";
import type { AppEvent, BreastEvent, EventType, SleepEvent } from "../lib/types";

type AppEventOfType<T extends EventType> = Extract<AppEvent, { type: T }>;

export interface CreateEventInput<T extends EventType = EventType> {
  childId: string;
  familyId: string;
  createdBy: string;
  type: T;
  /** ISO UTC; по умолчанию — сейчас */
  startedAt?: string;
  endedAt?: string | null;
  parentEventId?: string | null;
  details: AppEventOfType<T>["details"];
}

export async function createEvent<T extends EventType>(
  input: CreateEventInput<T>,
): Promise<AppEventOfType<T>> {
  const db = await getDb();
  const now = nowIso();
  // Соответствие details типу события гарантирует дженерик CreateEventInput.
  const event = {
    id: newId(),
    childId: input.childId,
    familyId: input.familyId,
    createdBy: input.createdBy,
    startedAt: input.startedAt ?? now,
    endedAt: input.endedAt ?? null,
    parentEventId: input.parentEventId ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    type: input.type,
    details: input.details,
  } as AppEventOfType<T>;
  await db.put("events", event);
  return event;
}

export async function updateEvent(
  id: string,
  patch: Partial<Omit<AppEvent, "id" | "createdAt">>,
): Promise<AppEvent | undefined> {
  const db = await getDb();
  const existing = await db.get("events", id);
  if (existing === undefined) return undefined;
  const updated = { ...existing, ...patch, updatedAt: nowIso() } as AppEvent;
  await db.put("events", updated);
  return updated;
}

/** Soft-delete: tombstone обязателен для офлайн-синка (см. план §17). */
export async function deleteEvent(id: string): Promise<AppEvent | undefined> {
  const db = await getDb();
  const existing = await db.get("events", id);
  if (existing === undefined) return undefined;
  const deleted = { ...existing, deletedAt: nowIso(), updatedAt: nowIso() } as AppEvent;
  await db.put("events", deleted);
  return deleted;
}

export async function getEvent(id: string): Promise<AppEvent | undefined> {
  const db = await getDb();
  return db.get("events", id);
}

export async function putEventLww(event: AppEvent): Promise<void> {
  const db = await getDb();
  const existing = await db.get("events", event.id);
  if (existing === undefined || existing.updatedAt < event.updatedAt) {
    await db.put("events", event);
  }
}

export function isLive(e: AppEvent): boolean {
  return e.deletedAt === null;
}

export async function getEventsForChild(childId: string): Promise<AppEvent[]> {
  const db = await getDb();
  const range = IDBKeyRange.bound([childId, ""], [childId, "\uffff"]);
  const all = await db.getAllFromIndex("events", "by-child-start", range);
  return all.filter(isLive);
}

export async function getActiveSleep(childId: string): Promise<SleepEvent | undefined> {
  const events = await getEventsForChild(childId);
  return events.find(
    (e): e is SleepEvent => e.type === "sleep" && e.endedAt === null,
  );
}

export async function getActiveBreastFeed(childId: string): Promise<BreastEvent | undefined> {
  const events = await getEventsForChild(childId);
  return events.find(
    (e): e is BreastEvent => e.type === "feed_breast" && e.endedAt === null,
  );
}

/** Дневная лента: вложенные ночные кормления показываем рядом с родительским сном. */
export async function getEventsForDay(childId: string, dayKey: string): Promise<AppEvent[]> {
  const events = await getEventsForChild(childId);
  return events.filter((e) => dayKeyOf(e.startedAt) === dayKey);
}

export async function getEventsRange(
  childId: string,
  fromIso: string,
  toIso: string,
): Promise<AppEvent[]> {
  const events = await getEventsForChild(childId);
  return events.filter((e) => e.startedAt >= fromIso && e.startedAt <= toIso);
}
