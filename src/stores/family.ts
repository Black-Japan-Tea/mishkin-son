import { create } from "zustand";
import { getDb } from "../lib/db";
import { pullFamily, pullMembers, rpcCreateFamily, rpcCreateInvite, rpcJoinFamily } from "../lib/remote";
import type { Family, FamilyMemberInfo } from "../lib/types";

interface FamilyStore {
  family: Family | null;
  members: FamilyMemberInfo[];
  loaded: boolean;
  loading: boolean;
  refresh(): Promise<void>;
  create(name: string): Promise<Family>;
  join(code: string): Promise<Family>;
  invite(): Promise<string>;
}

/** У пользователя ровно одна семья (v1): своя или приглашённая. */
export const useFamily = create<FamilyStore>()((set, get) => ({
  family: null,
  members: [],
  loaded: false,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const family = await pullFamily();
      if (family !== null) {
        const db = await getDb();
        await db.put("families", family);
        const members = await pullMembers();
        set({ family, members, loaded: true });
      } else {
        set({ family: null, members: [], loaded: true });
      }
    } finally {
      set({ loading: false });
    }
  },

  create: async (name) => {
    const family = await rpcCreateFamily(name);
    const db = await getDb();
    await db.put("families", family);
    const members = await pullMembers();
    set({ family, members, loaded: true });
    return family;
  },

  join: async (code) => {
    const family = await rpcJoinFamily(code);
    const db = await getDb();
    await db.put("families", family);
    const members = await pullMembers();
    set({ family, members, loaded: true });
    return family;
  },

  invite: async () => {
    const { family } = get();
    if (family === null) throw new Error("Семья ещё не создана");
    return rpcCreateInvite(family.id);
  },
}));
