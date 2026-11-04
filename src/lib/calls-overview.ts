export function formatCallDuration(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours) return `${hours} hr ${minutes} min ${remainingSeconds} sec`;
  if (minutes) return `${minutes} min ${remainingSeconds} sec`;
  return `${remainingSeconds} sec`;
}

/** API dates are Nepal-local calendar dates, not UTC timestamps. */
export function formatNepalDayLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;

  const [, year, month, day] = match;
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utcDate);
}

export function callOverviewCallerName(name: string | null | undefined): string {
  return name?.trim() || "Unknown caller";
}
