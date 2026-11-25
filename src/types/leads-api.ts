/**
 * Backend wire types — mirror the live API exactly (snake_case, integer PKs)
 * as documented in `docs/be-mds/*`. These are what services send/receive;
 * `data/lead-adapters.ts` maps them to the rich UI model in `types/leads.ts`.
 *
 * Fields the BE does not yet provide (see `docs/lead-additional.md`) are typed
 * optional so the client is forward-compatible when they ship.
 */

export type ApiLeadType = "course_inquiry" | "master_class" | "corporate" | "general_inquiry";

/* ------------------------------------------------------------- config lookups */

export interface ApiLeadSource {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  /** Protected sources cannot be deleted (staff toggle via PATCH). */
  is_protected: boolean;
}

export interface ApiCampaign {
  id: number;
  name: string;
  source: number | null;
  source_name?: string;
  start_date?: string | null;
  end_date?: string | null;
  budget?: string | null;
  is_active: boolean;
}

export interface ApiLeadStatus {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  is_final: boolean;
  is_active: boolean;
}

export interface ApiLeadPriority {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export interface ApiLeadTag {
  id: number;
  name: string;
  color: string;
  is_active: boolean;
}

/** Lead type is a FK lookup on the live backend (`/api/lead-types/`). */
export interface ApiLeadTypeConfig {
  id: number;
  name: string;
  code?: string;
  sort_order?: number;
  is_active?: boolean;
}

/** `/api/learning-modes/` — see lead_app_overview.md §Learning Modes. */
export interface ApiLearningMode {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
}

/** `/api/institutions/` — see lead_app_overview.md §Institutions. */
export interface ApiInstitution {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  is_active: boolean;
}

/* --------------------------------------------------------------------- lead */

export interface ApiLeadNextFollowup {
  id: number;
  scheduled_at: string;
  purpose: string;
  assigned_to: number;
  assigned_to_name: string;
}

export interface ApiEnrollmentSummary {
  is_enrolled: boolean;
  latest_status: string | null;
  course: string | null;
  batch: string | null;
}

export interface ApiLead {
  id: number;
  /** Future — see lead-additional.md §6. */
  reference_number?: string | null;
  full_name: string;
  phone: string;
  secondary_phone: string | null;
  email: string | null;
  address: string | null;
  /** Numeric FK id on the live backend; legacy string enum on older builds. */
  lead_type: number | ApiLeadType | null;
  lead_type_name?: string;
  lead_score: number;
  expected_revenue: string | null;
  next_followup_at: string | null;
  last_contact_at: string | null;
  notes: string | null;
  is_converted: boolean;
  converted_at: string | null;
  is_archived?: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: number | null;
  created_at: string;
  updated_at: string;

  // location
  province?: number | null;
  province_name?: string;
  city?: number | null;
  city_name?: string;
  landmark?: string | null;
  heard_from?: string | null;

  // FK ids
  source: number | null;
  campaign: number | null;
  branch: number | null;
  priority: number | null;
  status: number | null;
  assigned_counselor: number | null;
  primary_course: number | null;
  created_by: number | null;
  updated_by: number | null;
  tags: number[];

  custom_data?: Record<string, unknown>;
  enrollment_summary?: ApiEnrollmentSummary | null;

  // denormalized read-only labels (present on detail; may be partial on list)
  status_name?: string;
  status_color?: string;
  priority_name?: string;
  priority_color?: string;
  source_name?: string;
  campaign_name?: string;
  primary_course_name?: string;
  branch_name?: string;
  assigned_counselor_name?: string;
  created_by_name?: string;
  updated_by_name?: string | null;
  call_count?: number;
  next_followup?: ApiLeadNextFollowup | null;
}

/** Writable payload for POST/PATCH /api/leads/. */
export interface ApiLeadPayload {
  full_name?: string;
  phone?: string;
  /** Save even when another lead has this phone number. */
  allow_duplicate_phone?: boolean;
  secondary_phone?: string | null;
  email?: string | null;
  address?: string | null;
  /** Live backend expects the numeric lead-type id; string enum kept for compat. */
  lead_type?: number | ApiLeadType | null;
  expected_revenue?: string | null;
  notes?: string | null;
  source?: number | null;
  campaign?: number | null;
  branch?: number | null;
  priority?: number | null;
  status?: number | null;
  assigned_counselor?: number | null;
  primary_course?: number | null;
  province?: number | null;
  city?: number | null;
  landmark?: string | null;
  heard_from?: string | null;
  tags?: number[];
  custom_data?: Record<string, unknown>;
}

/* ----------------------------------------------------------- nested records */

export interface ApiLeadCall {
  id: number;
  lead: number;
  call_timestamp: string;
  direction: "inbound" | "outbound";
  /** User FK id of who made the call (backend requires it). */
  caller: number | string | null;
  caller_name?: string;
  phone_number: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  notes: string | null;
  recording_url: string | null;
  next_followup_at: string | null;
  next_action: string | null;
  created_by?: number | null;
  created_by_name?: string;
  created_at: string;
}

export type ApiActivityType =
  | "call"
  | "whatsapp"
  | "note"
  | "meeting"
  | "status_change"
  | "assignment_change"
  | "demo_class"
  | "payment"
  | "enrollment";

export interface ApiLeadActivity {
  id: number;
  lead: number;
  activity_type: ApiActivityType;
  title: string;
  description: string | null;
  activity_at: string;
  created_by?: number | null;
  created_by_name?: string;
  created_at?: string;
}

export type ApiFollowupStatus = "pending" | "completed" | "missed" | "cancelled";

export interface ApiFollowup {
  id: number;
  lead: number;
  assigned_to: number | null;
  assigned_to_name?: string;
  scheduled_at: string;
  purpose: string | null;
  /** Set on payment follow-ups made by the reminder job. */
  enrollment?: number | null;
  enrollment_course_name?: string | null;
  reminder_at: string | null;
  status: ApiFollowupStatus;
  completed_at?: string | null;
  notes?: string | null;
  branch?: number | null;
  created_at?: string;
}

export interface ApiLeadDocument {
  id: number;
  lead: number;
  document_type: string;
  file: string;
  created_at?: string;
}

export type ApiInterestLevel = "high" | "medium" | "low";

export type ApiEnquiryStage = "new" | "contacted" | "interested" | "won" | "lost";

export type ApiLostReason =
  | "too_expensive"
  | "other_institute"
  | "timing"
  | "not_reachable"
  | "not_interested"
  | "other";

/** An enquiry: one person asking about one course, with its own stage. */
export interface ApiCourseInterest {
  id: number;
  lead: number;
  course: number | null;
  course_name?: string;
  about?: string;
  description?: string;
  is_primary: boolean;
  interest_level: ApiInterestLevel;
  created_at?: string;
  updated_at?: string;
  stage?: ApiEnquiryStage;
  stage_display?: string;
  stage_changed_at?: string;
  counselor?: number | null;
  counselor_name?: string | null;
  source?: number | null;
  source_name?: string | null;
  branch?: number | null;
  branch_name?: string | null;
  lost_reason?: ApiLostReason | null;
  lost_reason_display?: string | null;
  lost_note?: string;
  lost_at_stage?: ApiEnquiryStage | null;
  lost_at_stage_display?: string | null;
  enrollment?: number | null;
  created_by?: number | null;
  created_by_name?: string | null;
}

export interface ApiEnquiryStageChange {
  id: number;
  from_stage: ApiEnquiryStage;
  from_stage_display: string;
  to_stage: ApiEnquiryStage;
  to_stage_display: string;
  note: string;
  changed_by: number | null;
  changed_by_name: string | null;
  created_at: string;
}

export type ApiEnrollmentStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "dropped_out"
  | "transferred";

export interface ApiEnrollment {
  id: number;
  lead?: number;
  lead_name?: string;
  course: number;
  course_name?: string;
  student: number | null;
  student_name?: string | null;
  /** The money batch: the batch first joined. Fees count here; fixed once confirmed. */
  batch: number | null;
  batch_name?: string | null;
  /** Where the student sits now. null = not in a batch (paused, left or not placed). */
  current_batch?: number | null;
  current_batch_name?: string | null;
  /** seated = in a batch now; paused; none = never placed, or left. */
  seat_state?: ApiSeatState;
  /** Seat history, newest first. */
  placements?: ApiPlacement[];
  /** What is due, oldest first, with what is paid on each. Empty while pending. */
  due_dates?: ApiDueRow[];
  /** An active course-fee invoice exists. */
  has_fee_invoice?: boolean;
  /** The Teams licence the student holds now, or null. */
  teams_licence?: {
    id: number;
    teams_account: number | null;
    account: string;
    assigned_at: string;
    paused_at?: string | null;
    details_sent_at?: string | null;
    details_sent_to?: string;
    state: ApiTeamsState;
    state_label: string;
    reason: string;
  } | null;
  enrollment_date: string | null;
  status: ApiEnrollmentStatus;
  listed_fee: string;
  standard_discount: string;
  additional_discount: string;
  agreed_amount: string;
  remarks: string | null;
  branch?: number | null;
  branch_name?: string | null;
  total_paid: string;
  /** Sums of the money entries (see ApiAdjustment). */
  extra_charges_total?: string;
  discounts_total?: string;
  write_offs_total?: string;
  refunds_total?: string;
  /** agreed + extra charges - discounts - write-offs - paid + refunds. Below 0 = credit. */
  remaining_amount: string;
  is_full_paid: boolean;
  created_by?: number | null;
  created_by_name?: string;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type ApiSeatState = "seated" | "paused" | "none";

export type ApiDueStatus = "paid" | "part_paid" | "due" | "late";

/** One payment reminder sent for an enrollment (lead.ReminderLog). */
export interface ApiReminderLog {
  id: number;
  due_on: string;
  amount: string;
  step: "before_due" | "due_today" | "late" | "call";
  step_display: string;
  channel: "email" | "sms" | "follow_up";
  channel_display: string;
  sent_to: string;
  status: "sending" | "sent" | "failed" | "skipped";
  status_display: string;
  error: string;
  followup: number | null;
  created_at: string;
}

/** One row of services.due_rows(): a part of the plan, or an extra charge. */
export interface ApiDueRow {
  kind: "part" | "extra_charge";
  /** null = no due date set (enrollments confirmed before due dates existed). */
  due_on: string | null;
  amount: string;
  paid: string;
  left: string;
  status: ApiDueStatus;
  days_late: number;
}

/** One due date sent to Confirm or Change due dates. */
export interface ApiDuePart {
  due_on: string;
  amount: string;
}

/** One seat change — mirrors lead.Placement.Kind. */
export type ApiPlacementKind = "join" | "move" | "pause" | "resume" | "leave";

/** One row of an enrollment's seat history. Rows are only added, never edited. */
export interface ApiPlacement {
  id: number;
  kind: ApiPlacementKind;
  kind_display: string;
  /** The batch sat in from this row on; null for pause and leave. */
  course_batch: number | null;
  course_batch_name: string | null;
  /** Where the student came from (move, resume) or left (pause, leave). */
  from_batch: number | null;
  from_batch_name: string | null;
  started_on: string;
  reason: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

/** The four seat actions on an enrollment. */
export type ApiSeatAction = "join" | "move" | "pause" | "resume";

export interface ApiSeatActionBody {
  /** Needed for join, move and resume. */
  batch?: number;
  /** Needed for move, pause and resume (optional for join). */
  reason: string;
  /** Day the change takes effect; today if left out. */
  started_on?: string;
}

export interface ApiEnrollmentPayload {
  course?: number;
  student?: number | null;
  batch?: number | null;
  enrollment_date?: string | null;
  status?: ApiEnrollmentStatus;
  listed_fee?: string;
  standard_discount?: string;
  additional_discount?: string;
  agreed_amount?: string;
  remarks?: string | null;
  branch?: number | null;
}

/** Query params for GET /api/leads/{lead}/enrollments/. */
export interface EnrollmentListParams {
  course?: number;
  status?: ApiEnrollmentStatus | string;
  /** Batch **name** (per the API guide), not the FK id. */
  batch?: string;
  enrollment_date__gte?: string;
  enrollment_date__lte?: string;
  /** `id`, `enrollment_date`, `status` (prefix `-` to reverse). */
  ordering?: string;
  page?: number;
  page_size?: number;
  /** Branch scoping (staff only). */
  branch_id?: number;
}

export type ApiPaymentStatus = "pending" | "successful" | "failed" | "refunded" | "voided";
export type ApiPaymentMethod = "cash" | "esewa" | "khalti" | "bank_transfer" | "card" | "connectips";

/** The payment taken with Confirm when nothing is paid yet. */
export interface ApiFirstPayment {
  amount: string;
  payment_method: ApiPaymentMethod;
  transaction_reference?: string;
}

export interface ApiPayment {
  id: number;
  enrollment?: number;
  amount: string;
  payment_date: string;
  payment_method: ApiPaymentMethod;
  transaction_reference: string | null;
  status: ApiPaymentStatus;
  notes: string | null;
  branch?: number | null;
  received_by?: number | null;
  received_by_name?: string;
  /** Set when the payment was voided (with a required reason). */
  void_reason?: string | null;
  voided_by?: number | null;
  voided_by_name?: string | null;
  voided_at?: string | null;
  created_at?: string;
}

export type ApiAdjustmentKind = "extra_charge" | "discount" | "write_off" | "refund";

/** A money entry on an enrollment besides payments. Only ever added, always with a reason. */
export interface ApiAdjustment {
  id: number;
  enrollment: number;
  kind: ApiAdjustmentKind;
  kind_display: string;
  amount: string;
  reason: string;
  branch: number | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
}

/** What a reason-trail row records — mirrors EnrollmentHistory.Action. */
export type ApiHistoryAction =
  | "confirm"
  | "join_batch"
  | "cancel"
  | "reinstate"
  | "switch_batch"
  | "pause"
  | "resume"
  | "change_fee"
  | "extra_charge"
  | "discount"
  | "refund"
  | "write_off"
  | "void_payment"
  | "cancel_invoice"
  | "change_due_dates";

/** One row of an enrollment's reason trail — GET .../enrollments/{id}/history/. */
export interface ApiEnrollmentHistory {
  id: number;
  enrollment: number;
  action: ApiHistoryAction;
  action_display: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  performed_by: number;
  performed_by_name: string | null;
  created_at: string;
}

export interface ApiPaymentPayload {
  amount?: string;
  payment_date?: string;
  payment_method?: ApiPaymentMethod;
  transaction_reference?: string | null;
  status?: ApiPaymentStatus;
  notes?: string | null;
}

/** Query params for GET /api/leads/{lead}/enrollments/{id}/payments/. */
export interface PaymentListParams {
  payment_method?: ApiPaymentMethod | string;
  status?: ApiPaymentStatus | string;
  payment_date__gte?: string;
  payment_date__lte?: string;
  /** `payment_date` (prefix `-` to reverse). */
  ordering?: string;
  page?: number;
  page_size?: number;
}

/* --------------------------------------------------------------- locations */

export interface ApiProvince {
  id: number;
  name: string;
  code?: string;
  is_active: boolean;
}

export interface ApiCity {
  id: number;
  name: string;
  province: number | null;
  province_name?: string;
  is_active: boolean;
}

/* -------------------------------------------- global (cross-lead) list rows */
/* Flat read-only rows from /api/followups/, /api/enrollments/, /api/payments/. */

export interface ApiFollowupListRow {
  id: number;
  lead: number;
  lead_name: string;
  lead_phone?: string;
  assigned_to: number | null;
  assigned_to_name?: string;
  scheduled_at: string;
  purpose: string | null;
  status: ApiFollowupStatus;
  enrollment?: number | null;
  enrollment_course_name?: string | null;
  branch?: number | null;
  branch_name?: string;
}

export interface ApiEnrollmentListRow {
  id: number;
  lead: number;
  lead_name: string;
  student: number | null;
  student_name?: string | null;
  course: number;
  course_name?: string;
  /** The money batch. */
  batch: number | null;
  batch_name?: string | null;
  /** The batch the student sits in now. */
  current_batch?: number | null;
  current_batch_name?: string | null;
  status: ApiEnrollmentStatus;
  enrollment_date: string | null;
  listed_fee: string;
  agreed_amount: string;
  total_paid: string;
  remaining_amount: string;
  is_full_paid: boolean;
  branch?: number | null;
  branch_name?: string;
  created_at?: string;
}

export interface ApiPaymentListRow {
  id: number;
  enrollment: number;
  lead: number;
  lead_name: string;
  course_name?: string;
  amount: string;
  payment_date: string;
  payment_method: ApiPaymentMethod;
  transaction_reference: string | null;
  status: ApiPaymentStatus;
  received_by?: number | null;
  received_by_name?: string;
  branch?: number | null;
  branch_name?: string;
}

/* ---------------------------------------------------------------- branches */

export interface ApiBranch {
  id: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiBranchPayload {
  name?: string;
  code?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}

/* ---------------------------------------------------------------- students */

export type ApiStudentStatus = "active" | "inactive" | "graduated" | "dropped" | "transferred";
export type ApiGender = "male" | "female" | "other";

/** One of the last 5 payments returned on the student detail response. */
export interface ApiStudentRecentPayment {
  amount: string;
  payment_date: string;
  payment_method: ApiPaymentMethod;
  status: ApiPaymentStatus;
  /** Course display name, not an id. */
  course: string | null;
  transaction_reference: string | null;
}

export interface ApiStudent {
  id: number;
  student_id: string;
  full_name: string;
  phone: string;
  secondary_phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: ApiGender | null;
  address: string | null;
  city: string | null;
  state: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_relation: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  enrolled_at: string | null;
  status: ApiStudentStatus;
  photo_url: string | null;
  notes: string | null;
  source: number | null;
  lead: number | null;
  branch: number | null;
  assigned_counselor: number | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  // denormalized
  source_name?: string;
  branch_name?: string;
  assigned_counselor_name?: string;
  created_by_name?: string;
  updated_by_name?: string | null;
  document_count?: number;

  /* Payment summary — detail response only (GET /api/students/{id}/). */
  /** Sum of successful payments across every enrollment. */
  total_paid?: string;
  enrollment_count?: number;
  recent_payments?: ApiStudentRecentPayment[];
}

export interface ApiStudentPayload {
  full_name?: string;
  phone?: string;
  secondary_phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: ApiGender | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_relation?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  source?: number | null;
  lead?: number | null;
  branch?: number | null;
  assigned_counselor?: number | null;
  enrolled_at?: string | null;
  status?: ApiStudentStatus;
  photo_url?: string | null;
  notes?: string | null;
}

/** File attached to a student profile — `/api/students/{id}/documents/`. */
export interface ApiStudentDocument {
  id: number;
  student?: number;
  document_type: string;
  /** Uploaded file URL (see upload_api_guide.md). */
  file: string;
  created_at?: string;
}

/* -------------------------------------------------------------- attendance */

export type ApiAttendanceStatus = "present" | "absent";

export interface ApiAttendance {
  id: number;
  student: number;
  student_name?: string;
  course: number | null;
  course_name?: string | null;
  date: string;
  status: ApiAttendanceStatus;
  remarks: string | null;
  marked_by_name?: string;
}

export interface ApiAttendancePayload {
  date?: string;
  status?: ApiAttendanceStatus;
  course?: number | null;
  remarks?: string | null;
}

export interface AttendanceListParams {
  status?: ApiAttendanceStatus;
  course?: number;
  date__gte?: string;
  date__lte?: string;
  page?: number;
  page_size?: number;
}

export interface ApiAttendanceMonth {
  /** `YYYY-MM`. */
  month: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

/** GET /api/students/{id}/attendance_profile/ — stats + streaks. */
export interface ApiAttendanceProfile {
  current_streak: number;
  longest_streak: number;
  attendance_percentage: number;
  total_classes: number;
  present_count: number;
  absent_count: number;
  monthly_breakdown: ApiAttendanceMonth[];
  recent_records: ApiAttendance[];
}

/* ------------------------------------------------------------------ upload */

export interface ApiUpload {
  key: string;
  url: string;
  filename: string;
  size: number;
}

/* ------------------------------------------------------------ Teams licences */

/** Worked out from the student's enrollment. Retired accounts are not counted. */
export type ApiTeamsState = "ready" | "in_use" | "safe_to_remove" | "action_required" | "retired";

export interface ApiTeamsLicence {
  id: number;
  enrollment: number;
  lead: number;
  name: string;
  student_id: string | null;
  course_name: string;
  /** The batch the student sits in now. */
  batch_name: string | null;
  teams_account: number | null;
  account: string;
  assigned_by: number;
  assigned_by_name: string;
  assigned_at: string;
  released_at: string | null;
  released_by: number | null;
  released_by_name: string | null;
  release_reason: string | null;
  /** Set while the student is paused. */
  paused_at: string | null;
  details_sent_at: string | null;
  details_sent_to: string;
  /** Null once taken back. */
  state: { state: ApiTeamsState; label: string; reason: string } | null;
  /** Only when sign-in details were emailed with this request. */
  email?: { status: "sent" | "failed" | "skipped" | "queued"; to: string; error: string };
}

export interface ApiTeamsAccountLicence {
  id: number;
  /** In use at another branch: no student details. */
  other_branch: boolean;
  enrollment?: number;
  enrollment_status?: ApiEnrollmentStatus;
  lead?: number;
  student_id?: string | null;
  name?: string;
  email?: string | null;
  course_name?: string;
  batch_name?: string | null;
  branch_name?: string | null;
  assigned_at?: string;
  assigned_by_name?: string | null;
  paused_at?: string | null;
  details_sent_at?: string | null;
  details_sent_to?: string;
}

export interface ApiTeamsAccount {
  id: number;
  email: string;
  /** Empty: any branch may give it. */
  branch: number | null;
  branch_name: string | null;
  is_active: boolean;
  state: ApiTeamsState;
  state_label: string;
  reason: string;
  retired_at: string | null;
  licence: ApiTeamsAccountLicence | null;
}

export interface ApiTeamsAccountParams {
  state?: ApiTeamsState;
  search?: string;
  /** Accounts that can be given at this branch (its own and the shared ones). */
  give_at?: number;
  branch_id?: number;
}

export interface ApiTeamsSummary {
  /** Active accounts. */
  total: number;
  ready: number;
  in_use: number;
  safe_to_remove: number;
  action_required: number;
  retired: number;
}

export interface ApiTeamsLicenceParams {
  page?: number;
  page_size?: number;
  search?: string;
  /** true: in use now; false: freed. */
  open?: boolean;
  enrollment?: number;
  batch?: number;
  student?: number;
  branch_id?: number;
}

/** A lead found by phone number, from any branch. */
export interface ApiPhoneMatch {
  id: number;
  reference_number: string;
  full_name: string;
  phone: string | null;
  secondary_phone: string | null;
  email: string | null;
  branch: number | null;
  branch_name: string | null;
  counselor_name: string | null;
  status_name: string | null;
  is_converted: boolean;
  is_archived: boolean;
  created_at: string;
  enquiries: {
    id: number;
    course: number | null;
    course_name: string | null;
    stage: ApiEnquiryStage;
    stage_display: string;
    branch_name: string | null;
  }[];
}


/** A voice note on an enquiry. The recording plays from voice-notes/{id}/audio/. */
export interface ApiVoiceNote {
  id: number;
  lead: number;
  enquiry: number | null;
  course_name: string | null;
  content_type: string;
  size_bytes: number;
  duration_seconds: number;
  note: string;
  branch: number | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export type ApiTimelineKind =
  | "lead"
  | "enquiry"
  | "call"
  | "note"
  | "follow_up"
  | "voice_note"
  | "enrollment"
  | "batch"
  | "money"
  | "teams"
  | "reminder"
  | "document"
  | "email";

/** One row of a lead's full history (GET /leads/{id}/timeline/). */
export interface ApiTimelineItem {
  id: string;
  kind: ApiTimelineKind;
  at: string;
  title: string;
  detail: string;
  by: string | null;
  course: string | null;
  enrollment: number | null;
  enquiry: number | null;
  voice_note: number | null;
  amount: string | null;
  duration_seconds: number | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

/* ------------------------------------------------------- import / export */

export type ApiLeadFileType = "csv" | "xlsx";

/** The import file, what to do with duplicates, and defaults for blank cells (ids). */
export interface ApiLeadImportOptions {
  file: File;
  duplicates?: "skip" | "import";
  default_lead_type?: number;
  default_source?: number;
  default_status?: number;
  default_priority?: number;
  default_course?: number;
  default_branch?: number;
  default_counselor?: number;
}

export interface ApiLeadImportMatch {
  id: number;
  reference_number: string;
  full_name: string;
  branch_name: string | null;
}

export interface ApiLeadImportRow {
  /** Row number in the file (the header is row 1). */
  row: number;
  status: "ready" | "duplicate" | "error";
  full_name: string;
  phone: string;
  email: string;
  course: string;
  branch: string;
  counselor: string;
  errors: string[];
  warnings: string[];
  /** Leads already in the CRM with this phone. */
  matches: ApiLeadImportMatch[];
  /** An earlier row of the file with the same phone. */
  same_as_row: number | null;
}

export interface ApiLeadImportPreview {
  file_name: string;
  total: number;
  ready: number;
  duplicates: number;
  errors: number;
  columns: { header: string; column: string }[];
  ignored: string[];
  rows: ApiLeadImportRow[];
}

export interface ApiLeadImportResultRow {
  row: number;
  full_name: string;
  status: "created" | "skipped" | "failed";
  message?: string;
  lead_id?: number;
  reference_number?: string;
}

export interface ApiLeadImportResult {
  file_name: string;
  created: number;
  skipped: number;
  failed: number;
  rows: ApiLeadImportResultRow[];
}
