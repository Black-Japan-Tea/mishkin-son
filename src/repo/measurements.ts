import { getDb } from "../lib/db";
import { newId, nowIso } from "../lib/utils";
import type { Measurement, MeasurementType } from "../lib/types";

export async function putMeasurementLww(m: Measurement): Promise<void> {
  const db = await getDb();
  const existing = await db.get("measurements", m.id);
  if (existing === undefined || existing.updatedAt < m.updatedAt) {
    await db.put("measurements", m);
  }
}

export interface NewMeasurementInput {
  childId: string;
  type: MeasurementType;
  value: number;
  measuredAt: string;
}

export async function createMeasurement(input: NewMeasurementInput): Promise<Measurement> {
  const db = await getDb();
  const now = nowIso();
  const m: Measurement = {
    id: newId(),
    childId: input.childId,
    type: input.type,
    value: input.value,
    measuredAt: input.measuredAt,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.put("measurements", m);
  return m;
}

export async function deleteMeasurement(id: string): Promise<Measurement | undefined> {
  const db = await getDb();
  const existing = await db.get("measurements", id);
  if (existing === undefined) return undefined;
  const deleted: Measurement = { ...existing, deletedAt: nowIso(), updatedAt: nowIso() };
  await db.put("measurements", deleted);
  return deleted;
}

export async function getMeasurementsForChild(childId: string): Promise<Measurement[]> {
  const db = await getDb();
  const range = IDBKeyRange.bound([childId, ""], [childId, "\uffff"]);
  const all = await db.getAllFromIndex("measurements", "by-child", range);
  return all.filter((m) => m.deletedAt === null);
}
