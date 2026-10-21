import { create } from "zustand";
import { isSupabaseConfigured } from "../lib/env";
import { requireSupabase } from "../lib/supabase";

export type AuthPhase = "loading" | "unconfigured" | "signedOut" | "signedIn";

interface AuthStore {
  phase: AuthPhase;
  userId: string | null;
  email: string | null;
  init(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Повторная проверка после подтверждения email пользователем. */
  recheck(): Promise<void>;
}

export const useAuth = create<AuthStore>()((set) => ({
  phase: "loading",
  userId: null,
  email: null,

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ phase: "unconfigured" });
      return;
    }
    const supabase = requireSupabase();
    const { data } = await supabase.auth.getSession();
    applySession(set, data.session);
    supabase.auth.onAuthStateChange((_event, session) => {
      applySession(set, session);
    });
  },

  signIn: async (email, password) => {
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error !== null) throw new Error(ruAuthError(error.message));
  },

  signUp: async (email, password) => {
    const { data, error } = await requireSupabase().auth.signUp({ email, password });
    if (error !== null) throw new Error(ruAuthError(error.message));
    if (data.session === null) {
      throw new ConfirmEmailError("Проверь почту и подтверди email, затем войди.");
    }
  },

  signOut: async () => {
    await requireSupabase().auth.signOut();
    set({ phase: "signedOut", userId: null, email: null });
  },

  recheck: async () => {
    const { data } = await requireSupabase().auth.getSession();
    applySession(set, data.session);
  },
}));

export class ConfirmEmailError extends Error {}

function applySession(
  set: (s: Partial<AuthStore>) => void,
  session: { user: { id: string; email?: string } } | null,
): void {
  if (session === null) {
    set({ phase: "signedOut", userId: null, email: null });
    return;
  }
  set({
    phase: "signedIn",
    userId: session.user.id,
    email: session.user.email ?? null,
  });
}

function ruAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Неверный email или пароль.";
  if (/user already registered/i.test(message)) return "Пользователь с таким email уже есть.";
  if (/password/i.test(message) && /at least/i.test(message))
    return "Пароль слишком короткий (минимум 6 символов).";
  if (/email not confirmed/i.test(message)) return "Email не подтверждён — проверь почту.";
  return message;
}
