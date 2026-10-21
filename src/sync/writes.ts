import { createChild, updateChild, type NewChildInput } from "../repo/children";
import { createMeasurement, deleteMeasurement } from "../repo/measurements";
import { createEvent, deleteEvent, updateEvent, type CreateEventInput } from "../repo/events";
import * as outbox from "../repo/outbox";
import { toDbChild, toDbEvent, toDbMeasurement } from "../lib/mappers";
import type { AppEvent, Child, EventType, MeasurementType } from "../lib/types";
import { syncNow } from "./engine";

/** Единая точка записи: локально → outbox → попытка синка. UI инвалидирует запросы. */

function fireSync(): void {
  void syncNow();
}

export interface AddEventInput<T extends EventType = EventType> extends CreateEventInput<T> {}

export async function addEvent<T extends EventType>(input: AddEventInput<T>): Promise<AppEvent> {
  const event = await createEvent(input);
  await outbox.enqueue("events", toDbEvent(event));
  fireSync();
  return event;
}

export async function editEvent(
  id: string,
  patch: Partial<Omit<AppEvent, "id" | "createdAt">>,
): Promise<AppEvent | undefined> {
  const event = await updateEvent(id, patch);
  if (event !== undefined) {
    await outbox.enqueue("events", toDbEvent(event));
    fireSync();
  }
  return event;
}

export async function removeEvent(id: string): Promise<void> {
  const event = await deleteEvent(id);
  if (event !== undefined) {
    await outbox.enqueue("events", toDbEvent(event));
    fireSync();
  }
}

export async function addChild(input: NewChildInput): Promise<Child> {
  const child = await createChild(input);
  await outbox.enqueue("children", toDbChild(child));
  fireSync();
  return child;
}

export async function editChild(id: string, patch: Partial<Child>): Promise<Child | undefined> {
  const child = await updateChild(id, patch);
  if (child !== undefined) {
    await outbox.enqueue("children", toDbChild(child));
    fireSync();
  }
  return child;
}

export interface AddMeasurementInput {
  childId: string;
  type: MeasurementType;
  value: number;
  measuredAt: string;
}

export async function addMeasurement(input: AddMeasurementInput): Promise<void> {
  const m = await createMeasurement(input);
  await outbox.enqueue("measurements", toDbMeasurement(m));
  fireSync();
}

export async function removeMeasurement(id: string): Promise<void> {
  const m = await deleteMeasurement(id);
  if (m !== undefined) {
    await outbox.enqueue("measurements", toDbMeasurement(m));
    fireSync();
  }
}
