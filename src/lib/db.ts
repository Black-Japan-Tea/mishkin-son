import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AppEvent, Child, Family, Measurement, OutboxEntry } from "./types";

interface AppDbSchema extends DBSchema {
  events: {
    key: string;
    value: AppEvent;
    indexes: { "by-child-start": [string, string] };
  };
  children: {
    key: string;
    value: Child;
    indexes: { "by-family": string };
  };
  measurements: {
    key: string;
    value: Measurement;
    indexes: { "by-child": [string, string] };
  };
  families: { key: string; value: Family };
  outbox: { key: string; value: OutboxEntry };
  meta: { key: string; value: string };
}

let dbPromise: Promise<IDBPDatabase<AppDbSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<AppDbSchema>> {
  if (dbPromise === null) {
    dbPromise = openDB<AppDbSchema>("mishkin-son", 1, {
      upgrade(db) {
        const events = db.createObjectStore("events", { keyPath: "id" });
        events.createIndex("by-child-start", ["childId", "startedAt"]);
        const children = db.createObjectStore("children", { keyPath: "id" });
        children.createIndex("by-family", "familyId");
        const measurements = db.createObjectStore("measurements", { keyPath: "id" });
        measurements.createIndex("by-child", ["childId", "measuredAt"]);
        db.createObjectStore("families", { keyPath: "id" });
        db.createObjectStore("outbox", { keyPath: "id" });
        db.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}
