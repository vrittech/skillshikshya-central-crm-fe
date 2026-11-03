import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import { useCallSummary, useCalls, useExportCalls } from "@/hooks/use-calls";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { CallsFilterParams } from "@/types/calls";
import { CallFilters, type CallDateRange } from "./components/call-filters";
import { CallsSummaryOverview } from "./components/calls-summary";
import { CallsTable } from "./components/calls-table";
import { CallDetailSheet } from "./components/call-detail-sheet";
import type { CallRow } from "@/types/calls";

const PAGE_SIZE = 20;
const DEFAULT_ORDERING = "-call_timestamp";
const SORT_FIELDS = ["call_timestamp", "-call_timestamp", "duration_seconds", "-duration_seconds"];

function positiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function localDayBounds(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function customDayBoundary(date: string, endOfDay: boolean): string | undefined {
  if (!date) return undefined;
  const boundary = new Date(`${date}T00:00:00`);
  if (Number.isNaN(boundary.getTime())) return undefined;
  boundary.setHours(
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return boundary.toISOString();
}

function getDateBounds(range: CallDateRange, from: string, to: string) {
  if (range === "today") return localDayBounds(new Date());
  if (range === "last7") {
    const firstDay = new Date();
    firstDay.setHours(0, 0, 0, 0);
    firstDay.setDate(firstDay.getDate() - 6);
    return { start: firstDay.toISOString(), end: localDayBounds(new Date()).end };
  }
  if (range === "month") {
    const firstDay = new Date();
    firstDay.setDate(1);
    firstDay.setHours(0, 0, 0, 0);
    return { start: firstDay.toISOString(), end: localDayBounds(new Date()).end };
  }
  if (range === "custom") {
    return {
      start: customDayBoundary(from, false),
      end: customDayBoundary(to, true),
    };
  }
  return {};
}

export default function CallsPage() {
  const { user } = useAuth();
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const debouncedSearch = useDebouncedValue(search, 300);
  const directionValue = searchParams.get("direction") ?? "";
  const direction =
    directionValue === "inbound" || directionValue === "outbound" ? directionValue : "";
  const createdByValue = searchParams.get("created_by") ?? "";
  const createdBy = /^\d+$/.test(createdByValue) ? createdByValue : "";
  const branchValue = searchParams.get("branch_id") ?? "";
  const branchId = /^\d+$/.test(branchValue) ? branchValue : "";
  const rangeValue = searchParams.get("range") ?? "";
  const dateRange: CallDateRange =
    rangeValue === "today" || rangeValue === "last7" || rangeValue === "month" || rangeValue === "custom"
      ? rangeValue
      : "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const orderingValue = searchParams.get("ordering") ?? DEFAULT_ORDERING;
  const ordering = SORT_FIELDS.includes(orderingValue) ? orderingValue : DEFAULT_ORDERING;
  const page = positiveInteger(searchParams.get("page"), 1);
  const showBranch = Boolean(user?.is_staff || user?.is_superuser);

  const bounds = useMemo(
    () => getDateBounds(dateRange, dateFrom, dateTo),
    [dateRange, dateFrom, dateTo],
  );
  const callFilters = useMemo<CallsFilterParams>(
    () => ({
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(direction ? { direction } : {}),
      ...(createdBy ? { created_by: Number(createdBy) } : {}),
      ...(showBranch && branchId ? { branch_id: Number(branchId) } : {}),
      ...(bounds.start ? { call_timestamp__gte: bounds.start } : {}),
      ...(bounds.end ? { call_timestamp__lte: bounds.end } : {}),
    }),
    [debouncedSearch, direction, createdBy, showBranch, branchId, bounds.start, bounds.end],
  );
  const calls = useCalls({ ...callFilters, ordering, page, page_size: PAGE_SIZE });
  // Summary cards will be added here; they share the list's exact filter object.
  const summary = useCallSummary(callFilters);
  const exportCalls = useExportCalls();

  function updateParams(changes: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete("page");
    setSearchParams(next);
  }

  function updateDateRange(value: CallDateRange) {
    updateParams({ range: value || null, from: null, to: null });
  }

  function updateSort(field: "call_timestamp" | "duration_seconds") {
    const next = ordering === field ? `-${field}` : field;
    updateParams({ ordering: next === DEFAULT_ORDERING ? null : next });
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
  }

  const hasFilters = Boolean(search.trim() || direction || createdBy || (showBranch && branchId) || dateRange);
  const count = calls.data?.count ?? 0;
  const rows = calls.data?.results ?? [];
  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, count);
  const initialLoading = calls.isLoading && !calls.data;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
          <p className="text-muted-foreground mt-1 text-sm">Global call log across all leads.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={exportCalls.isPending}
          onClick={() => exportCalls.mutate({ ...callFilters, ordering })}
        >
          {exportCalls.isPending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Download />
          )}
          {exportCalls.isPending ? "Preparing CSV…" : "Export CSV"}
        </Button>
      </div>

      <CallFilters
        search={search}
        direction={direction}
        createdBy={createdBy}
        branchId={showBranch ? branchId : ""}
        dateRange={dateRange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        showBranch={showBranch}
        onSearchChange={(value) => updateParams({ search: value || null })}
        onDirectionChange={(value) => updateParams({ direction: value === "all" ? null : value })}
        onCreatedByChange={(value) => updateParams({ created_by: value || null })}
        onBranchChange={(value) => updateParams({ branch_id: value === "all" ? null : value })}
        onDateRangeChange={updateDateRange}
        onDateFromChange={(value) => updateParams({ range: "custom", from: value || null })}
        onDateToChange={(value) => updateParams({ range: "custom", to: value || null })}
        onClear={clearFilters}
      />

      <CallsSummaryOverview summary={summary.data} isLoading={summary.isLoading} />

      <div className="bg-card min-w-0 overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        {calls.isError && calls.data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <p className="text-destructive text-sm">Could not load calls. Please try again.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void calls.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {initialLoading ? (
          <CallsTable
            rows={[]}
            isLoading
            ordering={ordering}
            onSort={updateSort}
            onSelectCall={setSelectedCall}
          />
        ) : calls.isError && !calls.data ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-14 text-center text-sm">
            <p>Could not load calls. Please try again.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void calls.refetch()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 px-4 py-14 text-center text-sm">
            <p>{hasFilters ? "No calls match these filters" : "No calls yet"}</p>
            {hasFilters && (
              <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <CallsTable
            rows={rows}
            isLoading={false}
            ordering={ordering}
            onSort={updateSort}
            onSelectCall={setSelectedCall}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Showing {start}–{end} of {count}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParams({ page: page > 2 ? String(page - 1) : null }, false)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page * PAGE_SIZE >= count}
            onClick={() => updateParams({ page: String(page + 1) }, false)}
          >
            Next
          </Button>
        </div>
      </div>
      <CallDetailSheet call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}
