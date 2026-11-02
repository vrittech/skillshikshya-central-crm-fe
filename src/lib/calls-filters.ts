export function nepalDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function presetDates(preset: string, now = new Date()) {
  const today = nepalDate(now);
  if (preset === "today") return { from_date: today, to_date: today };
  if (preset === "month") return { from_date: `${today.slice(0, 7)}-01`, to_date: today };
  if (preset === "week") {
    const start = new Date(`${today}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    return { from_date: start.toISOString().slice(0, 10), to_date: today };
  }
  return { from_date: "", to_date: "" };
}

export function callDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function recordingUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
