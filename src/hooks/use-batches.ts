import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { batchesService, courseBatchesService } from "@/services/batches.service";
import type { BatchListParams, BatchPayload, CourseBatchListParams, CourseBatchPayload } from "@/types";

/* ------------------------------------------------------- time slots (Batch) */

export function useBatches(params: BatchListParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["batches", params],
    queryFn: () => batchesService.list(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BatchPayload) => batchesService.create(payload),
    onSuccess: (b) => {
      toast.success(`Time slot "${b.name}" created`);
      void qc.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create time slot")),
  });
}

export function useUpdateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BatchPayload }) =>
      batchesService.update(id, payload),
    onSuccess: () => {
      toast.success("Time slot updated");
      void qc.invalidateQueries({ queryKey: ["batches"] });
      // Cohort rows carry a denormalized batch_name.
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update time slot")),
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => batchesService.remove(id),
    onSuccess: () => {
      toast.success("Time slot deleted");
      void qc.invalidateQueries({ queryKey: ["batches"] });
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete time slot")),
  });
}

/* ------------------------------------------------------- course batches (CourseBatch) */

export function useCourseBatches(params: CourseBatchListParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["course-batches", params],
    queryFn: () => courseBatchesService.list(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateCourseBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CourseBatchPayload) => courseBatchesService.create(payload),
    onSuccess: (cb) => {
      // coursebatch_id is generated server-side — show it so it can be quoted to the lead.
      toast.success(`Course batch "${cb.name}" created`, { description: cb.coursebatch_id });
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create course batch")),
  });
}

export function useUpdateCourseBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CourseBatchPayload }) =>
      courseBatchesService.update(id, payload),
    onSuccess: () => {
      toast.success("Course batch updated");
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update course batch")),
  });
}

export function useDeleteCourseBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseBatchesService.remove(id),
    onSuccess: () => {
      toast.success("Course batch deleted");
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete course batch")),
  });
}

/** Who sits in a course batch now, who moved in, and who is paused out of it. */
export function useBatchStudents(id: number | null) {
  return useQuery({
    queryKey: ["course-batches", "students", id],
    queryFn: () => courseBatchesService.students(id as number),
    enabled: id != null,
  });
}
