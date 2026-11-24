import type { Batch, CourseBatch } from "@/types";

/** Times offered when picking a time slot: every 15 minutes, 5:00 AM to 11:00 PM. */
export const TIME_STEP = 15;
const FIRST = 5 * 60;
const LAST = 23 * 60;

/** "06:30" or "06:30:00" -> 390. */
export function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** 390 -> "06:30". */
export function fromMinutes(n: number) {
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

/** "18:30" -> "6:30 PM". */
export function timeLabel(t: string) {
  const n = toMinutes(t);
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export const TIME_OPTIONS: string[] = Array.from(
  { length: (LAST - FIRST) / TIME_STEP + 1 },
  (_, i) => fromMinutes(FIRST + i * TIME_STEP),
);

/** 120 -> "2 hours", 90 -> "1 hour 30 min", 45 -> "45 min". */
export function durationText(minutes: number | null | undefined) {
  if (minutes == null || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h === 0 ? "" : h === 1 ? "1 hour" : `${h} hours`;
  return [hours, m ? `${m} min` : ""].filter(Boolean).join(" ");
}

/** "6:00 AM – 8:00 AM", or the old typed text, or null. */
export function slotTimes(b: Pick<Batch, "start_time" | "end_time" | "description">) {
  if (b.start_time && b.end_time) return `${timeLabel(b.start_time)} – ${timeLabel(b.end_time)}`;
  return b.description || null;
}

export function slotMinutes(start: string, end: string) {
  return toMinutes(end) - toMinutes(start);
}

/** A batch's time slot: "Morning · 6:00 AM – 8:00 AM", or the name alone, or null. */
export function batchShift(
  b: Pick<CourseBatch, "batch_name" | "batch_start_time" | "batch_end_time">,
) {
  const times =
    b.batch_start_time && b.batch_end_time
      ? `${timeLabel(b.batch_start_time)} – ${timeLabel(b.batch_end_time)}`
      : null;
  return [b.batch_name, times].filter(Boolean).join(" · ") || null;
}
