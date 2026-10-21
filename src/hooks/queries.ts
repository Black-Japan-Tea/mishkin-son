import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as eventsRepo from "../repo/events";
import * as measurementsRepo from "../repo/measurements";
import { editEvent, addEvent, removeEvent, type AddEventInput } from "../sync/writes";
import type { AppEvent } from "../lib/types";

/** TanStack Query поверх IndexedDB: чтение локальное, запись → инвалиды → перечитка. */

export function useActiveSleep(childId: string | null) {
  return useQuery({
    queryKey: ["events", "activeSleep", childId],
    queryFn: async () =>
      childId === null ? null : ((await eventsRepo.getActiveSleep(childId)) ?? null),
    enabled: childId !== null,
  });
}

export function useActiveBreast(childId: string | null) {
  return useQuery({
    queryKey: ["events", "activeBreast", childId],
    queryFn: async () =>
      childId === null ? null : ((await eventsRepo.getActiveBreastFeed(childId)) ?? null),
    enabled: childId !== null,
  });
}

export function useDayEvents(childId: string | null, dayKey: string) {
  return useQuery({
    queryKey: ["events", "day", childId, dayKey],
    queryFn: async () => (childId === null ? [] : eventsRepo.getEventsForDay(childId, dayKey)),
    enabled: childId !== null,
  });
}

/** Все живые события ребёнка (для советов и статистики); объёмы за 30–60 дней малы. */
export function useChildEvents(childId: string | null) {
  return useQuery({
    queryKey: ["events", "all", childId],
    queryFn: async () => (childId === null ? [] : eventsRepo.getEventsForChild(childId)),
    enabled: childId !== null,
  });
}

export function useMeasurements(childId: string | null) {
  return useQuery({
    queryKey: ["measurements", childId],
    queryFn: async () => (childId === null ? [] : measurementsRepo.getMeasurementsForChild(childId)),
    enabled: childId !== null,
  });
}

export function useInvalidateMeasurements(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["measurements"] });
  };
}

export function useInvalidateEvents(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["events"] });
  };
}

export function useAddEvent(): (input: AddEventInput) => Promise<AppEvent> {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (input: AddEventInput) => addEvent(input),
    onSuccess: invalidate,
  }).mutateAsync;
}

export function useEditEvent(): (
  id: string,
  patch: Partial<Omit<AppEvent, "id" | "createdAt">>,
) => Promise<AppEvent | undefined> {
  const invalidate = useInvalidateEvents();
  const { mutateAsync } = useMutation({
    mutationFn: async (args: { id: string; patch: Partial<Omit<AppEvent, "id" | "createdAt">> }) =>
      editEvent(args.id, args.patch),
    onSuccess: invalidate,
  });
  return async (id, patch) => mutateAsync({ id, patch });
}

export function useRemoveEvent(): (id: string) => Promise<void> {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (id: string) => removeEvent(id),
    onSuccess: invalidate,
  }).mutateAsync;
}
