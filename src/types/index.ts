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
 * A shift (Morning / Day / Evening) — `/api/batches/`.
 * Not a cohort: a cohort is a `CourseBatch`, which points at one of these.
 */
export interface Batch {
  id: number;
  name: string;
  /** Older slots kept the time as text here; new ones use start_time and end_time. */
  description: string | null;
  /** "06:00" — a time of day; the end is after the start, same day. */
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  branch: number | null;
  created_by: number | null;
  created_at?: string;
  updated_at?: string;
}

export type BatchPayload = Partial<
  Pick<Batch, "name" | "description" | "start_time" | "end_time" | "is_active" | "branch">
>;

export interface BatchListParams {
  page?: number;
  page_size?: number;
  search?: string;
  name?: string;
  is_active?: boolean;
  ordering?: string;
  branch_id?: number;
}

/** A specific run of a course — named cohort + shift + dates. */
/** Upcoming and running batches take students; a closed one takes no one new. */
export type CourseBatchStatus = "upcoming" | "running" | "closed";
export type CourseBatchMode = "physical" | "online";

export interface CourseBatch {
  id: number;
  name: string;
  /** Auto-generated on the backend, e.g. `PY-2026-001`. Read-only. */
  coursebatch_id: string;
  course: number;
  course_name?: string;
  batch: number | null;
  batch_name?: string | null;
  /** The shift's times, "HH:MM" (read-only). */
  batch_start_time?: string | null;
  batch_end_time?: string | null;
  start_date: string | null;
  end_date: string | null;
  /** Number of seats. Required; null only on older batches made before that, which take no one. */
  capacity: number | null;
  mode: CourseBatchMode;
  mode_display?: string;
  status: CourseBatchStatus;
  status_display?: string;
  trainer: string | null;
  /** Students sitting in the batch now (read-only). */
  seats_taken?: number;
  /** capacity - seats_taken, never below 0. null when no seats are set. */
  seats_left?: number | null;
  /** Pending enrollments that chose this batch; they take a seat on confirm. */
  waiting_count?: number;
  is_active: boolean;
  branch: number | null;
  branch_name?: string | null;
  created_by: number | null;
  created_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** One row of GET /course-batches/{id}/students/. */
export interface BatchStudentRow {
  enrollment: number;
  lead: number;
  name: string;
  phone: string | null;
  student_id: string | null;
  status: string;
  /** Day they joined, moved in, resumed — or paused, on a paused row. */
  since: string | null;
  how: "join" | "move" | "resume" | "pause" | null;
  how_display: string;
  from_batch: number | null;
  from_batch_name: string | null;
  /** The batch their fees count on. */
  money_batch: number | null;
  money_batch_name: string | null;
  /** True when the money batch is another batch: this batch's revenue leaves them out. */
  moved_in: boolean;
}

export interface BatchStudents {
  seated: BatchStudentRow[];
  paused: BatchStudentRow[];
}

/** A batch's money, counted on the batch the student first joined. Money is a string. */
export interface BatchFigures {
  students: number;
  fees: string;
  collected: string;
  owed: string;
  costs: string;
  /** collected - costs */
  profit: string;
}

export type BatchCostKind = "trainer" | "venue" | "licences" | "other";

export interface BatchCost {
  id: number;
  course_batch: number;
  kind: BatchCostKind;
  kind_display: string;
  amount: string;
  spent_on: string;
  note: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  voided_at: string | null;
  voided_by: number | null;
  voided_by_name: string | null;
  void_reason: string | null;
}

export interface BatchCostPayload {
  kind: BatchCostKind;
  amount: string;
  spent_on?: string;
  note?: string;
}

/** A close or reopen of a batch. A close row keeps the figures of that day. */
export interface BatchClosing {
  id: number;
  kind: "close" | "reopen";
  kind_display: string;
  reason: string;
  students: number | null;
  fees: string | null;
  collected: string | null;
  owed: string | null;
  costs: string | null;
  profit: string | null;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

/** GET /course-batches/{id}/money/ */
export interface BatchMoney {
  batch: number;
  status: CourseBatchStatus;
  figures: BatchFigures;
  /** Closed batches only: the figures kept at close, and what came after. */
  at_close: BatchFigures | null;
  after_close: BatchFigures | null;
  closed_at: string | null;
  costs: BatchCost[];
  closings: BatchClosing[];
}

export type CourseBatchPayload = Partial<
  Pick<
    CourseBatch,
    | "name"
    | "course"
    | "start_date"
    | "end_date"
    | "capacity"
    | "mode"
    | "status"
    | "trainer"
    | "is_active"
    | "branch"
  >
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
  /** One status, or several (sent as repeated `status=` params). */
  status?: CourseBatchStatus | CourseBatchStatus[];
  mode?: CourseBatchMode;
  ordering?: string;
  branch_id?: number;
}
