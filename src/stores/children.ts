import { create } from "zustand";
import { getChildrenForFamily } from "../repo/children";
import { getMeta, setMeta } from "../repo/meta";
import { useSettings } from "./settings";
import { useFamily } from "./family";
import type { Child } from "../lib/types";

interface ChildrenStore {
  children: Child[];
  activeId: string | null;
  loaded: boolean;
  loading: boolean;
  refresh(): Promise<void>;
  setActive(id: string): Promise<void>;
}

export const useChildren = create<ChildrenStore>()((set) => ({
  children: [],
  activeId: null,
  loaded: false,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const family = useFamily.getState().family;
      if (family === null) {
        set({ children: [], loaded: true });
        return;
      }
      const children = await getChildrenForFamily(family.id);
      const stored = await getMeta("last_child_id");
      const activeId =
        children.some((c) => c.id === stored) ? stored : (children[0]?.id ?? null);
      set({ children, activeId, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  setActive: async (id) => {
    set({ activeId: id });
    await setMeta("last_child_id", id);
    // Облачная синхронизация выбора — через стор настроек (там известен userId).
    useSettings.getState().pushLastChild(id);
  },
}));
