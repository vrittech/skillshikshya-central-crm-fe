import { formatDate } from "@/lib/leads-format";
import type { CourseBatch } from "@/types";
import type { ApiEnrollment, ApiPlacement } from "@/types/leads-api";

/** Enrollment statuses that sit in a batch (mirrors Enrollment.SEAT_STATUSES). */
const SEAT_STATUSES = new Set(["confirmed", "active", "completed"]);

export function canSit(e: ApiEnrollment) {
  return SEAT_STATUSES.has(e.status);
}

/** A batch with a seat limit and no seat left. */
export function isFull(b: CourseBatch) {
  return b.capacity != null && !b.seats_left;
}

/** "12 seats left", "full" or "no seat limit" for a batch picker. */
export function seatsLabel(b: CourseBatch) {
  if (b.capacity == null) return "no seat limit";
  if (!b.seats_left) return "full";
  return `${b.seats_left} ${b.seats_left === 1 ? "seat" : "seats"} left`;
}

/** Today in the browser's own time zone, as YYYY-MM-DD. */
export function localToday() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Where the student sits, for an enrollment card. The money batch (where the
 * fees count) is named too when it is not the batch they sit in.
 */
export function seatText(e: ApiEnrollment) {
  const money = e.batch_name;
  const feesNote = money ? ` · fees count on ${money}` : "";
  if (e.status === "pending") {
    return money ? `Batch ${money} · seat taken on confirm` : "No batch chosen";
  }
  if (!canSit(e)) return money ? `Batch ${money}` : "No batch";
  if (e.seat_state === "seated" && e.current_batch_name) {
    const here = `Sits in ${e.current_batch_name}`;
    return e.batch != null && e.batch !== e.current_batch ? `${here}${feesNote}` : here;
  }
  if (e.seat_state === "paused") {
    const since = e.placements?.[0]?.started_on;
    return `Paused${since ? ` since ${formatDate(since)}` : ""}${feesNote}`;
  }
  return `Not in a batch${feesNote}`;
}

/** One line for a seat history row, e.g. "Moved from Python Nov to Python Dec". */
export function placementTitle(p: ApiPlacement) {
  const to = p.course_batch_name ?? "a batch";
  const from = p.from_batch_name ?? "a batch";
  switch (p.kind) {
    case "join":
      return `Joined ${to}`;
    case "move":
      return `Moved from ${from} to ${to}`;
    case "pause":
      return `Paused, left ${from}`;
    case "resume":
      return p.from_batch != null && p.from_batch !== p.course_batch
        ? `Resumed in ${to} (paused from ${from})`
        : `Resumed in ${to}`;
    case "leave":
      return `Left ${from}`;
    default:
      return p.kind_display;
  }
}
