import { createClient } from "@supabase/supabase-js";
import type { Database } from "./db-types";
import { env, isSupabaseConfigured } from "./env";

/**
 * null, когда env не заполнен: UI показывает экран настройки,
 * синхронизация честно сообщает «не настроено» — без заглушек (§5.3).
 */
export const supabase: ReturnType<typeof createClient<Database>> | null =
  isSupabaseConfigured
    ? createClient<Database>(env.supabaseUrl ?? "", env.supabaseAnonKey ?? "")
    : null;

export function requireSupabase(): NonNullable<typeof supabase> {
  if (supabase === null) {
    throw new Error("Supabase не настроен: заполни .env (см. .env.example)");
  }
  return supabase;
}
