import type { CallListParams, CallSummaryParams } from "@/types/calls";

const PAGE_SIZE = 20;
const DEFAULT_ORDERING = "-call_timestamp";

function localDateValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDateBoundary(value: string, endOfDay: boolean): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const pad = (part: number) => String(Math.abs(part)).padStart(2, "0");
  const timezone = `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
  return `${localDateValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, "0")}${timezone}`;
}

function getDateFilters(params: URLSearchParams): Pick<CallSummaryParams, "call_timestamp__gte" | "call_timestamp__lte"> {
  const range = params.get("date_range") ?? "all";
  const today = new Date();
  if (range === "today") {
    const date = localDateValue(today);
    return {
      call_timestamp__gte: localDateBoundary(date, false),
      call_timestamp__lte: localDateBoundary(date, true),
    };
  }
  if (range === "last7") {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    return {
      call_timestamp__gte: localDateBoundary(localDateValue(start), false),
      call_timestamp__lte: localDateBoundary(localDateValue(today), true),
    };
  }
  if (range === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      call_timestamp__gte: localDateBoundary(localDateValue(start), false),
      call_timestamp__lte: localDateBoundary(localDateValue(today), true),
    };
  }
  if (range === "custom") {
    const from = params.get("date_from") ?? "";
    const to = params.get("date_to") ?? "";
    return {
      call_timestamp__gte: from ? localDateBoundary(from, false) : undefined,
      call_timestamp__lte: to ? localDateBoundary(to, true) : undefined,
    };
  }
  return {};
}

export function getCallSummaryParams(
  searchParams: URLSearchParams,
  search: string,
  isStaff: boolean,
): CallSummaryParams {
  const params: CallSummaryParams = {};
  const direction = searchParams.get("direction");
  const createdBy = searchParams.get("created_by");
  const branchId = searchParams.get("branch_id");
  if (direction === "inbound" || direction === "outbound") params.direction = direction;
  if (createdBy && /^\d+$/.test(createdBy)) params.created_by = Number(createdBy);
  if (isStaff && branchId && /^\d+$/.test(branchId)) params.branch_id = Number(branchId);
  return { ...params, ...getDateFilters(searchParams), search: search || undefined };
}

export function getCallListParams(
  searchParams: URLSearchParams,
  search: string,
  isStaff: boolean,
): CallListParams {
  return {
    ...getCallSummaryParams(searchParams, search, isStaff),
    page: Math.max(1, Number(searchParams.get("page")) || 1),
    page_size: PAGE_SIZE,
    ordering: searchParams.get("ordering") || DEFAULT_ORDERING,
  };
}

export function hasActiveCallFilters(params: URLSearchParams): boolean {
  return Boolean(
    params.get("search")?.trim() ||
      params.get("direction") ||
      params.get("created_by") ||
      params.get("branch_id") ||
      (params.get("date_range") && params.get("date_range") !== "all") ||
      params.get("date_from") ||
      params.get("date_to"),
  );
}

export function getLocalDateValue(date: Date): string {
  return localDateValue(date);
}
