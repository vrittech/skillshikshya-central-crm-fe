/**
 * Centralized mock lead dataset for the static CRM prototype.
 *
 * Two sources feed this file (kept here so dummy data never scatters across
 * components, per the plan's mock-data strategy):
 *   1. LEAD_SEED — 55 real, anonymized-in-spirit rows extracted from the
 *      SkillShikshya X Vrit workbook, deterministically expanded into full
 *      Lead records (status/priority mapping, dates, a small timeline).
 *   2. SHOWCASE_LEADS — a handful of hand-authored records with rich
 *      activity timelines, enrollment + payment history, and every row-state
 *      the plan asks the UI to visualise (hot, overdue, unassigned, enrolled,
 *      lost, archived).
 *
 * All timestamps are relative to a fixed TODAY so overdue/upcoming logic is
 * stable across reloads.
 */

import { TODAY } from "@/lib/leads-format";
import type {
  Activity,
  AssignmentChange,
  Lead,
  LeadListItem,
  LeadPriorityCode,
  LeadStatusCode,
  StatusChange,
} from "@/types/leads";
import { courseById, COUNSELORS, counselorName, PRIORITY_BY_CODE } from "./lead-lookups";
import { LEAD_SEED, type LeadSeed } from "./lead-seed";

/**
 * Lead score (0–100): priority base ± lifecycle stage ± recency of contact.
 * Terminal-lost states are damped; won/late-funnel states are boosted.
 */
function computeScore(
  status: LeadStatusCode,
  priority: LeadPriorityCode,
  lastContactedAt: string | undefined,
): number {
  let score = PRIORITY_BY_CODE.get(priority)?.score ?? 40;
  const stageBonus: Partial<Record<LeadStatusCode, number>> = {
    new: -5,
    contact_attempted: -5,
    contacted: 5,
    follow_up_scheduled: 8,
    qualified: 14,
    counseling_completed: 16,
    enrollment_pending: 18,
    enrolled: 20,
    lost: -30,
    not_interested: -35,
    invalid: -40,
    duplicate: -25,
    on_hold: -10,
  };
  score += stageBonus[status] ?? 0;
  if (lastContactedAt) {
    const days = (TODAY.getTime() - new Date(lastContactedAt).getTime()) / DAY;
    if (days <= 2) score += 6;
    else if (days > 21) score -= 8;
  }
  return Math.max(1, Math.min(100, Math.round(score)));
}

/* --------------------------------------------------- deterministic helpers */

/** mulberry32 — tiny seeded PRNG so the dataset is identical every load. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 24 * 60 * 60 * 1000;

function shiftDays(base: Date, days: number, hour = 10, minute = 0): string {
  const d = new Date(base.getTime() + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/* ------------------------------------------- workbook -> lifecycle mapping */

const STATUS_MAP: Record<string, { status: LeadStatusCode; priority: LeadPriorityCode }> = {
  "": { status: "new", priority: "cool" },
  "Haven't Called": { status: "new", priority: "cool" },
  Called: { status: "contacted", priority: "warm" },
  "Didn't pickup": { status: "contact_attempted", priority: "cool" },
  "Called but Needs follow up": { status: "follow_up_scheduled", priority: "hot" },
  "Follow Up Immediately": { status: "follow_up_scheduled", priority: "hot" },
  "Not for Training": { status: "not_interested", priority: "cold" },
  "wrong number": { status: "invalid", priority: "cold" },
  "No number": { status: "invalid", priority: "cold" },
  "INTL Number": { status: "on_hold", priority: "cool" },
  "Direct Visit": { status: "qualified", priority: "hot" },
  "Switched Off": { status: "contact_attempted", priority: "cold" },
  "Call not recheable": { status: "contact_attempted", priority: "cold" },
  "Online counseling": { status: "counseling_completed", priority: "warm" },
};

function mapStatus(callStatus: string): { status: LeadStatusCode; priority: LeadPriorityCode } {
  return STATUS_MAP[callStatus] ?? { status: "contacted", priority: "warm" };
}

/** Break a feedback blob ("a | b | c") into individual note lines. */
function feedbackLines(feedback: string): string[] {
  return feedback
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* --------------------------------------------------------- seed expansion */

const CITIES = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Butwal", "Biratnagar", "Chitwan"];

function ref(n: number): string {
  return `LD-2026-${String(n).padStart(5, "0")}`;
}

function expandSeed(seed: LeadSeed, seq: number): Lead {
  const rng = makeRng(1000 + seq * 97);
  const id = ref(seq);
  const { status, priority } = mapStatus(seed.callStatus);
  const isTerminal = ["not_interested", "invalid", "lost", "duplicate", "enrolled"].includes(status);

  // Spread creation over the last ~150 days.
  const createdOffset = -Math.floor(rng() * 150) - 3;
  const createdAt = shiftDays(TODAY, createdOffset, 9 + Math.floor(rng() * 9), Math.floor(rng() * 60));

  const contacted = status !== "new";
  const lastContactedAt = contacted
    ? shiftDays(TODAY, createdOffset + 1 + Math.floor(rng() * 5), 11)
    : undefined;

  // Follow-up: mix of overdue, due-today, upcoming, and none.
  let nextFollowUpAt: string | undefined;
  if (!isTerminal && status !== "new") {
    const bucket = rng();
    if (bucket < 0.3) nextFollowUpAt = shiftDays(TODAY, -1 - Math.floor(rng() * 6), 15); // overdue
    else if (bucket < 0.4) nextFollowUpAt = shiftDays(TODAY, 0, 15); // today
    else if (bucket < 0.75) nextFollowUpAt = shiftDays(TODAY, 1 + Math.floor(rng() * 10), 14); // upcoming
  }

  // ~18% unassigned pool.
  const assignedTo =
    rng() < 0.18 ? null : (seed.calledBy ? matchCounselor(seed.calledBy) : pick(rng, COUNSELORS).id);

  const course = seed.course ? courseById(seed.course) : undefined;
  const courseInterests = course
    ? [{ courseId: course.id, courseName: course.name, isPrimary: true, interestLevel: "high" as const }]
    : [];

  const notes = feedbackLines(seed.feedback);

  // Activities: creation form-submission + optional call + follow-up.
  const activities: Activity[] = [];
  activities.push({
    id: `${id}-a1`,
    type: "form_submission",
    at: createdAt,
    performedBy: "System",
    title: `Lead created from ${seed.source.replace(/_/g, " ")}`,
    channel: seed.source,
    notes: seed.message || undefined,
  });
  if (contacted && lastContactedAt) {
    activities.push({
      id: `${id}-a2`,
      type: "call",
      at: lastContactedAt,
      performedBy: counselorName(assignedTo),
      title: callTitle(seed.callStatus),
      channel: "phone",
      direction: rng() < 0.8 ? "outbound" : "inbound",
      outcome: mapOutcome(seed.callStatus),
      durationSeconds: seed.callStatus === "Called" ? 60 + Math.floor(rng() * 300) : undefined,
      notes: notes[0],
      nextAction: nextFollowUpAt ? "Follow up as scheduled" : notes[1],
    });
  }
  if (nextFollowUpAt) {
    activities.push({
      id: `${id}-a3`,
      type: "follow_up",
      at: lastContactedAt ?? createdAt,
      performedBy: counselorName(assignedTo),
      title: "Follow-up scheduled",
      followUpAt: nextFollowUpAt,
      notes: notes[1],
    });
  }
  activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const followUps = nextFollowUpAt
    ? [
        {
          id: `${id}-f1`,
          dueAt: nextFollowUpAt,
          purpose: notes[0] ? truncate(notes[0], 80) : "Confirm interest and share course details",
          assignedTo: counselorName(assignedTo),
          status: (new Date(nextFollowUpAt).getTime() < TODAY.getTime() ? "overdue" : "pending") as
            | "overdue"
            | "pending",
        },
      ]
    : [];

  const statusHistory = buildStatusHistory(id, createdAt, lastContactedAt, status, assignedTo);
  const assignmentHistory: AssignmentChange[] = assignedTo
    ? [
        {
          id: `${id}-as1`,
          at: shiftDays(new Date(createdAt), 0, 12),
          from: null,
          to: assignedTo,
          by: "Sales Manager",
        },
      ]
    : [];

  return {
    id: id,
    referenceNumber: id,
    fullName: seed.name,
    primaryPhone: seed.phone,
    email: seed.email,
    address: seed.address,
    city: seed.address ? undefined : pick(rng, CITIES),
    source: seed.source,
    campaign: seed.campaign,
    status,
    priority,
    score: computeScore(status, priority, lastContactedAt),
    assignedTo,
    courseInterests,
    customData: buildCustomData(rng),
    generalNotes: notes.length > 1 ? notes.join(" · ") : notes[0],
    createdAt,
    updatedAt: lastContactedAt ?? createdAt,
    lastContactedAt,
    nextFollowUpAt,
    closedAt: isTerminal ? lastContactedAt : undefined,
    isArchived: rng() < 0.06,
    sourceSheet: sheetOf(seed),
    activities,
    followUps,
    payments: [],
    statusHistory,
    assignmentHistory,
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function matchCounselor(name: string): string {
  const first = name.trim().toLowerCase();
  const hit = COUNSELORS.find((c) => c.name.toLowerCase().startsWith(first));
  return hit ? hit.id : COUNSELORS[0].id;
}

function callTitle(callStatus: string): string {
  switch (callStatus) {
    case "Called":
      return "Outbound call — connected";
    case "Didn't pickup":
      return "Outbound call — no answer";
    case "Switched Off":
      return "Outbound call — phone switched off";
    case "wrong number":
      return "Outbound call — wrong number";
    case "Not for Training":
      return "Outbound call — not interested in training";
    case "Direct Visit":
      return "Office visit logged";
    default:
      return "Outbound call";
  }
}

function mapOutcome(callStatus: string): Activity["outcome"] {
  switch (callStatus) {
    case "Called":
      return "interested";
    case "Didn't pickup":
      return "no_answer";
    case "Switched Off":
      return "busy";
    case "wrong number":
      return "wrong_number";
    case "Not for Training":
      return "not_interested";
    case "Called but Needs follow up":
    case "Follow Up Immediately":
      return "follow_up_required";
    default:
      return "call_back_later";
  }
}

function buildCustomData(rng: () => number): Lead["customData"] {
  return {
    preferredLearningMode: pick(rng, ["online", "office", "hybrid", "undecided"] as const),
    preferredShift: pick(rng, ["morning", "day", "evening", "weekend", "flexible"] as const),
    hasLaptop: rng() < 0.7 ? true : rng() < 0.5 ? false : null,
    educationLevel: pick(rng, ["see", "plus_two", "bachelors", "masters", "other"] as const),
    institutionName: rng() < 0.5 ? pick(rng, INSTITUTIONS) : undefined,
    preferredCourseDuration: pick(rng, ["3_months", "6_months", "flexible"]),
  };
}

const INSTITUTIONS = [
  "Islington College",
  "Patan Multiple College",
  "Nobel College",
  "Kathmandu University",
  "Tribhuvan University",
  "Milestone International College",
];

function sheetOf(seed: LeadSeed): string {
  if (seed.source === "orbit") return "Orbit Leads from sm";
  if (seed.source === "telephone") return "Telephonic enquiry";
  if (seed.campaign) return "SEE Lead";
  if (seed.source === "website") return "Website Lead";
  return "Interested-All-Courses";
}

function buildStatusHistory(
  id: string,
  createdAt: string,
  lastContactedAt: string | undefined,
  status: LeadStatusCode,
  assignedTo: string | null,
): StatusChange[] {
  const history: StatusChange[] = [
    { id: `${id}-s1`, at: createdAt, from: null, to: "new", by: "System" },
  ];
  if (status !== "new" && lastContactedAt) {
    history.push({
      id: `${id}-s2`,
      at: lastContactedAt,
      from: "new",
      to: status,
      by: counselorName(assignedTo),
    });
  }
  return history;
}

/* --------------------------------------------------------- showcase leads */

const SHOWCASE_LEADS: Lead[] = [
  // The plan's canonical example — Ram Sharma, LD-2026-00041 (rich timeline).
  {
    id: "LD-2026-00041",
    referenceNumber: "LD-2026-00041",
    fullName: "Ram Sharma",
    primaryPhone: "+9779841000000",
    secondaryPhone: "+9779800000012",
    email: "ram.sharma@example.com",
    address: "Sankhamul, Kathmandu",
    city: "Kathmandu",
    district: "Kathmandu",
    source: "website",
    campaign: "SEE 2083 Campaign",
    status: "follow_up_scheduled",
    priority: "hot",
    score: 94,
    assignedTo: "u-sangita",
    courseInterests: [
      { courseId: "uiux", courseName: "UI UX Design Diploma Course", isPrimary: true, interestLevel: "high" },
      { courseId: "frontend", courseName: "Frontend with React Diploma Course", isPrimary: false, interestLevel: "medium" },
      { courseId: "digital-marketing", courseName: "Digital Marketing Diploma Course", isPrimary: false, interestLevel: "low" },
    ],
    customData: {
      preferredLearningMode: "office",
      preferredShift: "evening",
      preferredTiming: "6:00 PM – 8:00 PM",
      preferredCourseDuration: "6_months",
      hasLaptop: true,
      institutionName: "Islington College",
      educationLevel: "bachelors",
      emergencyContact: { name: "Hari Sharma", phone: "+9779800000000", relationship: "Parent" },
      referral: { code: "REF-1042", referredByName: "Sita Thapa", notes: "Existing student referral" },
    },
    generalNotes: "Strong intent, prefers evening batch. Confirm counseling session.",
    createdAt: shiftDays(TODAY, -1, 16, 42),
    updatedAt: shiftDays(TODAY, 0, 10, 45),
    lastContactedAt: shiftDays(TODAY, 0, 10, 30),
    nextFollowUpAt: shiftDays(TODAY, 2, 15, 0),
    isArchived: false,
    sourceSheet: "Website Lead",
    activities: [
      {
        id: "sc41-a4",
        type: "follow_up",
        at: shiftDays(TODAY, 0, 10, 45),
        performedBy: "Sangita Thapa",
        title: "Follow-up scheduled for 23 July at 3:00 PM",
        followUpAt: shiftDays(TODAY, 2, 15, 0),
        notes: "Confirm preferred course and schedule counseling.",
      },
      {
        id: "sc41-a3",
        type: "call",
        at: shiftDays(TODAY, 0, 10, 30),
        performedBy: "Sangita Thapa",
        title: "Outbound call — Interested",
        channel: "phone",
        direction: "outbound",
        outcome: "interested",
        durationSeconds: 252,
        notes: "Requested details through WhatsApp. Interested in evening UI/UX batch.",
        nextAction: "Parent call to confirm counseling slot",
      },
      {
        id: "sc41-a2b",
        type: "call",
        at: shiftDays(TODAY, -1, 17, 9),
        performedBy: "Sangita Thapa",
        title: "Inbound call — Callback requested",
        channel: "phone",
        direction: "inbound",
        outcome: "call_back_later",
        durationSeconds: 198,
        notes: "Called back after reviewing the brochure; asked for a parent discussion slot.",
        nextAction: "Send fee plan on WhatsApp",
      },
      {
        id: "sc41-a2",
        type: "assignment_change",
        at: shiftDays(TODAY, -1, 9, 15),
        performedBy: "Sales Manager",
        title: "Lead assigned to Sangita Thapa",
      },
      {
        id: "sc41-a1",
        type: "form_submission",
        at: shiftDays(TODAY, -1, 16, 42),
        performedBy: "System",
        title: "Lead created from Website",
        channel: "website",
        notes: "Campaign: SEE 2083",
      },
    ],
    followUps: [
      {
        id: "sc41-f1",
        dueAt: shiftDays(TODAY, 2, 15, 0),
        purpose: "Confirm preferred course and schedule counseling session",
        assignedTo: "Sangita Thapa",
        status: "pending",
      },
    ],
    payments: [],
    statusHistory: [
      { id: "sc41-s1", at: shiftDays(TODAY, -1, 16, 42), from: null, to: "new", by: "System" },
      { id: "sc41-s2", at: shiftDays(TODAY, 0, 10, 30), from: "new", to: "contacted", by: "Sangita Thapa" },
      {
        id: "sc41-s3",
        at: shiftDays(TODAY, 0, 10, 45),
        from: "contacted",
        to: "follow_up_scheduled",
        by: "Sangita Thapa",
      },
    ],
    assignmentHistory: [
      {
        id: "sc41-as1",
        at: shiftDays(TODAY, -1, 9, 15),
        from: null,
        to: "u-sangita",
        by: "Sales Manager",
      },
    ],
  },
  // Enrolled lead with a payment plan — drives Enrollment + Payments tabs.
  {
    id: "LD-2026-00042",
    referenceNumber: "LD-2026-00042",
    fullName: "Prithvi Man Singh",
    primaryPhone: "+9779841422008",
    email: "pmearth2004@yahoo.com",
    address: "Patan, Lalitpur",
    city: "Lalitpur",
    district: "Lalitpur",
    source: "facebook",
    campaign: "Dashain Admission Campaign",
    status: "enrolled",
    priority: "hot",
    score: 100,
    assignedTo: "u-ashok",
    courseInterests: [
      { courseId: "mern", courseName: "Full-Stack MERN Diploma Course", isPrimary: true, interestLevel: "high" },
    ],
    customData: {
      preferredLearningMode: "office",
      preferredShift: "morning",
      hasLaptop: true,
      institutionName: "Patan Multiple College",
      educationLevel: "bachelors",
    },
    generalNotes: "Enrolled in morning MERN batch. Paying in two installments.",
    createdAt: shiftDays(TODAY, -20, 11, 5),
    updatedAt: shiftDays(TODAY, -3, 14, 0),
    lastContactedAt: shiftDays(TODAY, -3, 14, 0),
    closedAt: shiftDays(TODAY, -3, 14, 0),
    isArchived: false,
    sourceSheet: "AllCourses",
    activities: [
      {
        id: "sc42-a4",
        type: "payment",
        at: shiftDays(TODAY, -3, 14, 0),
        performedBy: "Karuna Bhandari",
        title: "Payment received — NPR 25,000 (eSewa)",
      },
      {
        id: "sc42-a3",
        type: "enrollment",
        at: shiftDays(TODAY, -3, 13, 30),
        performedBy: "Ashok Karki",
        title: "Enrolled in Full-Stack MERN — batch MERN-2083-01",
      },
      {
        id: "sc42-a2",
        type: "call",
        at: shiftDays(TODAY, -10, 12, 0),
        performedBy: "Ashok Karki",
        title: "Counseling call — ready to enroll",
        channel: "phone",
        outcome: "requested_counseling",
        durationSeconds: 540,
      },
      {
        id: "sc42-a1",
        type: "form_submission",
        at: shiftDays(TODAY, -20, 11, 5),
        performedBy: "System",
        title: "Lead created from Facebook",
        channel: "facebook",
      },
    ],
    followUps: [],
    enrollment: {
      id: "sc42-e1",
      courseName: "Full-Stack MERN Diploma Course",
      batch: "MERN-2083-01",
      enrolledAt: shiftDays(TODAY, -3, 13, 30),
      status: "active",
      listedFee: 37500,
      standardDiscount: 7500,
      additionalDiscount: 0,
      agreedAmount: 30000,
      remarks: "One-time discount applied. Second installment due end of month.",
    },
    payments: [
      {
        id: "sc42-p1",
        amount: 25000,
        paidAt: shiftDays(TODAY, -3, 14, 0),
        method: "esewa",
        reference: "ESW-88213",
        status: "successful",
        receivedBy: "Karuna Bhandari",
      },
    ],
    statusHistory: [
      { id: "sc42-s1", at: shiftDays(TODAY, -20, 11, 5), from: null, to: "new", by: "System" },
      { id: "sc42-s2", at: shiftDays(TODAY, -10, 12, 0), from: "new", to: "qualified", by: "Ashok Karki" },
      {
        id: "sc42-s3",
        at: shiftDays(TODAY, -3, 13, 30),
        from: "qualified",
        to: "enrolled",
        by: "Ashok Karki",
      },
    ],
    assignmentHistory: [
      { id: "sc42-as1", at: shiftDays(TODAY, -20, 11, 30), from: null, to: "u-ashok", by: "Sales Manager" },
    ],
  },
  // Master class lead.
  {
    id: "LD-2026-00043",
    referenceNumber: "LD-2026-00043",
    fullName: "Manish Gautam",
    primaryPhone: "+9779841460103",
    email: "gautammanish975@gmail.com",
    address: "Imadol, Lalitpur",
    city: "Lalitpur",
    source: "instagram",
    campaign: "Master Class October 2025",
    status: "contact_attempted",
    priority: "cool",
    score: 35,
    assignedTo: "u-alisha",
    courseInterests: [
      {
        courseId: "entrepreneurship",
        courseName: "Entrepreneurship & Business Finance",
        isPrimary: true,
        interestLevel: "medium",
      },
    ],
    customData: {
      masterClassTopic: "Entrepreneurship & Business Finance",
      masterClassPreferredDate: shiftDays(TODAY, 5, 18, 0),
      masterClassPreferredMode: "online",
    },
    generalNotes: "Phone switched off on first attempt.",
    createdAt: shiftDays(TODAY, -6, 16, 49),
    updatedAt: shiftDays(TODAY, -5, 11, 0),
    lastContactedAt: shiftDays(TODAY, -5, 11, 0),
    nextFollowUpAt: shiftDays(TODAY, -2, 16, 0),
    isArchived: false,
    sourceSheet: "Master Class Lead",
    activities: [
      {
        id: "sc43-a2",
        type: "call",
        at: shiftDays(TODAY, -5, 11, 0),
        performedBy: "Alisha Shrestha",
        title: "Outbound call — phone switched off",
        channel: "phone",
        outcome: "busy",
      },
      {
        id: "sc43-a1",
        type: "form_submission",
        at: shiftDays(TODAY, -6, 16, 49),
        performedBy: "System",
        title: "Master class registration from Instagram",
        channel: "instagram",
      },
    ],
    followUps: [
      {
        id: "sc43-f1",
        dueAt: shiftDays(TODAY, -2, 16, 0),
        purpose: "Retry call and confirm master class seat",
        assignedTo: "Alisha Shrestha",
        status: "overdue",
      },
    ],
    payments: [],
    statusHistory: [
      { id: "sc43-s1", at: shiftDays(TODAY, -6, 16, 49), from: null, to: "new", by: "System" },
      {
        id: "sc43-s2",
        at: shiftDays(TODAY, -5, 11, 0),
        from: "new",
        to: "contact_attempted",
        by: "Alisha Shrestha",
      },
    ],
    assignmentHistory: [
      { id: "sc43-as1", at: shiftDays(TODAY, -6, 17, 0), from: null, to: "u-alisha", by: "Sales Manager" },
    ],
  },
  // General inquiry (Contact Us) — unassigned pool.
  {
    id: "LD-2026-00044",
    referenceNumber: "LD-2026-00044",
    fullName: "Raju Karki",
    primaryPhone: "+9779766388023",
    email: "rajubposolution@gmail.com",
    source: "website",
    status: "new",
    priority: "warm",
    score: 55,
    assignedTo: null,
    courseInterests: [],
    customData: {
      inquirySubject: "Enterprise training",
      inquiryCategory: "Corporate Training",
      inquiryMessage:
        "Interested to explore options to provide training for our team of 12 developers. Please share a corporate package.",
    },
    generalNotes: "Corporate training request — route to partnerships.",
    createdAt: shiftDays(TODAY, -2, 19, 45),
    updatedAt: shiftDays(TODAY, -2, 19, 45),
    isArchived: false,
    sourceSheet: "Contact Us",
    activities: [
      {
        id: "sc44-a1",
        type: "form_submission",
        at: shiftDays(TODAY, -2, 19, 45),
        performedBy: "System",
        title: "Contact-Us form submission",
        channel: "website",
        notes: "Interested to explore corporate training options.",
      },
    ],
    followUps: [],
    payments: [],
    statusHistory: [
      { id: "sc44-s1", at: shiftDays(TODAY, -2, 19, 45), from: null, to: "new", by: "System" },
    ],
    assignmentHistory: [],
  },
  // Orbit social lead — lost.
  {
    id: "LD-2026-00045",
    referenceNumber: "LD-2026-00045",
    fullName: "Nikhil Shrestha",
    primaryPhone: "+9779865036801",
    source: "orbit",
    campaign: "Facebook UI/UX Campaign",
    status: "lost",
    priority: "cold",
    score: 8,
    assignedTo: "u-alisha",
    courseInterests: [
      { courseId: "bda", courseName: "Business Data Analytics with AI", isPrimary: true, interestLevel: "low" },
    ],
    customData: {
      externalSource: { platform: "facebook", externalLeadId: "123456789", adName: "UI UX July Campaign" },
      preferredLearningMode: "online",
    },
    generalNotes: "Works full time 9–6, could not commit to a batch.",
    createdAt: shiftDays(TODAY, -35, 10, 0),
    updatedAt: shiftDays(TODAY, -25, 15, 0),
    lastContactedAt: shiftDays(TODAY, -25, 15, 0),
    closedAt: shiftDays(TODAY, -25, 15, 0),
    isArchived: false,
    sourceSheet: "Orbit Leads from sm",
    activities: [
      {
        id: "sc45-a2",
        type: "status_change",
        at: shiftDays(TODAY, -25, 15, 0),
        performedBy: "Alisha Shrestha",
        title: "Marked Lost — could not commit to schedule",
      },
      {
        id: "sc45-a1",
        type: "form_submission",
        at: shiftDays(TODAY, -35, 10, 0),
        performedBy: "System",
        title: "Lead synced from Orbit (Facebook)",
        channel: "orbit",
      },
    ],
    followUps: [],
    payments: [],
    statusHistory: [
      { id: "sc45-s1", at: shiftDays(TODAY, -35, 10, 0), from: null, to: "new", by: "System" },
      { id: "sc45-s2", at: shiftDays(TODAY, -25, 15, 0), from: "contacted", to: "lost", by: "Alisha Shrestha" },
    ],
    assignmentHistory: [
      { id: "sc45-as1", at: shiftDays(TODAY, -35, 11, 0), from: null, to: "u-alisha", by: "Sales Manager" },
    ],
  },
];

/* ------------------------------------------------------------- public API */

/**
 * Sequence numbers 41–45 are reserved for the hand-authored SHOWCASE_LEADS
 * (LD-2026-00041 is the plan's canonical Ram Sharma example), so the seed
 * expansion skips them to avoid reference-number collisions.
 */
const RESERVED_SEQ = new Set([41, 42, 43, 44, 45]);

function expandSeeds(): Lead[] {
  const out: Lead[] = [];
  let seq = 0;
  for (const seed of LEAD_SEED) {
    seq += 1;
    while (RESERVED_SEQ.has(seq)) seq += 1;
    out.push(expandSeed(seed, seq));
  }
  return out;
}

export const ALL_LEADS: Lead[] = [...SHOWCASE_LEADS, ...expandSeeds()].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
);

const LEAD_BY_ID = new Map(ALL_LEADS.map((l) => [l.id, l]));

export function getLeadById(id: string): Lead | undefined {
  return LEAD_BY_ID.get(id);
}

export function toListItem(lead: Lead): LeadListItem {
  const primary = lead.courseInterests.find((c) => c.isPrimary) ?? lead.courseInterests[0];
  return {
    id: lead.id,
    referenceNumber: lead.referenceNumber,
    fullName: lead.fullName,
    primaryPhone: lead.primaryPhone,
    email: lead.email,
    source: lead.source,
    campaign: lead.campaign,
    primaryCourse: primary?.courseName,
    primaryCourseId: primary?.courseId,
    status: lead.status,
    priority: lead.priority,
    score: lead.score,
    assignedTo: lead.assignedTo,
    lastContactedAt: lead.lastContactedAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    createdAt: lead.createdAt,
    isArchived: lead.isArchived,
  };
}

export const LEAD_LIST: LeadListItem[] = ALL_LEADS.map(toListItem);
