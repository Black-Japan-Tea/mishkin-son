import { create } from "zustand";

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncAt: string | null;
  error: string | null;
  /** 'ok' | 'unconfigured' — второй означает: заполни .env (см. .env.example) */
  configState: "ok" | "unconfigured";
}

interface SyncStatusStore extends SyncStatus {
  set(patch: Partial<SyncStatus>): void;
}

export const useSyncStatus = create<SyncStatusStore>()((set) => ({
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  error: null,
  configState: "ok",
  set: (patch) => set(patch),
}));
