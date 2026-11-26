import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { batchesService, courseBatchesService } from "@/services/batches.service";
import { globalListsService } from "@/services/global-lists.service";
import type {
  AttendanceMark,
  BatchCostPayload,
  BatchListParams,
  BatchMoney,
  BatchPayload,
  CourseBatchListParams,
  CourseBatchPayload,
} from "@/types";

/* ----------------------------------------------------------- shifts (Batch) */

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
      toast.success(`Shift "${b.name}" created`);
      void qc.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create shift")),
  });
}

export function useUpdateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BatchPayload }) =>
      batchesService.update(id, payload),
    onSuccess: () => {
      toast.success("Shift updated");
      void qc.invalidateQueries({ queryKey: ["batches"] });
      // Cohort rows carry a denormalized batch_name.
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update shift")),
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => batchesService.remove(id),
    onSuccess: () => {
      toast.success("Shift deleted");
      void qc.invalidateQueries({ queryKey: ["batches"] });
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete shift")),
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
      toast.success(`Batch "${cb.name}" created`, { description: cb.coursebatch_id });
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create batch")),
  });
}

export function useUpdateCourseBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CourseBatchPayload }) =>
      courseBatchesService.update(id, payload),
    onSuccess: () => {
      toast.success("Batch updated");
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update batch")),
  });
}

export function useDeleteCourseBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseBatchesService.remove(id),
    onSuccess: () => {
      toast.success("Batch deleted");
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete batch")),
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

export function useCourseBatch(id: number | null) {
  return useQuery({
    queryKey: ["course-batches", "detail", id],
    queryFn: () => courseBatchesService.get(id as number),
    enabled: id != null && Number.isFinite(id),
    retry: false,
  });
}

/** Pending enrollments that picked this batch; they take a seat when confirmed. */
export function useBatchPending(id: number | null) {
  return useQuery({
    queryKey: ["course-batches", "pending", id],
    queryFn: () =>
      globalListsService.enrollments({ batch: id, status: "pending", page_size: 100 }),
    enabled: id != null,
  });
}

/* ------------------------------------------------------- batch money */

export function useBatchMoney(id: number | null) {
  return useQuery({
    queryKey: ["course-batches", "money", id],
    queryFn: () => courseBatchesService.money(id as number),
    enabled: id != null,
  });
}

/** Each batch money action replies with the new money; the list and reports refresh. */
function useBatchMoneyAction<V>(
  run: (vars: V) => Promise<BatchMoney>,
  done: string,
  failed: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (money) => {
      toast.success(done);
      qc.setQueryData(["course-batches", "money", money.batch], money);
      // Closing changes the state of the students' Teams licences.
      for (const key of ["course-batches", "reports", "teams", "lead", "enrollments"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e, failed)),
  });
}

export function useAddBatchCost() {
  return useBatchMoneyAction(
    ({ id, payload }: { id: number; payload: BatchCostPayload }) =>
      courseBatchesService.addCost(id, payload),
    "Cost added",
    "Could not add the cost",
  );
}

export function useVoidBatchCost() {
  return useBatchMoneyAction(
    ({ id, costId, reason }: { id: number; costId: number; reason: string }) =>
      courseBatchesService.voidCost(id, costId, reason),
    "Cost voided",
    "Could not void the cost",
  );
}

export function useCloseBatch() {
  return useBatchMoneyAction(
    ({ id, reason, closeAnyway }: { id: number; reason: string; closeAnyway?: boolean }) =>
      courseBatchesService.close(id, reason, closeAnyway),
    "Batch closed",
    "Could not close the batch",
  );
}

export function useBatchCloseCheck(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["course-batches", "close-check", id],
    queryFn: () => courseBatchesService.closeCheck(id as number),
    enabled: id != null && enabled,
  });
}

export function useBatchAttendance(id: number | null, date: string | null) {
  return useQuery({
    queryKey: ["course-batches", "attendance", id, date],
    queryFn: () => courseBatchesService.attendance(id as number, date ?? undefined),
    enabled: id != null,
  });
}

export function useMarkBatchAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      date: string;
      marks: { student: number; status: AttendanceMark }[];
    }) => courseBatchesService.markAttendance(id, payload),
    onSuccess: (register) => {
      toast.success("Attendance saved");
      qc.setQueryData(["course-batches", "attendance", register.batch, register.date], register);
      // The panel opens on today under a null date key; refresh every day of this batch.
      void qc.invalidateQueries({ queryKey: ["course-batches", "attendance", register.batch] });
      void qc.invalidateQueries({ queryKey: ["course-batches", "close-check", register.batch] });
      void qc.invalidateQueries({ queryKey: ["student"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save attendance")),
  });
}

export function useReopenBatch() {
  return useBatchMoneyAction(
    ({ id, reason }: { id: number; reason: string }) => courseBatchesService.reopen(id, reason),
    "Batch reopened",
    "Could not reopen the batch",
  );
}
