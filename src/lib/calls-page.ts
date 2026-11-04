import type { CallSummaryParams } from "@/types/leads-api";

export type CallDateRange = "all" | "today" | "last7" | "thismonth" | "custom";
export type CallSortField = "call_timestamp" | "duration_seconds";
export type CallSortDirection = "asc" | "desc";

export interface CallsPageState {
  search: string;
  direction: "all" | "inbound" | "outbound";
  loggedBy: string;
  dateRange: CallDateRange;
  startDate: string;
  endDate: string;
  branch: string;
  sortField: CallSortField;
  sortDirection: CallSortDirection;
  page: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function readPositiveId(value: string | null): string {
  if (!value || !/^\d+$/.test(value)) return "";
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? value : "";
}

export function readCallsPageState(params: URLSearchParams): CallsPageState {
  const rawPage = Number(params.get("page"));
  const direction = params.get("direction");
  const dateRange = params.get("date_range");
  const sortField = params.get("sort");
  const sortDirection = params.get("sort_dir");
  const rawStartDate = params.get("start_date") ?? "";
  const rawEndDate = params.get("end_date") ?? "";
  const startDate = isValidDate(rawStartDate) ? rawStartDate : "";
  const endDate = isValidDate(rawEndDate) ? rawEndDate : "";
  const validDateOrder = !startDate || !endDate || startDate <= endDate;
  return {
    search: params.get("search") ?? "",
    direction: direction === "inbound" || direction === "outbound" ? direction : "all",
    loggedBy: readPositiveId(params.get("created_by")),
    dateRange:
      dateRange === "today" || dateRange === "last7" || dateRange === "thismonth" ||
      dateRange === "custom"
        ? dateRange
        : "all",
    startDate: validDateOrder ? startDate : "",
    endDate: validDateOrder ? endDate : "",
    branch: readPositiveId(params.get("branch_id")),
    sortField: sortField === "duration_seconds" ? "duration_seconds" : "call_timestamp",
    sortDirection: sortDirection === "asc" ? "asc" : "desc",
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

function nepalDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function nepalBoundary(date: string, isEnd: boolean): string | undefined {
  if (!DATE_PATTERN.test(date)) return undefined;
  const [year, month, day] = date.split("-").map(Number);
  const nepaliDayStartUtc = Date.UTC(year, month - 1, day) - 345 * 60_000;
  const utc = new Date(nepaliDayStartUtc + (isEnd ? 86_399_000 : 0));
  return utc.toISOString();
}

export function callsApiFilters(
  state: CallsPageState,
  debouncedSearch: string,
  canSelectBranch: boolean,
  now = new Date(),
): CallSummaryParams {
  const filters: CallSummaryParams = {
    search: debouncedSearch.trim() || undefined,
    direction: state.direction === "all" ? undefined : state.direction,
    created_by: state.loggedBy ? Number(state.loggedBy) : undefined,
    branch_id: canSelectBranch && state.branch ? Number(state.branch) : undefined,
  };
  const today = nepalDate(now);
  let start: string | undefined;
  let end: string | undefined;
  if (state.dateRange === "today") {
    start = today;
    end = today;
  } else if (state.dateRange === "last7") {
    start = shiftDate(today, -6);
    end = today;
  } else if (state.dateRange === "thismonth") {
    start = `${today.slice(0, 7)}-01`;
    end = today;
  } else if (state.dateRange === "custom") {
    start = state.startDate;
    end = state.endDate;
  }
  filters.call_timestamp__gte = start ? nepalBoundary(start, false) : undefined;
  filters.call_timestamp__lte = end ? nepalBoundary(end, true) : undefined;
  return filters;
}

export function formatCallDurationMmSs(durationSeconds: number | null | undefined): string {
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) return "—";
  const total = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatCallTimestampNpt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(date);
}
