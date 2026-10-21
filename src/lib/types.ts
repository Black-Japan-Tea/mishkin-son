export type EventType =
  | "sleep"
  | "feed_breast"
  | "feed_bottle"
  | "feed_solid"
  | "feed_water"
  | "diaper";

export type DayTag = "day" | "night";
export type BreastSide = "left" | "right" | "both";
export type BottleKind = "milk" | "formula";
export type DiaperKind = "pee" | "poop" | "both";
export type ChildSex = "male" | "female";
export type MeasurementType = "weight" | "height" | "head";
export type ThemeMode = "light" | "dark" | "system" | "schedule";

/** Ночные кормления минимализны (Q22): факт + время + объём/сторона. */
export interface SleepDetails {
  dayTag: DayTag;
  place?: string;
  note?: string;
}

export interface BreastDetails {
  side: BreastSide;
  durationMin?: number;
}

export interface BottleDetails {
  volumeMl: number;
  kind?: BottleKind;
}

export interface SolidDetails {
  food?: string;
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
  | BreastDetails
  | BottleDetails
  | SolidDetails
  | WaterDetails
  | DiaperDetails;

interface EventBase {
  id: string;
  childId: string;
  familyId: string;
  createdBy: string;
  /** ISO UTC. endedAt = null у активного сна/кормления. */
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
export interface BreastEvent extends EventBase {
  type: "feed_breast";
  details: BreastDetails;
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
  | BreastEvent
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
