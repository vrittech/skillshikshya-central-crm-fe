/**
 * Maps backend wire types (`types/leads-api.ts`) to the rich UI model
 * (`types/leads.ts`) that the components render.
 *
 * Leads carry admin-defined status/priority as `*Name`/`*Color` display
 * fields (the badges read those); the fixed-code fields are placeholders and
 * unused. Fields the BE doesn't provide yet (custom data,
 * multi-course, enrollment, payments) come back empty — see lead-additional.md.
 */

import type {
  Activity,
  ActivityType,
  CourseInterest,
  Enrollment,
  FollowUp,
  Lead,
  LeadCustomData,
  LeadListItem,
  Payment,
} from "@/types/leads";
import type {
  ApiCourseInterest,
  ApiEnrollment,
  ApiFollowup,
  ApiLead,
  ApiLeadActivity,
  ApiLeadCall,
  ApiPayment,
} from "@/types/leads-api";

/* ------------------------------------------------------------ enum mapping */

const ACTIVITY_TYPE_MAP: Record<string, ActivityType> = {
  call: "call",
  whatsapp: "whatsapp",
  note: "note",
  meeting: "online_meeting",
  status_change: "status_change",
  assignment_change: "assignment_change",
  demo_class: "office_visit",
  payment: "payment",
  enrollment: "enrollment",
};

/* ------------------------------------------------------- custom_data (JSONB) */

interface RawEmergency {
  name?: string;
  phone?: string;
  relationship?: string;
}
interface RawReferral {
  code?: string;
  referred_by_name?: string;
  referred_by_phone?: string;
  notes?: string;
}

/** BE snake_case custom_data → UI camelCase LeadCustomData. */
export function mapCustomData(raw: Record<string, unknown> | undefined): LeadCustomData {
  if (!raw) return {};
  const g = <T>(k: string) => raw[k] as T | undefined;
  const emergency = g<RawEmergency>("emergency_contact");
  const referral = g<RawReferral>("referral");
  const out: LeadCustomData = {
    preferredLearningMode: g("preferred_learning_mode"),
    preferredShift: g("preferred_shift"),
    preferredTiming: g("preferred_timing"),
    preferredCourseDuration: g("preferred_course_duration"),
    hasLaptop: (raw.has_laptop as boolean | null | undefined) ?? undefined,
    institutionName: g("institution_name"),
    educationLevel: g("education_level"),
    masterClassTopic: g("master_class_topic"),
    inquirySubject: g("inquiry_subject"),
    inquiryCategory: g("inquiry_category"),
    inquiryMessage: g("inquiry_message"),
  };
  if (emergency)
    out.emergencyContact = {
      name: emergency.name ?? "",
      phone: emergency.phone ?? "",
      relationship: emergency.relationship ?? "",
    };
  if (referral)
    out.referral = {
      code: referral.code,
      referredByName: referral.referred_by_name,
      referredByPhone: referral.referred_by_phone,
      notes: referral.notes,
    };
  return out;
}

/** UI camelCase → BE snake_case custom_data for create/update payloads. */
export function buildCustomDataPayload(d: LeadCustomData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (d.preferredLearningMode) out.preferred_learning_mode = d.preferredLearningMode;
  if (d.preferredShift) out.preferred_shift = d.preferredShift;
  if (d.preferredTiming) out.preferred_timing = d.preferredTiming;
  if (d.preferredCourseDuration) out.preferred_course_duration = d.preferredCourseDuration;
  if (d.hasLaptop != null) out.has_laptop = d.hasLaptop;
  if (d.institutionName) out.institution_name = d.institutionName;
  if (d.educationLevel) out.education_level = d.educationLevel;
  if (d.emergencyContact) out.emergency_contact = d.emergencyContact;
  if (d.referral)
    out.referral = {
      code: d.referral.code,
      referred_by_name: d.referral.referredByName,
      referred_by_phone: d.referral.referredByPhone,
      notes: d.referral.notes,
    };
  return out;
}

export function adaptApiCourseInterest(ci: ApiCourseInterest): CourseInterest {
  return {
    courseId: String(ci.course),
    courseName: ci.course_name ?? "Course",
    isPrimary: ci.is_primary,
    interestLevel: ci.interest_level,
  };
}

export function adaptApiEnrollment(e: ApiEnrollment): Enrollment {
  return {
    id: `enr-${e.id}`,
    courseName: e.course_name ?? "Course",
    batch: e.batch_name ?? "",
    enrolledAt: e.enrollment_date ?? e.created_at ?? "",
    status: e.status,
    listedFee: Number(e.listed_fee),
    standardDiscount: Number(e.standard_discount),
    additionalDiscount: Number(e.additional_discount),
    agreedAmount: Number(e.agreed_amount),
    remarks: e.remarks ?? undefined,
  };
}

export function adaptApiPayment(p: ApiPayment): Payment {
  return {
    id: `pay-${p.id}`,
    amount: Number(p.amount),
    paidAt: p.payment_date,
    method: p.payment_method,
    reference: p.transaction_reference ?? undefined,
    status: p.status,
    receivedBy: p.received_by_name ?? "—",
    notes: p.notes ?? undefined,
  };
}

/* --------------------------------------------------------------- adapters */

export function adaptApiLeadToListItem(api: ApiLead): LeadListItem {
  return {
    id: String(api.id),
    apiId: api.id,
    referenceNumber: api.reference_number || `#${api.id}`,
    fullName: api.full_name,
    primaryPhone: api.phone,
    email: api.email ?? undefined,
    source: "manual_entry",
    sourceName: api.source_name,
    campaign: api.campaign_name ?? undefined,
    primaryCourse: api.primary_course?.name,
    primaryCourseId: api.primary_course ? String(api.primary_course.id) : undefined,
    status: "new",
    statusName: api.status_name,
    statusColor: api.status_color,
    priorityName: api.priority_name,
    priorityColor: api.priority_color,
    score: api.lead_score ?? 0,
    assignedTo: api.assigned_counselor != null ? String(api.assigned_counselor) : null,
    assignedToName: api.assigned_counselor_name,
    lastContactedAt: api.last_contact_at ?? undefined,
    nextFollowUpAt: api.next_followup_at ?? undefined,
    createdAt: api.created_at,
    isArchived: api.is_archived ?? false,
    isConverted: api.is_converted,
  };
}

/** Base lead from the detail endpoint; nested collections are attached by the hook. */
export function adaptApiLead(api: ApiLead): Lead {
  return {
    id: String(api.id),
    apiId: api.id,
    referenceNumber: api.reference_number || `#${api.id}`,
    fullName: api.full_name,
    primaryPhone: api.phone,
    secondaryPhone: api.secondary_phone ?? undefined,
    email: api.email ?? undefined,
    address: api.address ?? undefined,
    landmark: api.landmark ?? undefined,
    heardFrom: api.heard_from ?? undefined,
    provinceId: api.province ?? null,
    provinceName: api.province_name,
    cityId: api.city ?? null,
    cityName: api.city_name,
    source: "manual_entry",
    sourceName: api.source_name,
    campaign: api.campaign_name ?? undefined,
    status: "new",
    statusName: api.status_name,
    statusColor: api.status_color,
    priorityName: api.priority_name,
    priorityColor: api.priority_color,
    score: api.lead_score ?? 0,
    assignedTo: api.assigned_counselor != null ? String(api.assigned_counselor) : null,
    assignedToName: api.assigned_counselor_name,
    branchName: api.branch_name,
    courseInterests:
      api.primary_course
        ? [
            {
              courseId: String(api.primary_course.id),
              courseName: api.primary_course.name,
              isPrimary: true,
              interestLevel: "high",
            },
          ]
        : [],
    customData: mapCustomData(api.custom_data),
    generalNotes: api.notes ?? undefined,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    lastContactedAt: api.last_contact_at ?? undefined,
    nextFollowUpAt: api.next_followup_at ?? undefined,
    closedAt: api.converted_at ?? undefined,
    isArchived: api.is_archived ?? false,
    isConverted: api.is_converted,
    expectedRevenue: api.expected_revenue != null ? Number(api.expected_revenue) : null,
    statusId: api.status,
    priorityId: api.priority,
    sourceId: api.source,
    campaignId: api.campaign,
    branchId: api.branch,
    primaryCourseId: api.primary_course?.id ?? null,
    tagIds: api.tags ?? [],
    sourceSheet: "API",
    activities: [],
    followUps: [],
    payments: [],
    statusHistory: [],
    assignmentHistory: [],
  };
}

export function adaptApiCall(c: ApiLeadCall): Activity {
  const dir = c.direction === "inbound" ? "Inbound" : "Outbound";
  return {
    id: `call-${c.id}`,
    /** Backend LeadCall id — used by the edit-call dialog to PATCH. */
    apiCallId: c.id,
    type: "call",
    at: c.call_timestamp,
    performedBy: c.created_by_name ?? c.caller_name ?? "—",
    title: `${dir} call${c.outcome ? ` — ${c.outcome}` : ""}`,
    channel: "phone",
    direction: c.direction,
    outcome: (c.outcome as Activity["outcome"]) ?? undefined,
    durationSeconds: c.duration_seconds ?? undefined,
    recordingUrl: c.recording_url ?? undefined,
    notes: c.notes ?? undefined,
    nextAction: c.next_action ?? undefined,
    followUpAt: c.next_followup_at ?? undefined,
  };
}

export function adaptApiActivity(a: ApiLeadActivity): Activity {
  return {
    id: `act-${a.id}`,
    type: ACTIVITY_TYPE_MAP[a.activity_type] ?? "note",
    at: a.activity_at,
    performedBy: a.created_by_name ?? "—",
    title: a.title,
    notes: a.description ?? undefined,
  };
}

export function adaptApiFollowup(f: ApiFollowup): FollowUp {
  const status = f.status === "missed" ? "overdue" : f.status;
  return {
    id: `fu-${f.id}`,
    dueAt: f.scheduled_at,
    purpose: f.purpose ?? "Follow up",
    assignedTo: f.assigned_to_name ?? "—",
    status: status as FollowUp["status"],
  };
}
