import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CALL_DATE_RANGES,
  dayEndIso,
  dayStartIso,
  presetDates,
  type CallDateRange,
} from "@/lib/call-dates";
import type { CallDirection, CallFilterParams, CallListParams } from "@/types/calls";

export const PAGE_SIZE = 20;
const DEFAULT_SORT = "-call_timestamp";
const SORTS = ["-call_timestamp", "call_timestamp", "-duration_seconds", "duration_seconds"];

export type CallSortColumn = "call_timestamp" | "duration_seconds";

export interface CallFilterState {
  search: string;
  direction: CallDirection | "";
  user: string;
  branch: string;
  range: CallDateRange;
  from: string;
  to: string;
  sort: string;
  page: number;
}

export function useCallFilters() {
  const [sp, setSp] = useSearchParams();

  const state = useMemo<CallFilterState>(() => {
    const direction = sp.get("direction");
    const rawRange = sp.get("range") ?? "";
    const sort = sp.get("sort") ?? "";
    const page = Number(sp.get("page"));
    return {
      search: sp.get("q") ?? "",
      direction: direction === "inbound" || direction === "outbound" ? direction : "",
      user: sp.get("user") ?? "",
      branch: sp.get("branch") ?? "",
      range: (CALL_DATE_RANGES as readonly string[]).includes(rawRange)
        ? (rawRange as CallDateRange)
        : "all",
      from: sp.get("from") ?? "",
      to: sp.get("to") ?? "",
      sort: SORTS.includes(sort) ? sort : DEFAULT_SORT,
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }, [sp]);

  /** Set (string) or remove (null/"") URL keys. Any filter change goes back to page 1. */
  const patch = useCallback(
    (changes: Record<string, string | null>, keepPage = false) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!keepPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );

  const actions = useMemo(
    () => ({
      setSearch: (v: string) => patch({ q: v.trim() }),
      setDirection: (v: CallDirection | "") => patch({ direction: v }),
      setUser: (v: string) => patch({ user: v }),
      setBranch: (v: string) => patch({ branch: v }),
      setRange: (range: CallDateRange) =>
        patch(
          range === "custom"
            ? { range }
            : { range: range === "all" ? null : range, from: null, to: null },
        ),
      setCustomDate: (key: "from" | "to", v: string) => patch({ range: "custom", [key]: v }),
      /** First click on a column sorts descending; clicking again reverses it. */
      toggleSort: (column: CallSortColumn) => {
        const next = state.sort === `-${column}` ? column : `-${column}`;
        patch({ sort: next === DEFAULT_SORT ? null : next });
      },
      setPage: (page: number) => patch({ page: page > 1 ? String(page) : null }, true),
      clear: () => setSp({}, { replace: true }),
    }),
    [patch, setSp, state.sort],
  );

  /** Filters only (no page, no sort): shared by the table, the summary and the export. */
  const filterParams = useMemo<CallFilterParams>(() => {
    const dates =
      state.range === "custom" ? { from: state.from, to: state.to } : presetDates(state.range);
    return {
      search: state.search || undefined,
      direction: state.direction || undefined,
      created_by: state.user ? Number(state.user) : undefined,
      branch_id: state.branch ? Number(state.branch) : undefined,
      call_timestamp__gte: dates?.from ? dayStartIso(dates.from) : undefined,
      call_timestamp__lte: dates?.to ? dayEndIso(dates.to) : undefined,
    };
  }, [state]);

  const listParams = useMemo<CallListParams>(
    () => ({ ...filterParams, page: state.page, page_size: PAGE_SIZE, ordering: state.sort }),
    [filterParams, state.page, state.sort],
  );

  const hasActiveFilters = Object.values(filterParams).some((v) => v !== undefined);

  return { state, actions, filterParams, listParams, hasActiveFilters };
}