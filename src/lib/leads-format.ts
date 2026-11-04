/** Formatting helpers for the lead CRM. Locale: Nepal (NPR, en-IN grouping). */

/** Nepal timezone offset */
const NEPAL_OFFSET = "+05:45";

export function formatDateToNepalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}:${s}${NEPAL_OFFSET}`;
}

/** Convert a local datetime string (from <input type="datetime-local">) to ISO with Nepal offset.
 *  The input has no timezone info — we assume the user intends Nepal time.
 *  Output: "2026-07-22T17:06:49+05:45"
 */
export function toNepalIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (isNaN(d.getTime())) return local;
  return formatDateToNepalIso(d);
}

/** "Today" for the running app. The mock dataset will shift relative to the real date. */
export const TODAY = new Date();

export function formatNPR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `NPR ${amount.toLocaleString("en-IN")}`;
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return DATE_FMT.format(new Date(iso));
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  return DATETIME_FMT.format(new Date(iso));
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  return TIME_FMT.format(new Date(iso));
}

/** "3 days ago", "in 2 days", "today" — relative to TODAY. */
export function relativeToToday(iso: string | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = TODAY.getTime();
  const diffMs = then - now;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(diffMs / day);
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days === 1) return "tomorrow";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
}

export function isOverdue(iso: string | undefined): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < TODAY.getTime();
}

export function isDueToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === TODAY.getFullYear() &&
    d.getMonth() === TODAY.getMonth() &&
    d.getDate() === TODAY.getDate()
  );
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} sec`;
  return `${m} min ${s.toString().padStart(2, "0")} sec`;
}

export function formatMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/** Mask a phone lightly for compact display while keeping it recognizable. */
export function formatPhone(phone: string | null | undefined): string {
  if (phone == null) return "—";
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("977") && digits.length === 13) {
    return `+977 ${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
