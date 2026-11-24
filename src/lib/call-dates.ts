/** Nepal has no daylight saving, so a fixed offset is safe. */
const NPT_OFFSET = "+05:45";

export type CallDateRange = "all" | "today" | "7d" | "month" | "custom";

export const CALL_DATE_RANGES: readonly CallDateRange[] = ["all", "today", "7d", "month", "custom"];

/** Today's date in Nepal as YYYY-MM-DD, whatever time zone the browser is in. */
export function nepalToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(now);
}

/** Add days to a YYYY-MM-DD string without any time-zone surprises. */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** From/to dates (YYYY-MM-DD) for a preset, or null for "all" and "custom". */
export function presetDates(
  range: CallDateRange,
  today: string = nepalToday(),
): { from: string; to: string } | null {
  switch (range) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDays(today, -6), to: today }; // today + the 6 days before it
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today };
    default:
      return null;
  }
}

/** Start of a Nepal day, as an ISO string with offset. */
export const dayStartIso = (ymd: string) => `${ymd}T00:00:00${NPT_OFFSET}`;
/** Last millisecond of a Nepal day, so "Today" includes calls up to 23:59:59. */
export const dayEndIso = (ymd: string) => `${ymd}T23:59:59.999${NPT_OFFSET}`;