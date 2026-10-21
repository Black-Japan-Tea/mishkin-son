import { getDb } from "../lib/db";

export async function getMeta(key: string): Promise<string | undefined> {
  const db = await getDb();
  return db.get("meta", key);
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.put("meta", value, key);
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await getDb();
  await db.delete("meta", key);
}
