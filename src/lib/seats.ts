import { batchShift } from "@/lib/time-slots";
import type { CourseBatch } from "@/types";
import type { ApiEnrollment, ApiPlacement } from "@/types/leads-api";

/** Enrollment statuses that sit in a batch (mirrors Enrollment.SEAT_STATUSES). */
const SEAT_STATUSES = new Set(["confirmed", "active", "completed"]);

export function canSit(e: ApiEnrollment) {
  return SEAT_STATUSES.has(e.status);
}

/** The seat count decides: a batch with no seats set, or no seat left, takes no one. */
export function takesNoOne(b: CourseBatch) {
  return b.capacity == null || !b.seats_left;
}

/** "12 of 25 seats left", "full" or "no seats set" for a batch picker. */
export function seatsLabel(b: CourseBatch) {
  if (b.capacity == null) return "no seats set";
  if (!b.seats_left) return "full";
  return `${b.seats_left} of ${b.capacity} seats left`;
}

/**
 * One line for a batch in a picker: "Python Nov · Morning · 6:00 AM – 8:00 AM".
 * Says "full" or "no seats set" only when the batch can't be picked.
 */
export function batchOption(b: CourseBatch) {
  return [b.name, batchShift(b), takesNoOne(b) ? seatsLabel(b) : null].filter(Boolean).join(" · ");
}

/** Today in the browser's own time zone, as YYYY-MM-DD. */
export function localToday() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The batch line on an enrollment card: the current batch, "Paused" or "No batch assigned". */
export function seatText(e: ApiEnrollment) {
  if (!canSit(e)) return e.batch_name ? `Batch ${e.batch_name}` : "No batch assigned";
  if (e.seat_state === "seated" && e.current_batch_name) return `Batch ${e.current_batch_name}`;
  if (e.seat_state === "paused") return "Paused";
  return "No batch assigned";
}

/**
 * The batch the student enrolled in (where the fees count), when it is not
 * the batch they are in now. null when there is nothing to show.
 */
export function enrolledBatchIfDifferent(e: ApiEnrollment) {
  if (!canSit(e) || e.batch == null) return null;
  return e.batch !== e.current_batch ? (e.batch_name ?? null) : null;
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
      return `Paused from ${from}`;
    case "resume":
      return `Resumed in ${to}`;
    case "leave":
      return `Left ${from}`;
    default:
      return p.kind_display;
  }
}
