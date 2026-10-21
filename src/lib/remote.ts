import { requireSupabase } from "./supabase";
import {
  toDomainChild,
  toDomainEvent,
  toDomainMeasurement,
} from "./mappers";
import type { DbChildRow, DbEventRow, DbFamilyRow, DbMemberRow, DbMeasurementRow } from "./db-types";
import type { AppEvent, Child, Family, FamilyMemberInfo, Measurement, UserSettings } from "./types";

/** Все обращения к облаку. Ошибки не глотаем — их показывает статус-бар синка. */

export async function pushEvents(rows: DbEventRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await requireSupabase().rpc("push_events", { p_rows: rows });
  if (error !== null) throw new Error(`push_events: ${error.message}`);
}

export async function pushChildren(rows: DbChildRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await requireSupabase().rpc("push_children", { p_rows: rows });
  if (error !== null) throw new Error(`push_children: ${error.message}`);
}

export async function pushMeasurements(rows: DbMeasurementRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await requireSupabase().rpc("push_measurements", { p_rows: rows });
  if (error !== null) throw new Error(`push_measurements: ${error.message}`);
}

export async function pullFamily(): Promise<Family | null> {
  const { data, error } = await requireSupabase().rpc("my_family");
  if (error !== null) throw new Error(`my_family: ${error.message}`);
  // PostgREST возвращает не-нулевую «пустую» запись для NULL-композита — проверяем по факту.
  const row = data as DbFamilyRow | null;
  if (row === null || typeof row.id !== "string" || row.id === "") return null;
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
  } satisfies Family;
}

export async function pullMembers(): Promise<FamilyMemberInfo[]> {
  const { data, error } = await requireSupabase().rpc("my_family_members");
  if (error !== null) throw new Error(`my_family_members: ${error.message}`);
  return (data ?? []).map((m) => ({
    userId: m.user_id,
    displayName: m.display_name ?? "Без имени",
    email: m.email,
    joinedAt: m.joined_at,
  }));
}

export async function pullChildren(familyId: string): Promise<Child[]> {
  const { data, error } = await requireSupabase()
    .from("children")
    .select("*")
    .eq("family_id", familyId);
  if (error !== null) throw new Error(`children pull: ${error.message}`);
  return (data ?? []).map(toDomainChild);
}

export async function pullEvents(familyId: string, cursor: string | undefined): Promise<AppEvent[]> {
  let query = requireSupabase()
    .from("events")
    .select("*")
    .eq("family_id", familyId)
    .order("updated_at", { ascending: true })
    .limit(500);
  if (cursor !== undefined) query = query.gt("updated_at", cursor);
  const { data, error } = await query;
  if (error !== null) throw new Error(`events pull: ${error.message}`);
  return (data as DbEventRow[]).map(toDomainEvent);
}

export async function pullMeasurements(childIds: string[]): Promise<Measurement[]> {
  if (childIds.length === 0) return [];
  const { data, error } = await requireSupabase()
    .from("measurements")
    .select("*")
    .in("child_id", childIds);
  if (error !== null) throw new Error(`measurements pull: ${error.message}`);
  return (data as DbMeasurementRow[]).map(toDomainMeasurement);
}

/** Частичный upsert: обновляются только переданные поля (PK обязателен). */
export async function saveSettings(
  s: Partial<Omit<UserSettings, "userId">> & { userId: string },
): Promise<void> {
  const { error } = await requireSupabase().from("user_settings").upsert({
    user_id: s.userId,
    ...(s.themeMode !== undefined ? { theme_mode: s.themeMode } : {}),
    ...(s.themeScheduleStart !== undefined
      ? { theme_schedule_start: s.themeScheduleStart }
      : {}),
    ...(s.themeScheduleEnd !== undefined ? { theme_schedule_end: s.themeScheduleEnd } : {}),
    ...(s.lastChildId !== undefined ? { last_child_id: s.lastChildId } : {}),
  });
  if (error !== null) throw new Error(`settings save: ${error.message}`);
}

export async function fetchSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await requireSupabase()
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error !== null) throw new Error(`settings fetch: ${error.message}`);
  if (data === null) return null;
  const mode = data.theme_mode;
  return {
    userId: data.user_id,
    themeMode:
      mode === "light" || mode === "dark" || mode === "system" || mode === "schedule"
        ? mode
        : "system",
    themeScheduleStart: data.theme_schedule_start,
    themeScheduleEnd: data.theme_schedule_end,
    lastChildId: data.last_child_id,
  };
}

export async function rpcCreateFamily(name: string): Promise<Family> {
  const { data, error } = await requireSupabase().rpc("create_family", { p_name: name });
  if (error !== null) throw new Error(`create_family: ${error.message}`);
  return { id: data.id, name: data.name, createdBy: data.created_by, createdAt: data.created_at };
}

export async function rpcJoinFamily(code: string): Promise<Family> {
  const { data, error } = await requireSupabase().rpc("join_family", { p_code: code.trim().toUpperCase() });
  if (error !== null) throw new Error(`join_family: ${error.message}`);
  return { id: data.id, name: data.name, createdBy: data.created_by, createdAt: data.created_at };
}

export async function rpcCreateInvite(familyId: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc("create_invite", { p_family_id: familyId });
  if (error !== null) throw new Error(`create_invite: ${error.message}`);
  return data.code;
}

export type { DbFamilyRow, DbMemberRow };
