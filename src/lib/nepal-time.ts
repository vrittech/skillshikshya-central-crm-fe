/** Calendar days and display times in Nepal time, whatever timezone the browser is in. */

const NEPAL_TZ = "Asia/Kathmandu";
const NEPAL_OFFSET = "+05:45";

const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: NEPAL_TZ });

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: NEPAL_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const FULL_DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: NEPAL_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

/** Today in Nepal as YYYY-MM-DD. */
export function nepalToday(): string {
  return DAY_FMT.format(new Date());
}

/** Shift a YYYY-MM-DD date. Works in UTC so no local timezone or DST can move the day. */
export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfNepalDay(day: string): string {
  return `${day}T00:00:00${NEPAL_OFFSET}`;
}

/** Includes fractions of a second so a call at 23:59:59.5 isn't lost. */
export function endOfNepalDay(day: string): string {
  return `${day}T23:59:59.999999${NEPAL_OFFSET}`;
}

export function formatNepalDateTime(iso: string): string {
  return DATETIME_FMT.format(new Date(iso));
}

export function formatNepalDateTimeFull(iso: string): string {
  return FULL_DATETIME_FMT.format(new Date(iso));
}
