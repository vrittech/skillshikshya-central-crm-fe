import {
  Search,
  Calendar as CalendarIcon,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Download,
  RotateCcw,
  Loader2,
  PhoneCall,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
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
import { useRole } from "@/context/role";
import { useCalls, useCallSummary } from "@/hooks/use-calls";
import { useBranches } from "@/hooks/use-branches";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MiniBars, HBarList } from "@/components/charts";
import { CallDetailSheet } from "./components/call-detail-sheet";
import { callsService } from "@/services/calls.service";
import type { CallItem } from "@/types/calls";

export default function CallsPage() {
  const navigate = useNavigate();
  const { can } = useRole();
  const { data: branchesData, isLoading: isBranchesLoading } = useBranches();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization (US-2)
  const search = searchParams.get("search") || "";
  const direction = searchParams.get("direction") || "all";
  const caller = searchParams.get("caller") || "all";
  const outcome = searchParams.get("outcome") || "all";
  const dateRange = searchParams.get("date_range") || "all_time";
  const branchId = searchParams.get("branch_id") || "all";
  const ordering = searchParams.get("ordering") || "-call_timestamp";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [debouncedSearch, setSearchInput] = useDebouncedValue(search, 300);
  const [selectedCall, setSelectedCall] = useState<CallItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Helper for date range parameters (NPT day boundaries)
  const getDateRangeBounds = (preset: string) => {
    if (!preset || preset === "all_time") return {};
    const now = new Date();
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    ).toISOString();
    let start: Date;

    if (preset === "today") {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
    } else if (preset === "last_7_days") {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7,
        0,
        0,
        0,
        0,
      );
    } else if (preset === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else {
      return {};
    }

    return {
      call_timestamp__gte: start.toISOString(),
      call_timestamp__lte: end,
    };
  };

  const updateUrlParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val && val !== "all" && val !== "all_time") {
        next.set(key, val);
      } else {
        next.delete(key);
      }
    });
    next.set("page", "1");
    setSearchParams(next);
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    updateUrlParams({ search: val || null });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchParams({});
  };

  const handleSort = (column: string) => {
    let nextOrdering = column;
    if (ordering === column) {
      nextOrdering = `-${column}`;
    } else if (ordering === `-${column}`) {
      nextOrdering = column;
    }
    const next = new URLSearchParams(searchParams);
    next.set("ordering", nextOrdering);
    setSearchParams(next);
  };

  const filterParams = useMemo(
    () => ({
      page,
      page_size: 20,
      search: debouncedSearch,
      direction: direction !== "all" ? direction : undefined,
      created_by: caller !== "all" ? caller : undefined,
      outcome: outcome !== "all" ? outcome : undefined,
      branch_id: branchId !== "all" ? branchId : undefined,
      ordering,
      ...getDateRangeBounds(dateRange),
    }),
    [
      page,
      debouncedSearch,
      direction,
      caller,
      outcome,
      branchId,
      ordering,
      dateRange,
    ],
  );

  const exportFilterParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      direction: direction !== "all" ? direction : undefined,
      created_by: caller !== "all" ? caller : undefined,
      outcome: outcome !== "all" ? outcome : undefined,
      branch_id: branchId !== "all" ? branchId : undefined,
      ordering,
      ...getDateRangeBounds(dateRange),
    }),
    [
      debouncedSearch,
      direction,
      caller,
      outcome,
      branchId,
      ordering,
      dateRange,
    ],
  );

  const {
    data: callData,
    isLoading,
    isError,
    refetch,
  } = useCalls(filterParams);
  const { data: summary, isLoading: isSummaryLoading } = useCallSummary({
    search: debouncedSearch,
    direction: direction !== "all" ? direction : undefined,
    created_by: caller !== "all" ? caller : undefined,
    branch_id: branchId !== "all" ? branchId : undefined,
    ...getDateRangeBounds(dateRange),
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await callsService.exportCsv(exportFilterParams);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- 1. Top Cards Section (US-1) ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="font-headline text-3xl font-bold">
            {isSummaryLoading ? "—" : (summary?.total_calls ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary
              ? `${summary.outbound} outbound · ${summary.inbound} inbound`
              : "0 outbound · 0 inbound"}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="font-headline text-3xl font-bold">
            {isSummaryLoading ? "—" : (summary?.total_formatted ?? "0m 0s")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary
              ? `${Math.floor((summary.total_seconds || 0) / 60)} min total duration`
              : "0 min total duration"}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="font-headline text-3xl font-bold">
            {isSummaryLoading
              ? "—"
              : `${Math.floor((summary?.avg_seconds || 0) / 60)}m ${Math.round((summary?.avg_seconds || 0) % 60)}s`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            per completed call
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="font-headline text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {isSummaryLoading
              ? "—"
              : `${((summary?.connect_rate || 0) * 100).toFixed(1)}%`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary
              ? `${summary.connected_calls} connected (>0s) of ${summary.total_calls} calls`
              : "0 connected"}
          </p>
        </div>
      </div>

      {/* ---------------- 2. Charts Section (US-1) ---------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-base">Calls per Day</h3>
              <p className="text-xs text-muted-foreground">
                Counted in Nepal Time (NPT)
              </p>
            </div>
            <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              {summary?.by_day?.length ?? 0} days
            </span>
          </div>

          {summary?.by_day && summary.by_day.length > 0 ? (
            <div className="pt-2">
              <MiniBars values={summary.by_day.map((d) => d.calls)} />
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>{summary.by_day[0]?.date}</span>
                <span>{summary.by_day[summary.by_day.length - 1]?.date}</span>
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              No call data for the selected period
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-base">Top 10 Callers</h3>
              <p className="text-xs text-muted-foreground">
                Ranked by number of completed calls
              </p>
            </div>
            <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              Top callers
            </span>
          </div>

          {summary?.by_user && summary.by_user.length > 0 ? (
            <div className="space-y-3">
              <HBarList
                data={summary.by_user.map((u) => ({
                  label: u.name,
                  value: u.calls,
                }))}
              />
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              No caller stats available
            </div>
          )}
        </div>
      </div>

      {/* ---------------- 3. Filter Toolbar (US-2 & US-4) ---------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by lead, phone, caller, or notes..."
            className="rounded-full pl-9"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <Select
          value={direction}
          onValueChange={(val) => updateUrlParams({ direction: val })}
        >
          <SelectTrigger className="w-36 rounded-lg">
            <SelectValue placeholder="All directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={caller}
          onValueChange={(val) => updateUrlParams({ caller: val })}
        >
          <SelectTrigger className="w-36 rounded-lg">
            <SelectValue placeholder="All callers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All callers</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={outcome}
          onValueChange={(val) => updateUrlParams({ outcome: val })}
        >
          <SelectTrigger className="w-36 rounded-lg">
            <SelectValue placeholder="All outcomes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="wrong_number">Wrong Number</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={dateRange}
          onValueChange={(val) => updateUrlParams({ date_range: val })}
        >
          <SelectTrigger className="w-36 rounded-lg">
            <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_time">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="last_7_days">Last 7 days</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
          </SelectContent>
        </Select>


        {(can as (permission: string) => boolean)("view_branches") && (
          <Select
            value={branchId}
            onValueChange={(val) => updateUrlParams({ branch_id: val })}
          >
            <SelectTrigger className="w-36 rounded-lg">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {isBranchesLoading ? (
                <SelectItem value="loading" disabled>
                  Loading branches...
                </SelectItem>
              ) : (
                branchesData?.results?.map(
                  (b: { id: number; name: string }) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ),
                )
              )}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 rounded-lg text-xs gap-1"
        >
          <RotateCcw className="size-3.5" /> Clear filters
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCsv}
          disabled={isExporting}
          className="h-9 rounded-lg text-xs gap-1 ml-auto"
        >
          {isExporting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="size-3.5" />
              <span>Export CSV</span>
            </>
          )}
        </Button>
      </div>

      {/* ---------------- 4. Call Table (US-2 & US-3) ---------------- */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th
                  className="p-3 cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => handleSort("call_timestamp")}
                >
                  <div className="flex items-center gap-1">
                    WHEN
                    {ordering.includes("call_timestamp") ? (
                      ordering.startsWith("-") ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUp className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/50" />
                    )}
                  </div>
                </th>
                <th className="p-3">DIRECTION</th>
                <th className="p-3">LEAD</th>
                <th className="p-3">PHONE</th>
                <th className="p-3">LOGGED BY</th>
                <th
                  className="p-3 cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => handleSort("duration_seconds")}
                >
                  <div className="flex items-center gap-1">
                    DURATION
                    {ordering.includes("duration_seconds") ? (
                      ordering.startsWith("-") ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUp className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/50" />
                    )}
                  </div>
                </th>
                <th className="p-3">OUTCOME</th>
                <th className="p-3">RECORDING</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Loading call log...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-destructive">
                    Failed to fetch calls.{" "}
                    <Button
                      variant="link"
                      onClick={() => refetch()}
                      className="p-0 h-auto"
                    >
                      Retry
                    </Button>
                  </td>
                </tr>
              ) : callData?.results?.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <PhoneCall className="size-6 text-muted-foreground/60 mb-1" />
                      <span className="text-sm font-medium">
                        {search ||
                        direction !== "all" ||
                        outcome !== "all" ||
                        dateRange !== "all_time" ||
                        branchId !== "all"
                          ? "No calls match these filters"
                          : "No calls yet"}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                callData?.results?.map((call) => (
                  <tr
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {new Date(call.call_timestamp).toLocaleString("en-NP", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                          call.direction === "outbound"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        }`}
                      >
                        {call.direction === "outbound"
                          ? "↖ Outbound"
                          : "↘ Inbound"}
                      </span>
                    </td>

                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => navigate(`/leads/${call.lead}`)} // Adjust route if your lead detail route differs (e.g., /leads/${call.lead_id})
                        className="font-semibold text-brand hover:underline block text-left"
                      >
                        {call.lead_name}
                      </button>
                      <span className="text-xs text-muted-foreground font-mono">
                        {call.lead_reference_number}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {call.phone_number}
                    </td>

                    <td className="p-3">
                      {call.created_by_name ??
                        (call.created_by ? `User #${call.created_by}` : "—")}
                    </td>

                    <td className="p-3 font-mono text-xs">
                      {call.duration_formatted ?? `${call.duration_seconds}s`}
                    </td>
                    <td className="p-3">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                        {call.outcome?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      {call.recording_url ? (
                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand underline font-medium"
                        >
                          Listen
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- 5. Pagination Footer (US-2) ---------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-2">
        <div>
          Showing {callData?.count ? (page - 1) * 20 + 1 : 0}–
          {Math.min(page * 20, callData?.count || 0)} of {callData?.count || 0}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("page", (page - 1).toString());
              setSearchParams(next);
            }}
            className="h-8 text-xs"
          >
            Previous
          </Button>
          <span className="px-2 font-mono">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 20 >= (callData?.count || 0)}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("page", (page + 1).toString());
              setSearchParams(next);
            }}
            className="h-8 text-xs"
          >
            Next
          </Button>
        </div>
      </div>

      {/* ---------------- 6. Side Sheet Panel (US-3) ---------------- */}
      <CallDetailSheet
        call={selectedCall}
        open={Boolean(selectedCall)}
        onOpenChange={(isOpen) => !isOpen && setSelectedCall(null)}
      />
    </div>
  );
}
