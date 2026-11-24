import type { ApiEnquiryStage, ApiLostReason } from "@/types/leads-api";

export const ENQUIRY_STAGES: { value: ApiEnquiryStage; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

/** Stages a person can move an enquiry to. Won comes from confirming an enrollment. */
export const OPEN_STAGES: ApiEnquiryStage[] = ["new", "contacted", "interested"];

export const LOST_REASONS: { value: ApiLostReason; label: string }[] = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "other_institute", label: "Chose another institute" },
  { value: "timing", label: "Timing doesn't suit" },
  { value: "not_reachable", label: "Can't reach" },
  { value: "not_interested", label: "Not interested" },
  { value: "other", label: "Other" },
];

export function stageLabel(stage?: ApiEnquiryStage | null) {
  return ENQUIRY_STAGES.find((s) => s.value === stage)?.label ?? "—";
}

export const STAGE_CLASS: Record<ApiEnquiryStage, string> = {
  new: "bg-muted text-muted-foreground",
  contacted: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  interested: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  won: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  lost: "bg-destructive/10 text-destructive",
};

/** The next open stage, for the one-click move button. */
export function nextStage(stage?: ApiEnquiryStage | null): ApiEnquiryStage | null {
  if (stage === "new") return "contacted";
  if (stage === "contacted") return "interested";
  return null;
}
