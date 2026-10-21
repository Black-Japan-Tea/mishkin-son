import { getDb } from "../lib/db";
import { newId, nowIso } from "../lib/utils";
import type { Child } from "../lib/types";

export async function putChildLww(child: Child): Promise<void> {
  const db = await getDb();
  const existing = await db.get("children", child.id);
  if (existing === undefined || existing.updatedAt < child.updatedAt) {
    await db.put("children", child);
  }
}

export interface NewChildInput {
  familyId: string;
  name: string;
  birthDate: string;
  sex: Child["sex"];
  birthWeightG: number | null;
  birthHeightCm: number | null;
}

export async function createChild(input: NewChildInput): Promise<Child> {
  const db = await getDb();
  const now = nowIso();
  const child: Child = {
    id: newId(),
    familyId: input.familyId,
    name: input.name,
    birthDate: input.birthDate,
    sex: input.sex,
    birthWeightG: input.birthWeightG,
    birthHeightCm: input.birthHeightCm,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.put("children", child);
  return child;
}

export async function updateChild(id: string, patch: Partial<Child>): Promise<Child | undefined> {
  const db = await getDb();
  const existing = await db.get("children", id);
  if (existing === undefined) return undefined;
  const updated: Child = { ...existing, ...patch, updatedAt: nowIso() };
  await db.put("children", updated);
  return updated;
}

export async function getChildrenForFamily(familyId: string): Promise<Child[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("children", "by-family", familyId);
  return all.filter((c) => c.deletedAt === null).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getChild(id: string): Promise<Child | undefined> {
  const db = await getDb();
  return db.get("children", id);
}
