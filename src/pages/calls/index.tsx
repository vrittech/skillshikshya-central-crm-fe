
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalls, useCallsSummary, useExportCsv } from "@/hooks/use-calls";
import { CallsSummaryCards } from "./components/calls-summary-cards";
import { CallsTable } from "./components/calls-table";
import { CallDetailSheet } from "./components/call-detail-sheet";
import type { Call, CallDirection, CallListParams } from "@/types/calls";

const DEFAULT_PAGE_SIZE = 25;

export default function CallsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);

  // Read filters and pagination directly from the URL.
  const search = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(search);
  const direction = searchParams.get("direction") ?? "all";
  const outcome = searchParams.get("outcome") ?? "";
  const caller = searchParams.get("caller") ?? "";
  const dateFrom = searchParams.get("call_timestamp__gte") ?? "";
  const dateTo = searchParams.get("call_timestamp__lte") ?? "";
  const ordering = searchParams.get("ordering") ?? "-call_timestamp";

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("page_size")) || DEFAULT_PAGE_SIZE),
  );

  // Update URL parameters without removing other active filters.
  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });

    setSearchParams(next);
  }

  function updateFilter(key: string, value: string) {
    updateParams({
      [key]: value,
      page: "",
    });
  }
  // Keep the input synchronized with browser URL navigation.
useEffect(() => {
  setSearchInput(search);
}, [search]);

// Apply search after the user stops typing for 300ms.
useEffect(() => {
  const timer = window.setTimeout(() => {
    if (searchInput !== search) {
      updateFilter("search", searchInput);
    }
  }, 300);

  return () => window.clearTimeout(timer);
}, [searchInput, search]);

  function handleSort(field: string) {
    const nextOrdering =
      ordering === field ? `-${field}` : field;

    updateParams({
      ordering: nextOrdering,
      page: "",
    });
  }

  // Only send supported API parameters.
  const filters: CallListParams = useMemo(
    () => ({
      search: search || undefined,
      direction:
        direction === "all"
          ? undefined
          : (direction as CallDirection),
      outcome: outcome || undefined,
      caller: caller || undefined,
      call_timestamp__gte: dateFrom || undefined,
      call_timestamp__lte: dateTo || undefined,
      ordering,
    }),
    [search, direction, outcome, caller, dateFrom, dateTo, ordering],
  );

  const listParams: CallListParams = {
    ...filters,
    page,
    page_size: pageSize,
  };

  const callsQuery = useCalls(listParams);
  const summaryQuery = useCallsSummary(filters);
  const exportCsv = useExportCsv();

  const calls = callsQuery.data?.results ?? [];
  const count = callsQuery.data?.count ?? 0;

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = count === 0 ? 0 : (currentPage - 1) * pageSize;

  async function handleExport() {
    try {
      await exportCsv.action(filters);
    } catch (error) {
      exportCsv.failure(error);
    }
  }

  function clearFilters() {
    setSearchParams({
      ordering: "-call_timestamp",
      page: "1",
      page_size: String(DEFAULT_PAGE_SIZE),
    });
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>

          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Calls
          </h1>

          <p className="text-muted-foreground mt-1 text-sm">
            Monitor call activity, review conversations, and export call records.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={callsQuery.isLoading || count === 0}
        >
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <CallsSummaryCards
        data={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
      />

      {/* Calls list */}
      <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
        {/* Filters */}
        <div className="space-y-4 border-b p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
           <Input
  placeholder="Search calls, leads, phone..."
  value={searchInput}
  onChange={(event) => setSearchInput(event.target.value)}
/>

            <Select
              value={direction}
              onValueChange={(value) =>
                updateFilter(
                  "direction",
                  value === "all" ? "" : value,
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by caller"
              value={caller}
              onChange={(event) =>
                updateFilter("caller", event.target.value)
              }
            />

            <Input
              placeholder="Filter by outcome"
              value={outcome}
              onChange={(event) =>
                updateFilter("outcome", event.target.value)
              }
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">
                From date
              </label>
              <Input
                type="date"
                value={dateFrom.slice(0, 10)}
                onChange={(event) =>
                  updateFilter(
                    "call_timestamp__gte",
                    event.target.value
                      ? `${event.target.value}T00:00:00`
                      : "",
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">
                To date
              </label>
              <Input
                type="date"
                value={dateTo.slice(0, 10)}
                onChange={(event) =>
                  updateFilter(
                    "call_timestamp__lte",
                    event.target.value
                      ? `${event.target.value}T23:59:59`
                      : "",
                  )
                }
              />
            </div>

            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <RefreshCw className="mr-2 size-3" />
              Clear filters
            </Button>
          </div>
        </div>

        {/* Table */}
        {callsQuery.isError ? (
          <div className="text-destructive px-4 py-12 text-center text-sm">
            Failed to load calls. Please check your connection and try again.
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => callsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <CallsTable
            calls={calls}
            isLoading={callsQuery.isLoading}
            ordering={ordering}
            onSort={handleSort}
            onSelect={(call: Call) => setSelectedCallId(call.id)}
          />
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground text-sm">
              {count === 0
                ? "No calls"
                : `Showing ${start + 1}–${Math.min(
                    start + pageSize,
                    count,
                  )} of ${count} calls`}
            </span>

            <Select
              value={String(pageSize)}
              onValueChange={(value) =>
                updateParams({
                  page_size: value,
                  page: "1",
                })
              }
            >
              <SelectTrigger className="h-8 w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || callsQuery.isFetching}
              onClick={() =>
                updateParams({ page: String(currentPage - 1) })
              }
            >
              <ChevronLeft className="mr-1 size-4" />
              Previous
            </Button>

            <span className="text-muted-foreground px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={
                currentPage >= totalPages || callsQuery.isFetching
              }
              onClick={() =>
                updateParams({ page: String(currentPage + 1) })
              }
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Call details drawer */}
      <CallDetailSheet
        callId={selectedCallId}
        onClose={() => setSelectedCallId(null)}
      />
    </div>
  );
}
