import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { studentsService, type StudentListParams } from "@/services/students.service";
import type {
  ApiAttendancePayload,
  ApiStudentPayload,
  AttendanceListParams,
} from "@/types/leads-api";

export function useStudents(params: StudentListParams) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: () => studentsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useStudent(id: number | null) {
  return useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsService.get(id as number),
    enabled: id != null,
  });
}

export function useStudentBranchMoves(id: number | null) {
  return useQuery({
    queryKey: ["student", id, "branch-moves"],
    queryFn: () => studentsService.branchMoves(id as number),
    enabled: id != null,
  });
}

export function useMoveStudentBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, branch, reason }: { id: number; branch: number; reason: string }) =>
      studentsService.moveBranch(id, { branch, reason }),
    onSuccess: (s) => {
      toast.success(`${s.full_name} moved to ${s.branch_name ?? "the new branch"}`);
      for (const key of ["students", "student", "enrollments", "enrollment", "lead", "leads"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not move the student")),
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApiStudentPayload) => studentsService.create(payload),
    onSuccess: (s) => {
      toast.success(`Student ${s.student_id} created`);
      void qc.invalidateQueries({ queryKey: ["students"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
      // Creating a student from a lead converts it, claims its enrollments,
      // and generates a course-fee invoice per un-invoiced enrollment.
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["enrollments"] });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create student")),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ApiStudentPayload }) =>
      studentsService.update(id, payload),
    onSuccess: (s) => {
      toast.success("Student updated");
      void qc.invalidateQueries({ queryKey: ["students"] });
      void qc.invalidateQueries({ queryKey: ["student", s.id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update student")),
  });
}

/* -------------------------------------------------------------- attendance */

/** Attendance stats + streaks — `GET /api/students/{id}/attendance_profile/`. */
export function useAttendanceProfile(studentId: number | null, course?: number) {
  return useQuery({
    queryKey: ["student", studentId, "attendance-profile", course ?? null],
    queryFn: () => studentsService.attendanceProfile(studentId as number, course),
    enabled: studentId != null,
  });
}

export function useStudentAttendance(studentId: number | null, params: AttendanceListParams = {}) {
  return useQuery({
    queryKey: ["student", studentId, "attendance", params],
    queryFn: () => studentsService.attendance(studentId as number, { page_size: 50, ...params }),
    enabled: studentId != null,
    placeholderData: keepPreviousData,
  });
}

export function useMarkAttendance(studentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApiAttendancePayload) =>
      studentsService.markAttendance(studentId as number, payload),
    onSuccess: () => {
      toast.success("Attendance marked");
      void qc.invalidateQueries({ queryKey: ["student", studentId] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not mark attendance")),
  });
}

export function useDeleteAttendance(studentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => studentsService.deleteAttendance(studentId as number, id),
    onSuccess: () => {
      toast.success("Attendance record removed");
      void qc.invalidateQueries({ queryKey: ["student", studentId] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not remove the record")),
  });
}

/* --------------------------------------------------------------- documents */

export function useStudentDocuments(studentId: number | null) {
  return useQuery({
    queryKey: ["student", studentId, "documents"],
    queryFn: () => studentsService.documents(studentId as number),
    enabled: studentId != null,
  });
}
