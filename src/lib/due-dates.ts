import type { ApiDuePart, ApiDueRow, ApiEnrollment } from "@/types/leads-api";

/** "2026-01-31" + 1 month = "2026-02-28": the day is kept, or the month's last day. */
export function addMonths(day: string, months: number) {
  const [y, m, d] = day.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}

/** `count` monthly parts from `first`, in whole rupees; the last part takes the rest. */
export function splitEvenly(total: number, count: number, first: string): ApiDuePart[] {
  const n = Math.max(1, count);
  const each = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => ({
    due_on: addMonths(first, i),
    amount: String(i === n - 1 ? Math.round((total - each * (n - 1)) * 100) / 100 : each),
  }));
}

export function sumParts(parts: ApiDuePart[]) {
  return Math.round(parts.reduce((s, p) => s + (Number(p.amount) || 0), 0) * 100) / 100;
}

/** Parts are ready to send: each has a date and an amount above 0, and they add up to `total`. */
export function partsAreValid(parts: ApiDuePart[], total: number) {
  return (
    parts.length > 0 &&
    parts.every((p) => p.due_on && Number(p.amount) > 0) &&
    sumParts(parts) === Math.round(total * 100) / 100
  );
}

/** The current plan's parts, for the Change due dates form. */
export function currentParts(e: ApiEnrollment): ApiDuePart[] {
  return (e.due_dates ?? [])
    .filter((r) => r.kind === "part" && r.due_on)
    .map((r) => ({ due_on: r.due_on as string, amount: String(Number(r.amount)) }));
}

/** "1 day", "12 days". */
export function daysText(days: number) {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** What is late, and the next part still to pay, for the line under the progress bar. */
export function dueSummary(rows: ApiDueRow[]) {
  const late = rows.filter((r) => r.status === "late");
  const next = rows.find((r) => r.status === "due" || r.status === "part_paid");
  return {
    lateAmount: late.reduce((s, r) => s + Number(r.left), 0),
    daysLate: late.reduce((m, r) => Math.max(m, r.days_late), 0),
    next,
  };
}
