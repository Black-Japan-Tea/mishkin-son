import {
  parseBottleDetails,
  parseBreastDetails,
  parseDiaperDetails,
  parseSleepDetails,
  parseSolidDetails,
  parseWaterDetails,
  type DbChildRow,
  type DbEventRow,
  type DbMeasurementRow,
} from "./db-types";
import type { AppEvent, Child, EventDetails, EventType, Measurement } from "./types";

/** Конвертация Db-row ↔ домен. jsonb details сужается guards'ами (§5.2). */

export function toDomainEvent(row: DbEventRow): AppEvent {
  const base = {
    id: row.id,
    childId: row.child_id,
    familyId: row.family_id,
    createdBy: row.created_by,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    parentEventId: row.parent_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
  switch (row.type) {
    case "sleep":
      return { ...base, type: "sleep", details: parseSleepDetails(row.details) };
    case "feed_breast":
      return { ...base, type: "feed_breast", details: parseBreastDetails(row.details) };
    case "feed_bottle":
      return { ...base, type: "feed_bottle", details: parseBottleDetails(row.details) };
    case "feed_solid":
      return { ...base, type: "feed_solid", details: parseSolidDetails(row.details) };
    case "feed_water":
      return { ...base, type: "feed_water", details: parseWaterDetails(row.details) };
    case "diaper":
      return { ...base, type: "diaper", details: parseDiaperDetails(row.details) };
    default: {
      const never: never = row.type;
      throw new Error(`Неизвестный тип события: ${String(never)}`);
    }
  }
}

export function toDbEvent(e: AppEvent): DbEventRow {
  return {
    id: e.id,
    child_id: e.childId,
    family_id: e.familyId,
    created_by: e.createdBy,
    type: e.type satisfies EventType,
    started_at: e.startedAt,
    ended_at: e.endedAt,
    parent_event_id: e.parentEventId,
    details: e.details as EventDetails,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    deleted_at: e.deletedAt,
  };
}

export function toDomainChild(row: DbChildRow): Child {
  const sex = row.sex;
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    birthDate: row.birth_date,
    sex: sex === "male" || sex === "female" ? sex : null,
    birthWeightG: row.birth_weight_g,
    birthHeightCm: row.birth_height_cm,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function toDbChild(c: Child): DbChildRow {
  return {
    id: c.id,
    family_id: c.familyId,
    name: c.name,
    birth_date: c.birthDate,
    sex: c.sex,
    birth_weight_g: c.birthWeightG,
    birth_height_cm: c.birthHeightCm,
    avatar_url: c.avatarUrl,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted_at: c.deletedAt,
  };
}

export function toDomainMeasurement(row: DbMeasurementRow): Measurement {
  const type = row.type;
  return {
    id: row.id,
    childId: row.child_id,
    type: type === "weight" || type === "height" || type === "head" ? type : "weight",
    value: row.value,
    measuredAt: row.measured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function toDbMeasurement(m: Measurement): DbMeasurementRow {
  return {
    id: m.id,
    child_id: m.childId,
    type: m.type,
    value: m.value,
    measured_at: m.measuredAt,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    deleted_at: m.deletedAt,
  };
}
