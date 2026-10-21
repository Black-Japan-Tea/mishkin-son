import type {
  BottleDetails,
  BreastDetails,
  DiaperDetails,
  DiaperKind,
  BottleKind,
  BreastSide,
  DayTag,
  EventType,
  SleepDetails,
  SolidDetails,
  WaterDetails,
} from "./types";

/** Db-строки snake_case — контракт Supabase (таблицы + RPC). */
export type DbEventRow = {
  id: string;
  child_id: string;
  family_id: string;
  created_by: string;
  type: EventType;
  started_at: string;
  ended_at: string | null;
  parent_event_id: string | null;
  details: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type DbChildRow = {
  id: string;
  family_id: string;
  name: string;
  birth_date: string;
  sex: string | null;
  birth_weight_g: number | null;
  birth_height_cm: number | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type DbMeasurementRow = {
  id: string;
  child_id: string;
  type: string;
  value: number;
  measured_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type DbFamilyRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export type DbMemberRow = {
  family_id: string;
  user_id: string;
  joined_at: string;
  display_name: string | null;
  email: string | null;
}

export type DbSettingsRow = {
  user_id: string;
  theme_mode: string;
  theme_schedule_start: string;
  theme_schedule_end: string;
  last_child_id: string | null;
}

/** Ручная схема БД для типизации supabase-js (без codegen). */
export interface Database {
  public: {
    Tables: {
      events: {
        Row: DbEventRow;
        Insert: DbEventRow;
        Update: Partial<DbEventRow>;
        Relationships: [];
      };
      children: {
        Row: DbChildRow;
        Insert: DbChildRow;
        Update: Partial<DbChildRow>;
        Relationships: [];
      };
      measurements: {
        Row: DbMeasurementRow;
        Insert: DbMeasurementRow;
        Update: Partial<DbMeasurementRow>;
        Relationships: [];
      };
      user_settings: {
        Row: DbSettingsRow;
        Insert: Partial<DbSettingsRow> & { user_id: string };
        Update: Partial<DbSettingsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      push_events: { Args: { p_rows: DbEventRow[] }; Returns: null };
      push_children: { Args: { p_rows: DbChildRow[] }; Returns: null };
      push_measurements: { Args: { p_rows: DbMeasurementRow[] }; Returns: null };
      create_family: { Args: { p_name: string }; Returns: DbFamilyRow };
      join_family: { Args: { p_code: string }; Returns: DbFamilyRow };
      create_invite: { Args: { p_family_id: string }; Returns: { code: string } };
      my_family: { Args: Record<string, never>; Returns: DbFamilyRow };
      my_family_members: { Args: Record<string, never>; Returns: DbMemberRow[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/* --- Узкие guards для jsonb details (§5.2: unknown только с немедленным сужением) --- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

const DAY_TAGS: readonly DayTag[] = ["day", "night"];
const SIDES: readonly BreastSide[] = ["left", "right", "both"];
const DIAPERS: readonly DiaperKind[] = ["pee", "poop", "both"];
const BOTTLES: readonly BottleKind[] = ["milk", "formula"];

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export function parseSleepDetails(v: unknown): SleepDetails {
  const r = isRecord(v) ? v : {};
  return {
    dayTag: oneOf(r.dayTag, DAY_TAGS) ?? "day",
    place: str(r.place),
    note: str(r.note),
  };
}

export function parseBreastDetails(v: unknown): BreastDetails {
  const r = isRecord(v) ? v : {};
  const d: BreastDetails = { side: oneOf(r.side, SIDES) ?? "both" };
  const dur = num(r.durationMin);
  if (dur !== undefined) d.durationMin = dur;
  return d;
}

export function parseBottleDetails(v: unknown): BottleDetails {
  const r = isRecord(v) ? v : {};
  const kind = oneOf(r.kind, BOTTLES);
  return {
    volumeMl: num(r.volumeMl) ?? 0,
    ...(kind !== undefined ? { kind } : {}),
  };
}

export function parseSolidDetails(v: unknown): SolidDetails {
  const r = isRecord(v) ? v : {};
  return { food: str(r.food), note: str(r.note) };
}

export function parseWaterDetails(v: unknown): WaterDetails {
  const r = isRecord(v) ? v : {};
  const vol = num(r.volumeMl);
  return vol !== undefined ? { volumeMl: vol } : {};
}

export function parseDiaperDetails(v: unknown): DiaperDetails {
  const r = isRecord(v) ? v : {};
  return { kind: oneOf(r.kind, DIAPERS) ?? "pee" };
}
