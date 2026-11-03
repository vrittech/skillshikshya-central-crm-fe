export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  /** Group (role) IDs — M2M. Present in login/register responses, not the list serializer. */
  groups?: number[];
  /** Effective permission codenames, e.g. "account.add_user". Login/register only. */
  user_permissions?: string[];
  daily_call_target_min: number | null;
  monthly_enrollment_target: string | null;
  designation: string | null;
  phone: string | null;
  shift_start: string | null;
  shift_end: string | null;
  custom_weekly_offs: boolean;
  work_sun: boolean;
  work_mon: boolean;
  work_tue: boolean;
  work_wed: boolean;
  work_thu: boolean;
  work_fri: boolean;
  work_sat: boolean;
  exclude_from_calls: boolean;
  exclude_from_enrollment: boolean;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string | null;
  /** Assigned branch FK id (nullable). Pending backend support — see docs/user-branch-counselor-handoff.md. */
  branch: number | null;
  /** Denormalized branch label (read-only). */
  branch_name?: string | null;
  /** Remaining call minutes (read-only; consumed by lead calls, topped up by admins). */
  call_minutes_balance?: number | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  designation?: string;
  daily_call_target_min?: number;
  monthly_enrollment_target?: string;
  shift_start?: string;
  shift_end?: string;
  custom_weekly_offs?: boolean;
  work_sun?: boolean;
  work_mon?: boolean;
  work_tue?: boolean;
  work_wed?: boolean;
  work_thu?: boolean;
  work_fri?: boolean;
  work_sat?: boolean;
  exclude_from_calls?: boolean;
  exclude_from_enrollment?: boolean;
  branch?: number | null;
  groups?: number[];
}

export type UpdateUserPayload = Partial<
  Omit<User, "id" | "is_staff" | "is_superuser" | "last_login">
>;

export interface Group {
  id: number;
  name: string;
  permissions: number[];
}

export interface ApiNotification {
  id: number;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: number;
  content_type_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface ResetPasswordPayload {
  uid: string;
  token: string;
  new_password: string;
  confirm_new_password: string;
}

export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
  email?: string;
  designation?: string;
  phone?: string;
  is_active?: boolean;
  is_staff?: boolean;
  group?: number;
  /**
   * Filter users by their assigned branch. Pending backend support
   * (see docs/user-branch-counselor-handoff.md) — ignored server-side until
   * `/api/users/?branch_id=` ships, at which point this narrows the list.
   */
  branch_id?: number;
  ordering?: string;
}

export type CourseType = "course" | "master_class" | "job_ready_program";

/** `/api/course-categories/` — see course_app_apis_guide.md §Course Categories. */
export interface CourseCategory {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export type CourseCategoryPayload = Partial<Omit<CourseCategory, "id">>;

export interface Course {
  id: number;
  course_type: CourseType;
  name: string;
  full_amount: string;
  one_time_payment_discount: string | null;
  syllabus: string | null;
  remarks: string | null;
  /** Attached category IDs (write) — see course_app_apis_guide.md §Course Categories. */
  categories?: number[];
  /** Read-only display names returned by the API. */
  category_names?: string[];
}

export type CoursePayload = Partial<Omit<Course, "id">>;

export interface CourseListParams {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
  course_type?: CourseType;
  ordering?: string;
  /** Branch scoping — see lead_app_overview.md §Branch Scoping. */
  branch_id?: number;
}

/* ------------------------------------------------------------------ batches */

/**
 * A recurring time slot (Morning / Day / Evening) — `/api/batches/`.
 * Not a cohort: a cohort is a `CourseBatch`, which points at one of these.
 */
export interface Batch {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  branch: number | null;
  created_by: number | null;
  created_at?: string;
  updated_at?: string;
}

export type BatchPayload = Partial<Pick<Batch, "name" | "description" | "is_active" | "branch">>;

export interface BatchListParams {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
  is_active?: boolean;
  ordering?: string;
  branch_id?: number;
}

/** A specific run of a course — named cohort + time slot + dates. */
export interface CourseBatch {
  id: number;
  name: string;
  /** Auto-generated on the backend, e.g. `PY-2026-001`. Read-only. */
  coursebatch_id: string;
  course: number;
  course_name?: string;
  batch: number | null;
  batch_name?: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  branch: number | null;
  created_by: number | null;
  created_at?: string;
  updated_at?: string;
}

export type CourseBatchPayload = Partial<
  Pick<CourseBatch, "name" | "course" | "start_date" | "end_date" | "is_active" | "branch">
> &
  Required<Pick<CourseBatch, "batch">>;

export interface CourseBatchListParams {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
  coursebatch_id?: string;
  course?: number;
  batch?: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  ordering?: string;
  branch_id?: number;
}
