import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { CallDirection, CallFilterParams, CallListParams } from "@/types/calls";

export type DatePreset = "all" | "today" | "last7" | "month" | "custom";
export type SortKey = "call_timestamp" | "duration_seconds";

export const PAGE_SIZE = 20;
const DEFAULT_ORDERING = "-call_timestamp";
const PRESETS: DatePreset[] = ["all", "today", "last7", "month", "custom"];

// "en-CA" formats as YYYY-MM-DD; the time zone makes it the Nepal date.
const NPT_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" });

function shiftDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function presetRange(range: DatePreset, from: string, to: string) {
  const today = NPT_DATE.format(new Date());
  switch (range) {
    case "today":
      return { date_from: today, date_to: today };
    case "last7":
      return { date_from: shiftDays(today, -6), date_to: today };
    case "month":
      return { date_from: `${today.slice(0, 8)}01`, date_to: today };
    case "custom":
      return { date_from: from || undefined, date_to: to || undefined };
    default:
      return { date_from: undefined, date_to: undefined };
  }
}

export function useCallFilters() {
  const [params, setParams] = useSearchParams();

  const search = params.get("q") ?? "";
  const rawDirection = params.get("direction");
  const direction: CallDirection | "" =
    rawDirection === "inbound" || rawDirection === "outbound" ? rawDirection : "";
  const createdBy = params.get("by") ?? "";
  const branch = params.get("branch") ?? "";
  const rawRange = params.get("range") as DatePreset | null;
  const range: DatePreset = rawRange && PRESETS.includes(rawRange) ? rawRange : "all";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const ordering = params.get("sort") ?? DEFAULT_ORDERING;
  const page = Math.max(1, Number(params.get("page")) || 1);

  /** Change filters; going back to page 1 unless told otherwise. */
  const update = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const apiFilters = useMemo<CallFilterParams>(() => {
    const { date_from, date_to } = presetRange(range, from, to);
    return {
      search: search.trim() || undefined,
      direction: direction || undefined,
      created_by: createdBy ? Number(createdBy) : undefined,
      branch_id: branch ? Number(branch) : undefined,
      date_from,
      date_to,
    };
  }, [search, direction, createdBy, branch, range, from, to]);

  const listParams = useMemo<CallListParams>(
    () => ({ ...apiFilters, ordering, page, page_size: PAGE_SIZE }),
    [apiFilters, ordering, page],
  );

  const toggleSort = (key: SortKey) => {
    // First click sorts newest/longest first; clicking again reverses it.
    const next = ordering === `-${key}` ? key : `-${key}`;
    update({ sort: next === DEFAULT_ORDERING ? null : next });
  };

  const hasActiveFilters = Boolean(search || direction || createdBy || branch || range !== "all");

  return {
    values: { search, direction, createdBy, branch, range, from, to },
    ordering,
    page,
    apiFilters,
    listParams,
    hasActiveFilters,
    update,
    setPage: (n: number) => update({ page: n > 1 ? String(n) : null }, false),
    toggleSort,
    clear: () => setParams({}, { replace: true }),
  };
}