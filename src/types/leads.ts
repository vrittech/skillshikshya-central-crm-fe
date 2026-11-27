/**
 * Lead-management domain types: the UI shape of a lead (camelCase, resolved
 * lookup labels). `data/lead-adapters.ts` maps the API rows into it.
 */

/** Lead lifecycle status (the plan's controlled `lead_statuses`). */
export type LeadStatusCode =
  | "new"
  | "contact_attempted"
  | "contacted"
  | "follow_up_scheduled"
  | "qualified"
  | "counseling_completed"
  | "enrollment_pending"
  | "enrolled"
  | "lost"
  | "not_interested"
  | "invalid"
  | "duplicate"
  | "on_hold";

/** Priority mirrors the workbook's HOT / WARM / COOL / COLD colour system. */
export type LeadPriorityCode = "hot" | "warm" | "cool" | "cold";

/** Lead source — the real acquisition channels found in the workbook. */
export type LeadSourceCode =
  | "website"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "whatsapp"
  | "viber"
  | "telephone"
  | "direct_call"
  | "walk_in"
  | "referral"
  | "online_counseling"
  | "google_search"
  | "shramsansar"
  | "orbit"
  | "manual_entry";

export type CourseKind = "course" | "master_class" | "job_ready_program";

export type LearningMode = "online" | "office" | "hybrid" | "undecided";
export type Shift = "morning" | "day" | "evening" | "weekend" | "flexible";
export type EducationLevel = "see" | "plus_two" | "diploma" | "bachelors" | "masters" | "other";

/** The activity types that make up the lead timeline. */
export type ActivityType =
  | "form_submission"
  | "call"
  | "email"
  | "whatsapp"
  | "sms"
  | "office_visit"
  | "online_meeting"
  | "note"
  | "follow_up"
  | "status_change"
  | "assignment_change"
  | "enrollment"
  | "payment";

/** Call outcomes — reconciled from the workbook's Call Status / Action columns. */
export type CallOutcome =
  | "interested"
  | "follow_up_required"
  | "no_answer"
  | "busy"
  | "switched_off"
  | "wrong_number"
  | "not_interested"
  | "requested_details"
  | "requested_counseling"
  | "enrolled_elsewhere"
  | "call_back_later"
  | "do_not_contact";

export type EnrollmentStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "dropped_out"
  | "transferred";

export type PaymentStatus = "pending" | "successful" | "failed" | "refunded" | "voided";
export type PaymentMethod = "cash" | "esewa" | "khalti" | "bank_transfer" | "card" | "connectips";

export interface Counselor {
  id: string;
  name: string;
  initials: string;
}

export interface CourseInterest {
  courseId: string;
  courseName: string;
  isPrimary: boolean;
  interestLevel: "high" | "medium" | "low";
}

export interface Activity {
  id: string;
  /** Calls only — backend LeadCall id (for PATCH updates). */
  apiCallId?: number;
  type: ActivityType;
  /** ISO timestamp. */
  at: string;
  performedBy: string;
  title: string;
  notes?: string;
  channel?: LeadSourceCode | "phone" | "email" | "whatsapp";
  outcome?: CallOutcome;
  /** Calls only — inbound vs outbound, for the call-history table. */
  direction?: "inbound" | "outbound";
  durationSeconds?: number;
  /** Calls only — recording URL, editable after logging. */
  recordingUrl?: string;
  followUpAt?: string;
  /** Calls only — the agreed next step after this touchpoint. */
  nextAction?: string;
}

export interface FollowUp {
  id: string;
  dueAt: string;
  purpose: string;
  assignedTo: string;
  status: "pending" | "completed" | "overdue" | "cancelled";
}

export interface Payment {
  id: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  reference?: string;
  status: PaymentStatus;
  receivedBy: string;
  notes?: string;
}

export interface Enrollment {
  id: string;
  courseName: string;
  batch: string;
  enrolledAt: string;
  status: EnrollmentStatus;
  listedFee: number;
  standardDiscount: number;
  additionalDiscount: number;
  agreedAmount: number;
  remarks?: string;
}

export interface StatusChange {
  id: string;
  at: string;
  from: LeadStatusCode | null;
  to: LeadStatusCode;
  by: string;
  reason?: string;
}

export interface AssignmentChange {
  id: string;
  at: string;
  from: string | null;
  to: string | null;
  by: string;
  reason?: string;
}

/** Type-specific attributes — the plan's controlled `custom_data` JSONB. */
export interface LeadCustomData {
  preferredLearningMode?: LearningMode;
  preferredShift?: Shift;
  preferredTiming?: string;
  preferredCourseDuration?: string;
  hasLaptop?: boolean | null;
  institutionName?: string;
  educationLevel?: EducationLevel;
  emergencyContact?: { name: string; phone: string; relationship: string };
  referral?: { code?: string; referredByName?: string; referredByPhone?: string; notes?: string };
  // Master class
  masterClassTopic?: string;
  masterClassPreferredDate?: string;
  masterClassPreferredMode?: LearningMode;
  // General inquiry
  inquirySubject?: string;
  inquiryCategory?: string;
  inquiryMessage?: string;
  // Orbit / social
  externalSource?: { platform: string; externalLeadId?: string; adName?: string };
}

export interface Lead {
  id: string;
  referenceNumber: string;
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  landmark?: string;
  heardFrom?: string;
  /** Location FK ids + labels (live API path). */
  provinceId?: number | null;
  provinceName?: string;
  cityId?: number | null;
  cityName?: string;

  source: LeadSourceCode;
  campaign?: string;
  status: LeadStatusCode;
  priority?: LeadPriorityCode;
  /** Engagement/qualification score 0–100, derived from status + priority + recency. */
  score: number;
  assignedTo: string | null;

  courseInterests: CourseInterest[];
  customData: LeadCustomData;
  generalNotes?: string;

  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  closedAt?: string;

  isArchived: boolean;
  sourceSheet: string;

  /** Numeric backend id when this lead came from the API (else undefined). */
  apiId?: number;
  isConverted?: boolean;
  expectedRevenue?: number | null;

  /** Raw backend FK ids (API path only) — used to prefill edit-form dropdowns. */
  statusId?: number | null;
  priorityId?: number | null;
  sourceId?: number | null;
  campaignId?: number | null;
  branchId?: number | null;
  primaryCourseId?: number | null;
  tagIds?: number[];

  /** Display overrides for the live API path (admin-defined names + hex colors). */
  statusName?: string;
  statusColor?: string;
  priorityName?: string;
  priorityColor?: string;
  sourceName?: string;
  assignedToName?: string;
  branchName?: string;

  activities: Activity[];
  followUps: FollowUp[];
  enrollment?: Enrollment;
  payments: Payment[];
  statusHistory: StatusChange[];
  assignmentHistory: AssignmentChange[];
}

export interface LeadListItem {
  id: string;
  referenceNumber: string;
  fullName: string;
  primaryPhone: string;
  email?: string;
  source: LeadSourceCode;
  campaign?: string;
  primaryCourse?: string;
  primaryCourseId?: string;
  status: LeadStatusCode;
  priority?: LeadPriorityCode;
  score: number;
  assignedTo: string | null;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  isArchived: boolean;

  /** Numeric backend id when from the API. */
  apiId?: number;
  isConverted?: boolean;
  /** Display overrides for the live API path. */
  statusName?: string;
  statusColor?: string;
  priorityName?: string;
  priorityColor?: string;
  sourceName?: string;
  assignedToName?: string;
}
