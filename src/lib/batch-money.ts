import { formatNPR } from "@/lib/leads-format";
import type { BatchCostKind, BatchFigures } from "@/types";

export const FIGURE_ROWS: { key: keyof BatchFigures; label: string }[] = [
  { key: "students", label: "Students" },
  { key: "fees", label: "Fees" },
  { key: "collected", label: "Collected" },
  { key: "owed", label: "Owed" },
  { key: "costs", label: "Costs" },
  { key: "profit", label: "Profit" },
];

export const COST_KINDS: { value: BatchCostKind; label: string }[] = [
  { value: "trainer", label: "Trainer" },
  { value: "venue", label: "Venue" },
  { value: "licences", label: "Licences" },
  { value: "other", label: "Other" },
];

/** A figure as text: students as a count, the rest as NPR. */
export function figureText(figures: BatchFigures, key: keyof BatchFigures) {
  const value = figures[key];
  return key === "students" ? String(value) : formatNPR(Number(value));
}

export function isLoss(figures: BatchFigures | null | undefined) {
  return !!figures && Number(figures.profit) < 0;
}
