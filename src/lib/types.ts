export type EventType =
  | "sleep"
  | "feed_bottle"
  | "feed_solid"
  | "feed_water"
  | "diaper";

export type DayTag = "day" | "night";
/** Вид бутылочки для новых записей; грудь убрана из проекта (D1). */
export type BottleKind = "formula" | "water";
/** Единица количества прикорма (второе поле прикорма, D-прикорм). */
export type SolidUnit = "g" | "ml";
export type DiaperKind = "pee" | "poop" | "both";
export type ChildSex = "male" | "female";
export type MeasurementType = "weight" | "height" | "head";
export type ThemeMode = "light" | "dark" | "system" | "schedule";

/** Ночные кормления минимализны (Q22): факт + время + объём. */
export interface SleepDetails {
  dayTag: DayTag;
  place?: string;
  note?: string;
}

export interface BottleDetails {
  volumeMl: number;
  /** Для новых записей — BottleKind; старые строки БД могут нести легаси-строку (напр. "milk"), поэтому читаем как строку без валидации юнионом (D2). */
  kind?: string;
}

export interface SolidDetails {
  food?: string;
  /** Сколько съел; единица — unit, поле только у прикорма. */
  amount?: number;
  unit?: SolidUnit;
  note?: string;
}

export interface WaterDetails {
  volumeMl?: number;
}

export interface DiaperDetails {
  kind: DiaperKind;
}

export type EventDetails =
  | SleepDetails
  | BottleDetails
  | SolidDetails
  | WaterDetails
  | DiaperDetails;

interface EventBase {
  id: string;
  childId: string;
  familyId: string;
  createdBy: string;
  /** ISO UTC. endedAt = null только у активного сна (таймер груди убран, D1). */
  startedAt: string;
  endedAt: string | null;
  /** Ночное кормление внутри сна (решение Q21). */
  parentEventId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SleepEvent extends EventBase {
  type: "sleep";
  details: SleepDetails;
}
export interface BottleEvent extends EventBase {
  type: "feed_bottle";
  details: BottleDetails;
}
export interface SolidEvent extends EventBase {
  type: "feed_solid";
  details: SolidDetails;
}
export interface WaterEvent extends EventBase {
  type: "feed_water";
  details: WaterDetails;
}
export interface DiaperEvent extends EventBase {
  type: "diaper";
  details: DiaperDetails;
}

export type AppEvent =
  | SleepEvent
  | BottleEvent
  | SolidEvent
  | WaterEvent
  | DiaperEvent;

export interface Child {
  id: string;
  familyId: string;
  name: string;
  /** 'YYYY-MM-DD' */
  birthDate: string;
  sex: ChildSex | null;
  birthWeightG: number | null;
  birthHeightCm: number | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface FamilyMemberInfo {
  userId: string;
  displayName: string;
  email: string | null;
  joinedAt: string;
}

export interface Measurement {
  id: string;
  childId: string;
  type: MeasurementType;
  /** кг (weight) или см (height/head) */
  value: number;
  measuredAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserSettings {
  userId: string;
  themeMode: ThemeMode;
  /** 'HH:mm' */
  themeScheduleStart: string;
  themeScheduleEnd: string;
  lastChildId: string | null;
}

/** Операция в очереди синка. row — уже snake_case-строка для RPC. */
export type OutboxTable = "events" | "children" | "measurements";
export interface OutboxEntry {
  id: string;
  table: OutboxTable;
  row: Record<string, unknown>;
  enqueuedAt: string;
}
