import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { callsService } from "@/services/calls.service";
import type { CallDirection, CallFilterParams } from "@/types/calls";

const DEFAULT_ORDERING = "-call_timestamp";

/** Paginated call log for the Calls page table. */
export function useCalls(params: CallFilterParams, page: number, pageSize: number) {
  return useQuery({
    queryKey: ["calls", "list", params, page, pageSize],
    queryFn: () => callsService.list({ ...params, page, page_size: pageSize }),
    placeholderData: keepPreviousData,
  });
}

/** Summary cards + charts for the same filters as the table. */
export function useCallsSummary(params: CallFilterParams) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    placeholderData: keepPreviousData,
  });
}

/* ------------------------------------------------------------ URL filters */

export type DatePreset = "" | "today" | "7d" | "month" | "custom";

/** Calls page filters as stored in the URL. Keys match the query-string names. */
export interface CallFilters {
  search: string;
  direction: "" | CallDirection;
  created_by: string;
  branch_id: string;
  preset: DatePreset;
  /** Only used when preset is "custom". */
  date_from: string;
  date_to: string;
  ordering: string;
  page: number;
}

// "en-CA" gives YYYY-MM-DD
function nepalToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// date_to is inclusive on the backend
function presetRange(filters: CallFilters): { date_from?: string; date_to?: string } {
  const today = nepalToday();
  if (filters.preset === "today") return { date_from: today, date_to: today };
  if (filters.preset === "7d") return { date_from: addDays(today, -6), date_to: today };
  if (filters.preset === "month") return { date_from: `${today.slice(0, 8)}01`, date_to: today };
  if (filters.preset === "custom") {
    return { date_from: filters.date_from || undefined, date_to: filters.date_to || undefined };
  }
  return {};
}

/** Calls page filters, sort and page, kept in the URL. */
export function useCallFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const get = (key: string) => searchParams.get(key) ?? "";

  const filters: CallFilters = {
    search: get("search"),
    direction: get("direction") as CallFilters["direction"],
    created_by: get("created_by"),
    branch_id: get("branch_id"),
    preset: get("preset") as DatePreset,
    date_from: get("date_from"),
    date_to: get("date_to"),
    ordering: get("ordering") || DEFAULT_ORDERING,
    page: Math.max(1, Number(get("page")) || 1),
  };

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // shared by list, summary and export; useCalls adds the page
  const params: CallFilterParams = {
    search: debouncedSearch || undefined,
    direction: filters.direction || undefined,
    created_by: filters.created_by ? Number(filters.created_by) : undefined,
    branch_id: filters.branch_id ? Number(filters.branch_id) : undefined,
    ordering: filters.ordering,
    ...presetRange(filters),
  };

  const hasFilters = !!(
    filters.search || filters.direction || filters.created_by || filters.branch_id || filters.preset
  );

  // any filter or sort change goes back to page 1
  function setFilters(changes: Partial<Omit<CallFilters, "page">>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (!value || (key === "ordering" && value === DEFAULT_ORDERING)) next.delete(key);
          else next.set(key, String(value));
        }
        if (changes.preset !== undefined && changes.preset !== "custom") {
          next.delete("date_from");
          next.delete("date_to");
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function setPage(page: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (page > 1) next.set("page", String(page));
        else next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  return { filters, params, hasFilters, setFilters, setPage, clearFilters };
}
