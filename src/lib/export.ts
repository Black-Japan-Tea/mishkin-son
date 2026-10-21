import { getDb } from "./db";
import { isSupabaseConfigured } from "./env";

/** Экспорт всех локальных данных в JSON (решение Q47; CSV — в v2). */
export async function exportJson(): Promise<void> {
  const db = await getDb();
  const dump = {
    exportedAt: new Date().toISOString(),
    source: isSupabaseConfigured ? "device+cloud" : "device-only",
    children: await db.getAll("children"),
    events: await db.getAll("events"),
    measurements: await db.getAll("measurements"),
    families: await db.getAll("families"),
  };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mishkin-son-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
