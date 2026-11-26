import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiBranchMove,
  ApiAttendance,
  ApiAttendancePayload,
  ApiAttendanceProfile,
  ApiStudent,
  ApiStudentDocument,
  ApiStudentPayload,
  AttendanceListParams,
} from "@/types/leads-api";

export interface StudentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  status__in?: string;
  branch?: number;
  /** Branch scoping (staff only) — see lead_app_overview.md §Branch Scoping. */
  branch_id?: number;
  source?: number;
  assigned_counselor?: number;
  gender?: string;
  created_at__gte?: string;
  created_at__lte?: string;
  enrolled_at__gte?: string;
  enrolled_at__lte?: string;
  ordering?: string;
}

export const studentsService = {
  async list(params: StudentListParams = {}) {
    const { data } = await api.get<Paginated<ApiStudent>>("/students/", { params });
    return data;
  },
  /** Detail response — adds `total_paid`, `enrollment_count`, and `recent_payments`. */
  async get(id: number) {
    const { data } = await api.get<ApiStudent>(`/students/${id}/`);
    return data;
  },
  async create(payload: ApiStudentPayload) {
    const { data } = await api.post<ApiStudent>("/students/", payload);
    return data;
  },
  async update(id: number, payload: ApiStudentPayload) {
    const { data } = await api.patch<ApiStudent>(`/students/${id}/`, payload);
    return data;
  },
  async remove(id: number) {
    await api.delete(`/students/${id}/`);
  },
  /** Moves the student and their open enrollments to another branch. */
  async moveBranch(id: number, payload: { branch: number; reason: string }) {
    const { data } = await api.post<ApiStudent>(`/students/${id}/move-branch/`, payload);
    return data;
  },
  async branchMoves(id: number) {
    const { data } = await api.get<ApiBranchMove[]>(`/students/${id}/branch-moves/`);
    return data;
  },

  /** Downloads the filtered student list as students.csv (same query params as list). */
  async exportCsv(params: Omit<StudentListParams, "page" | "page_size"> = {}) {
    const { data } = await api.get<Blob>("/students/export_csv/", {
      params,
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
    URL.revokeObjectURL(url);
  },

  // ---- attendance ----
  async attendanceProfile(studentId: number, course?: number) {
    const { data } = await api.get<ApiAttendanceProfile>(
      `/students/${studentId}/attendance_profile/`,
      { params: course ? { course } : {} },
    );
    return data;
  },
  async attendance(studentId: number, params: AttendanceListParams = {}) {
    const { data } = await api.get<Paginated<ApiAttendance>>(`/students/${studentId}/attendance/`, {
      params,
    });
    return data;
  },
  async markAttendance(studentId: number, payload: ApiAttendancePayload) {
    const { data } = await api.post<ApiAttendance>(`/students/${studentId}/attendance/`, payload);
    return data;
  },
  async updateAttendance(studentId: number, id: number, payload: ApiAttendancePayload) {
    const { data } = await api.patch<ApiAttendance>(
      `/students/${studentId}/attendance/${id}/`,
      payload,
    );
    return data;
  },
  async deleteAttendance(studentId: number, id: number) {
    await api.delete(`/students/${studentId}/attendance/${id}/`);
  },

  // ---- documents ----
  async documents(studentId: number) {
    const { data } = await api.get<Paginated<ApiStudentDocument>>(
      `/students/${studentId}/documents/`,
    );
    return data;
  },
  async addDocument(studentId: number, payload: { document_type: string; file: string }) {
    const { data } = await api.post<ApiStudentDocument>(
      `/students/${studentId}/documents/`,
      payload,
    );
    return data;
  },
  async deleteDocument(studentId: number, id: number) {
    await api.delete(`/students/${studentId}/documents/${id}/`);
  },
};
