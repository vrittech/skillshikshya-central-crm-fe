/** Fixed option lists for lead fields that are not admin-managed. */

import type { CallOutcome, EducationLevel, LearningMode, Shift } from "@/types/leads";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

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

export const labelOf = <T extends string>(opts: Option<T>[], value: T | undefined): string =>
  opts.find((o) => o.value === value)?.label ?? (value ?? "—");
