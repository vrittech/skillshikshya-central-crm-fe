import type { CallFilters, CallOrdering } from "../types/calls";

export const CALL_PAGE_SIZE = 20;
export const NEPAL_TIMEZONE = "Asia/Kathmandu";
export type DatePreset = "all" | "today" | "week" | "month" | "custom";

export function nepalDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NEPAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function presetDates(preset: DatePreset, now = new Date()) {
  const end = nepalDate(now);
  if (preset === "today") return { start: end, end };
  if (preset === "month") return { start: `${end.slice(0, 7)}-01`, end };
  if (preset === "week") {
    const start = new Date(`${end}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    return { start: start.toISOString().slice(0, 10), end };
  }
  return { start: "", end: "" };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function readCallFilters(params: URLSearchParams, isStaff: boolean) {
  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";
  const dateError =
    (start && !validDate(start)) || (end && !validDate(end))
      ? "Enter a valid date."
      : start && end && start > end
        ? "End date must be on or after start date."
        : "";
  const filters: CallFilters = {};
  const search = params.get("search")?.trim();
  if (search) filters.search = search;
  const direction = params.get("direction");
  if (direction === "inbound" || direction === "outbound")
    filters.direction = direction;
  const userId = positiveInteger(params.get("created_by"));
  const branchId = positiveInteger(params.get("branch_id"));
  if (userId) filters.created_by = userId;
  if (isStaff && branchId) filters.branch_id = branchId;
  if (start && !dateError)
    filters.call_timestamp__gte = `${start}T00:00:00+05:45`;
  if (end && !dateError)
    filters.call_timestamp__lte = `${end}T23:59:59.999999+05:45`;
  const allowed = [
    "call_timestamp",
    "-call_timestamp",
    "duration_seconds",
    "-duration_seconds",
  ];
  const requested = params.get("ordering") ?? "";
  const ordering = (
    allowed.includes(requested) ? requested : "-call_timestamp"
  ) as CallOrdering;
  return {
    filters,
    dateError,
    ordering,
    page: positiveInteger(params.get("page")) ?? 1,
  };
}

function positiveInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export function formatCallTime(value: string | null | undefined, full = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: NEPAL_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(full ? { second: "2-digit" } : {}),
  }).format(new Date(value));
}

export function recordingLink(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
