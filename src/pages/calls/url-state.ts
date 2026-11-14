import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { CallQueryParams } from "@/types/calls";

export type DatePreset = "all" | "today" | "7d" | "month" | "custom";
export const PAGE_SIZE = 20;
const FILTER_KEYS = ["q", "direction", "user", "branch", "preset", "from", "to"] as const;

/** YYYY-MM-DD of `d` in Nepal time, whatever the browser's time zone. */
export function nepalDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(d);
}

function shiftDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Bare dates: the backend reads them as whole Nepal days (lte runs to 23:59:59). */
export function presetRange(preset: DatePreset, from = "", to = ""): { gte?: string; lte?: string } {
  const today = nepalDate();
  if (preset === "today") return { gte: today, lte: today };
  if (preset === "7d") return { gte: shiftDays(today, -6), lte: today };
  if (preset === "month") return { gte: `${today.slice(0, 8)}01`, lte: today };
  if (preset === "custom") return { gte: from || undefined, lte: to || undefined };
  return {};
}

/** Filters, sort and page live in the URL so a reload or shared link shows the same view. */
export function useCallsUrlState() {
  const [sp, setSp] = useSearchParams();
  const get = (k: string) => sp.get(k) ?? "";
  const state = {
    q: get("q"),
    direction: get("direction") || "all",
    user: get("user"),
    branch: get("branch"),
    preset: (get("preset") || "all") as DatePreset,
    from: get("from"),
    to: get("to"),
    sort: get("sort") || "-call_timestamp",
    page: Math.max(1, Number(get("page")) || 1),
  };

  const update = useCallback(
    (patch: Partial<Record<string, string | number>>) =>
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          // Any filter change goes back to page 1.
          if (!("page" in patch)) next.delete("page");
          for (const [k, v] of Object.entries(patch)) {
            const s = v == null ? "" : String(v);
            if (!s || s === "all" || (k === "sort" && s === "-call_timestamp") || (k === "page" && s === "1"))
              next.delete(k);
            else next.set(k, s);
          }
          return next;
        },
        { replace: true },
      ),
    [setSp],
  );

  const clear = useCallback(() => setSp(new URLSearchParams(), { replace: true }), [setSp]);
  const hasFilters = FILTER_KEYS.some((k) => sp.get(k));

  const filterParams = useMemo<CallQueryParams>(() => {
    const range = presetRange(state.preset, state.from, state.to);
    return {
      search: state.q || undefined,
      direction: state.direction === "all" ? undefined : state.direction,
      created_by: state.user || undefined,
      branch_id: state.branch || undefined,
      call_timestamp__gte: range.gte,
      call_timestamp__lte: range.lte,
    };
  }, [state.q, state.direction, state.user, state.branch, state.preset, state.from, state.to]);

  return { state, update, clear, hasFilters, filterParams };
}
