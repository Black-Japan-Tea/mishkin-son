import { getDb } from "../lib/db";
import { newId, nowIso } from "../lib/utils";
import type { OutboxEntry, OutboxTable } from "../lib/types";

export async function enqueue(table: OutboxTable, row: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  const entry: OutboxEntry = { id: newId(), table, row, enqueuedAt: nowIso() };
  await db.put("outbox", entry);
}

export async function all(): Promise<OutboxEntry[]> {
  const db = await getDb();
  return db.getAll("outbox");
}

export async function removeMany(ids: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

export async function count(): Promise<number> {
  const db = await getDb();
  return db.count("outbox");
}
