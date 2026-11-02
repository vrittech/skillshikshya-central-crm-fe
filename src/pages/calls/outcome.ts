import { CALL_OUTCOMES } from "@/data/lead-lookups";

export function outcomeLabel(outcome: string | null): string {
  if (!outcome) return "—";
  return CALL_OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome;
}
