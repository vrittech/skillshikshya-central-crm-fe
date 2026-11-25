import { api } from "@/lib/api";
import type {
  AttendanceMark,
  Batch,
  BatchCloseCheck,
  BatchCostPayload,
  BatchListParams,
  BatchMoney,
  BatchPayload,
  BatchRegister,
  BatchStudents,
  CourseBatch,
  CourseBatchListParams,
  CourseBatchPayload,
  Paginated,
} from "@/types";

/** Shifts (Morning / Day / Evening) — see course_app_apis_guide.md §Batch. */
export const batchesService = {
  async list(params: BatchListParams = {}) {
    const { data } = await api.get<Paginated<Batch>>("/batches/", { params });
    return data;
  },

  async get(id: number) {
    const { data } = await api.get<Batch>(`/batches/${id}/`);
    return data;
  },

  async create(payload: BatchPayload) {
    const { data } = await api.post<Batch>("/batches/", payload);
    return data;
  },

  async update(id: number, payload: BatchPayload) {
    const { data } = await api.patch<Batch>(`/batches/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/batches/${id}/`);
  },
};

/** Course batches — see course_app_apis_guide.md §Course Batch. */
export const courseBatchesService = {
  async list(params: CourseBatchListParams = {}) {
    // indexes: null sends an array as status=a&status=b, which django-filter reads.
    const { data } = await api.get<Paginated<CourseBatch>>("/course-batches/", {
      params,
      paramsSerializer: { indexes: null },
    });
    return data;
  },

  async get(id: number) {
    const { data } = await api.get<CourseBatch>(`/course-batches/${id}/`);
    return data;
  },

  async create(payload: CourseBatchPayload) {
    const { data } = await api.post<CourseBatch>("/course-batches/", payload);
    return data;
  },

  async update(id: number, payload: CourseBatchPayload) {
    const { data } = await api.patch<CourseBatch>(`/course-batches/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/course-batches/${id}/`);
  },

  /** Who sits in the batch now, who moved in, and who is paused out of it. */
  async students(id: number) {
    const { data } = await api.get<BatchStudents>(`/course-batches/${id}/students/`);
    return data;
  },

  /** Fees, collected, owed, costs and profit, with the costs and close history. */
  async money(id: number) {
    const { data } = await api.get<BatchMoney>(`/course-batches/${id}/money/`);
    return data;
  },

  async addCost(id: number, payload: BatchCostPayload) {
    const { data } = await api.post<BatchMoney>(`/course-batches/${id}/costs/`, payload);
    return data;
  },

  async voidCost(id: number, costId: number, reason: string) {
    const { data } = await api.post<BatchMoney>(`/course-batches/${id}/costs/${costId}/void/`, {
      reason,
    });
    return data;
  },

  /** Close with a reason. With open checklist items the server refuses unless closeAnyway. */
  async close(id: number, reason: string, closeAnyway = false) {
    const { data } = await api.post<BatchMoney>(`/course-batches/${id}/close/`, {
      reason,
      close_anyway: closeAnyway,
    });
    return data;
  },

  /** What is still open before the batch can close. */
  async closeCheck(id: number) {
    const { data } = await api.get<BatchCloseCheck>(`/course-batches/${id}/close-check/`);
    return data;
  },

  /** Mark students still studying completed: these enrollments, or all of them. */
  async completeStudents(id: number, reason: string, enrollments?: number[]) {
    const { data } = await api.post<{ completed: number[]; checklist: BatchCloseCheck }>(
      `/course-batches/${id}/complete-students/`,
      { reason, ...(enrollments ? { enrollments } : {}) },
    );
    return data;
  },

  /** The batch's register for one day (today when left out). */
  async attendance(id: number, date?: string) {
    const { data } = await api.get<BatchRegister>(`/course-batches/${id}/attendance/`, {
      params: date ? { date } : {},
    });
    return data;
  },

  async markAttendance(
    id: number,
    payload: { date: string; marks: { student: number; status: AttendanceMark }[] },
  ) {
    const { data } = await api.post<BatchRegister>(`/course-batches/${id}/attendance/`, payload);
    return data;
  },

  async reopen(id: number, reason: string) {
    const { data } = await api.post<BatchMoney>(`/course-batches/${id}/reopen/`, { reason });
    return data;
  },
};
