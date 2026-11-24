/**
 * Controlled lookup values for the lead CRM prototype.
 *
 * Every list here is derived from the real SkillShikshya X Vrit workbook
 * ("Options", "colorcode" and lead sheets) so the static UI reflects the
 * vocabulary staff already use. When the backend ships, these become API-fed
 * lookup tables (lead_types, lead_sources, lead_statuses, ...).
 */

import type {
  CallOutcome,
  CourseKind,
  EducationLevel,
  LeadPriorityCode,
  LeadSourceCode,
  LeadStatusCode,
  LeadTypeCode,
  LearningMode,
  Shift,
} from "@/types/leads";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

/* ------------------------------------------------------------------ courses */

export interface CourseCatalogItem {
  id: string;
  name: string;
  kind: CourseKind;
  fullAmount: number;
  oneTimeDiscount: number | null;
  syllabus?: string;
}

/** The full catalogue from the workbook's "Options" sheet (prices in NPR). */
export const COURSE_CATALOG: CourseCatalogItem[] = [
  { id: "mern", name: "Full-Stack MERN Diploma Course", kind: "course", fullAmount: 37500, oneTimeDiscount: 7500, syllabus: "https://cutt.ly/vritmernsyllabus" },
  { id: "frontend", name: "Frontend with React Diploma Course", kind: "course", fullAmount: 30000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritnewfrontendsyllabus" },
  { id: "django", name: "Python Django Diploma Course", kind: "course", fullAmount: 30000, oneTimeDiscount: 6000, syllabus: "https://cutt.ly/vritdjangosyllabus" },
  { id: "dsml", name: "Data Science and Machine Learning Diploma Course", kind: "course", fullAmount: 35000, oneTimeDiscount: 7000, syllabus: "https://cutt.ly/vritaimlsyllabus" },
  { id: "flutter", name: "Complete Flutter Diploma Course", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritfluttersyllabus" },
  { id: "digital-marketing", name: "Digital Marketing Diploma Course", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritdigitalmsyllabus" },
  { id: "uiux", name: "UI UX Design Diploma Course", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vrituiuxsyllabus" },
  { id: "devops", name: "DevOps Diploma Course", kind: "course", fullAmount: 30000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritdevopssyllabus" },
  { id: "qa", name: "Quality Assurance (QA) Diploma Course", kind: "course", fullAmount: 30000, oneTimeDiscount: 6000, syllabus: "https://cutt.ly/vritqasyllabus" },
  { id: "pm", name: "Project Management Diploma Course", kind: "course", fullAmount: 30000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritpmsyllabus" },
  { id: "graphic", name: "Graphic Designing Diploma Course", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritgraphicdesignsyllabus" },
  { id: "wordpress", name: "WordPress Diploma Course", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritwordpresssyllabus" },
  { id: "hr", name: "Human Resource Diploma Course", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vrithrsyllabus" },
  { id: "video-editing", name: "Video Editing Diploma Course", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritvideoeditingsyllabus" },
  { id: "cybersecurity", name: "Cybersecurity Diploma Course", kind: "course", fullAmount: 30000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritcybersecuritysyllabus" },
  { id: "dsa", name: "Data Structures & Algorithms Diploma Course", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000, syllabus: "https://cutt.ly/vritdsasyllabus" },
  { id: "agentic-ai", name: "Master Gen AI and Build Smarter AI Agent (Agentic AI)", kind: "course", fullAmount: 35000, oneTimeDiscount: 5000 },
  { id: "gen-ai", name: "Generative AI (GEN AI)", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000 },
  { id: "bda", name: "Business Data Analytics with AI", kind: "course", fullAmount: 30000, oneTimeDiscount: 5000 },
  { id: "video-editing-vg", name: "Video Editing Course", kind: "course", fullAmount: 25000, oneTimeDiscount: 5000 },
  { id: "swe-ai", name: "Software Engineering With AI Course", kind: "course", fullAmount: 37500, oneTimeDiscount: 7500 },
  { id: "bugbounty", name: "Bug Bounty & Web Security", kind: "course", fullAmount: 20000, oneTimeDiscount: 5000 },
  // Master classes
  { id: "excel-powerbi", name: "Excel to Power BI", kind: "master_class", fullAmount: 10000, oneTimeDiscount: null },
  { id: "stock-investing", name: "Stock Investing Guide: Fundamental to Technical Analysis", kind: "master_class", fullAmount: 20000, oneTimeDiscount: null },
  { id: "content-creation", name: "Content Creation Masterclass", kind: "master_class", fullAmount: 12000, oneTimeDiscount: 2000 },
  { id: "entrepreneurship", name: "Entrepreneurship & Business Finance", kind: "master_class", fullAmount: 13000, oneTimeDiscount: null },
  { id: "startup-mastery", name: "Nepal Startup Mastery: From Idea to Operation", kind: "master_class", fullAmount: 18000, oneTimeDiscount: null },
  { id: "communication", name: "Mastering Powerful Communication", kind: "master_class", fullAmount: 13000, oneTimeDiscount: null },
  { id: "sales-mastery", name: "Sell Like Crazy: The Ultimate Sales Mastery", kind: "master_class", fullAmount: 5000, oneTimeDiscount: null },
  // Job ready programs
  { id: "mern-jrp", name: "Full-Stack MERN Diploma Course (JRP)", kind: "job_ready_program", fullAmount: 108000, oneTimeDiscount: 18000 },
  { id: "dsml-jrp", name: "Data Science and Machine Learning Diploma Course (JRP)", kind: "job_ready_program", fullAmount: 108000, oneTimeDiscount: 18000 },
  { id: "uiux-jrp", name: "UI UX Design Diploma Course (JRP)", kind: "job_ready_program", fullAmount: 72000, oneTimeDiscount: 12000 },
];

const COURSE_BY_NAME = new Map(COURSE_CATALOG.map((c) => [c.name.toLowerCase(), c]));
const COURSE_BY_ID = new Map(COURSE_CATALOG.map((c) => [c.id, c]));

export function courseById(id: string): CourseCatalogItem | undefined {
  return COURSE_BY_ID.get(id);
}

/** Best-effort fuzzy match from a raw workbook course string to the catalogue. */
export function matchCourse(raw: string): CourseCatalogItem | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  if (COURSE_BY_NAME.has(key)) return COURSE_BY_NAME.get(key);
  const tokens: Record<string, string> = {
    mern: "mern",
    fullstack: "mern",
    "full-stack": "mern",
    frontend: "frontend",
    react: "frontend",
    django: "django",
    python: "django",
    "data science": "dsml",
    "machine learning": "dsml",
    flutter: "flutter",
    "digital marketing": "digital-marketing",
    "ui ux": "uiux",
    "ui/ux": "uiux",
    "ux": "uiux",
    devops: "devops",
    "quality assurance": "qa",
    "qa": "qa",
    "project management": "pm",
    graphic: "graphic",
    wordpress: "wordpress",
    "human resource": "hr",
    "video editing": "video-editing",
    cybersecurity: "cybersecurity",
    "data structures": "dsa",
    agentic: "agentic-ai",
    "generative ai": "gen-ai",
    "gen ai": "gen-ai",
    "business data": "bda",
    "excel to power": "excel-powerbi",
    "power bi": "excel-powerbi",
    stock: "stock-investing",
    content: "content-creation",
    entrepreneur: "entrepreneurship",
    startup: "startup-mastery",
    communication: "communication",
    sales: "sales-mastery",
    "bug bounty": "bugbounty",
  };
  for (const [needle, id] of Object.entries(tokens)) {
    if (key.includes(needle)) return COURSE_BY_ID.get(id);
  }
  return undefined;
}

/* -------------------------------------------------------------- lead types */

export const LEAD_TYPES: Option<LeadTypeCode>[] = [
  { value: "course_inquiry", label: "Course Inquiry" },
  { value: "master_class_inquiry", label: "Master Class Inquiry" },
  { value: "general_inquiry", label: "General Inquiry" },
  { value: "corporate_inquiry", label: "Corporate Inquiry" },
];

/* ------------------------------------------------------------ lead sources */

export const LEAD_SOURCES: Option<LeadSourceCode>[] = [
  { value: "website", label: "Website" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "viber", label: "Viber" },
  { value: "telephone", label: "Telephone" },
  { value: "direct_call", label: "Direct Call" },
  { value: "walk_in", label: "Walk-in / Direct Visit" },
  { value: "referral", label: "Referral" },
  { value: "online_counseling", label: "Online Counseling" },
  { value: "google_search", label: "Google Search" },
  { value: "shramsansar", label: "Shramsansar" },
  { value: "orbit", label: "Orbit (Social Media)" },
  { value: "manual_entry", label: "Manual Entry" },
];

/* ----------------------------------------------------------- lead statuses */

export interface StatusMeta {
  value: LeadStatusCode;
  label: string;
  /** Semantic category drives the badge colour. */
  category: "open" | "active" | "won" | "lost" | "neutral";
  isTerminal: boolean;
  order: number;
}

export const LEAD_STATUSES: StatusMeta[] = [
  { value: "new", label: "New", category: "open", isTerminal: false, order: 1 },
  { value: "contact_attempted", label: "Contact Attempted", category: "open", isTerminal: false, order: 2 },
  { value: "contacted", label: "Contacted", category: "active", isTerminal: false, order: 3 },
  { value: "follow_up_scheduled", label: "Follow-up Scheduled", category: "active", isTerminal: false, order: 4 },
  { value: "qualified", label: "Qualified", category: "active", isTerminal: false, order: 5 },
  { value: "counseling_completed", label: "Counseling Completed", category: "active", isTerminal: false, order: 6 },
  { value: "enrollment_pending", label: "Enrollment Pending", category: "active", isTerminal: false, order: 7 },
  { value: "enrolled", label: "Enrolled", category: "won", isTerminal: true, order: 8 },
  { value: "lost", label: "Lost", category: "lost", isTerminal: true, order: 9 },
  { value: "not_interested", label: "Not Interested", category: "lost", isTerminal: true, order: 10 },
  { value: "invalid", label: "Invalid", category: "neutral", isTerminal: true, order: 11 },
  { value: "duplicate", label: "Duplicate", category: "neutral", isTerminal: true, order: 12 },
  { value: "on_hold", label: "On Hold", category: "neutral", isTerminal: false, order: 13 },
];

export const STATUS_BY_CODE = new Map(LEAD_STATUSES.map((s) => [s.value, s]));

/* --------------------------------------------------------- lead priorities */

export interface PriorityMeta {
  value: LeadPriorityCode;
  label: string;
  /** Workbook colour + meaning. */
  description: string;
  /** Base lead-score contribution (the plan's priority `score`). */
  score: number;
  order: number;
}

export const LEAD_PRIORITIES: PriorityMeta[] = [
  { value: "hot", label: "Hot", description: "Answered, asked details — same-day follow-up", score: 80, order: 1 },
  { value: "warm", label: "Warm", description: "Interested but had objections — 24h follow-up", score: 60, order: 2 },
  { value: "cool", label: "Cool", description: "Form filled, interested for next batch", score: 40, order: 3 },
  { value: "cold", label: "Cold", description: "No response after 3 attempts — re-engage monthly", score: 20, order: 4 },
];

export const PRIORITY_BY_CODE = new Map(LEAD_PRIORITIES.map((p) => [p.value, p]));

/* --------------------------------------------------------------- campaigns */

export const CAMPAIGNS: Option[] = [
  { value: "see-2083", label: "SEE 2083 Campaign" },
  { value: "dashain-admission", label: "Dashain Admission Campaign" },
  { value: "fb-uiux-2026", label: "Facebook UI/UX Campaign" },
  { value: "masterclass-oct-2025", label: "Master Class October 2025" },
  { value: "ig-digital-marketing", label: "Instagram Digital Marketing" },
];

/* -------------------------------------------------------------- counselors */

/** From the workbook's "Followed By" column. */
export const COUNSELORS = [
  { id: "u-sangita", name: "Sangita Thapa", initials: "ST" },
  { id: "u-alisha", name: "Alisha Shrestha", initials: "AS" },
  { id: "u-ashok", name: "Ashok Karki", initials: "AK" },
  { id: "u-pranav", name: "Pranav Adhikari", initials: "PA" },
  { id: "u-karuna", name: "Karuna Bhandari", initials: "KB" },
  { id: "u-karisha", name: "Karisha Rai", initials: "KR" },
  { id: "u-rejisha", name: "Rejisha Maharjan", initials: "RM" },
  { id: "u-prabesh", name: "Prabesh Gurung", initials: "PG" },
  { id: "u-sampada", name: "Sampada Poudel", initials: "SP" },
  { id: "u-aarya", name: "Aarya Shakya", initials: "AS" },
];

export const COUNSELOR_BY_ID = new Map(COUNSELORS.map((c) => [c.id, c]));

export function counselorName(id: string | null | undefined): string {
  if (!id) return "Not yet assigned";
  return COUNSELOR_BY_ID.get(id)?.name ?? id;
}

/* ---------------------------------------------------- form dropdown options */

export const LEARNING_MODES: Option<LearningMode>[] = [
  { value: "online", label: "Online (Live via Meet)" },
  { value: "office", label: "On Office (Sankhamul, Kathmandu)" },
  { value: "hybrid", label: "Hybrid" },
  { value: "undecided", label: "Undecided" },
];

export const SHIFTS: Option<Shift>[] = [
  { value: "morning", label: "Morning" },
  { value: "day", label: "Day" },
  { value: "evening", label: "Evening" },
  { value: "weekend", label: "Weekend" },
  { value: "flexible", label: "Flexible" },
];

export const EDUCATION_LEVELS: Option<EducationLevel>[] = [
  { value: "see", label: "SEE" },
  { value: "plus_two", label: "Plus Two (+2)" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelors", label: "Bachelors" },
  { value: "masters", label: "Masters and Above" },
  { value: "other", label: "Other" },
];

export const CALL_OUTCOMES: Option<CallOutcome>[] = [
  { value: "interested", label: "Interested" },
  { value: "follow_up_required", label: "Follow-up Required" },
  { value: "no_answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "switched_off", label: "Switched Off" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "not_interested", label: "Not Interested" },
  { value: "requested_details", label: "Requested Course Details" },
  { value: "requested_counseling", label: "Requested Counseling" },
  { value: "enrolled_elsewhere", label: "Enrolled Elsewhere" },
  { value: "call_back_later", label: "Call Back Later" },
  { value: "do_not_contact", label: "Do Not Contact" },
];

/** Badge colours for call outcomes; others use the muted badge. */
export const CALL_OUTCOME_TONE: Record<string, string> = {
  interested: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  requested_counseling: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  follow_up_required: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  call_back_later: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  no_answer: "bg-muted text-muted-foreground",
  busy: "bg-muted text-muted-foreground",
  not_interested: "bg-destructive/10 text-destructive",
  wrong_number: "bg-destructive/10 text-destructive",
};

/* ------------------------------------------------------------ label lookups */

export const labelOf = <T extends string>(opts: Option<T>[], value: T | undefined): string =>
  opts.find((o) => o.value === value)?.label ?? (value ?? "—");

export const leadTypeLabel = (v: LeadTypeCode) => labelOf(LEAD_TYPES, v);
export const sourceLabel = (v: LeadSourceCode) => labelOf(LEAD_SOURCES, v);
export const statusLabel = (v: LeadStatusCode) => STATUS_BY_CODE.get(v)?.label ?? v;
export const priorityLabel = (v: LeadPriorityCode) => PRIORITY_BY_CODE.get(v)?.label ?? v;
