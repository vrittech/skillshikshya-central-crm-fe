import { useEffect, useMemo, useState } from "react";
import type { ApiGlobalCall } from "@/types/calls-api";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { useCallsSummary, useGlobalCalls } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { callsService } from "@/services/calls.service";

import type { GlobalCallParams } from "@/types/calls-api";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === undefined) return "-";

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatTalkTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}

function formatDay(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function CallsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [direction, setDirection] = useState(
    searchParams.get("direction") ?? "",
  );
  const [loggedBy, setLoggedBy] = useState(
    searchParams.get("created_by") ?? "",
  );
  const [dateRange, setDateRange] = useState(
    searchParams.get("dateRange") ?? "all",
  );
  const [customStart, setCustomStart] = useState(
    searchParams.get("customStart") ?? "",
  );
  const [customEnd, setCustomEnd] = useState(
    searchParams.get("customEnd") ?? "",
  );
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  const [sortField, setSortField] = useState<
    "call_timestamp" | "duration_seconds"
  >(
    searchParams.get("sortField") === "duration_seconds"
      ? "duration_seconds"
      : "call_timestamp",
  );

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    searchParams.get("sortDirection") === "asc" ? "asc" : "desc",
  );

  const [selectedCall, setSelectedCall] = useState<ApiGlobalCall | null>(null);

  const filters = useMemo<GlobalCallParams>(() => {
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;

    if (dateRange === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      );
    } else if (dateRange === "7days") {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 0);
    } else if (dateRange === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateRange === "custom") {
      if (customStart) {
        start = new Date(`${customStart}T00:00:00`);
      }
      if (customEnd) {
        end = new Date(`${customEnd}T23:59:59`);
      }
    }

    return {
      search: search.trim() || undefined,
      created_by: loggedBy ? Number(loggedBy) : undefined,
      direction: direction ? (direction as "inbound" | "outbound") : undefined,
      call_timestamp__gte: start?.toISOString(),
      call_timestamp__lte: end?.toISOString(),
    };
  }, [search, direction, dateRange, customStart, customEnd, loggedBy]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (direction) params.set("direction", direction);
    if (loggedBy) params.set("created_by", loggedBy);
    if (dateRange !== "all") params.set("dateRange", dateRange);
    if (customStart) params.set("customStart", customStart);
    if (customEnd) params.set("customEnd", customEnd);
    if (page > 1) params.set("page", String(page));

    params.set("sortField", sortField);
    params.set("sortDirection", sortDirection);

    setSearchParams(params, { replace: true });
  }, [
    search,
    direction,
    loggedBy,
    dateRange,
    customStart,
    customEnd,
    page,
    sortField,
    sortDirection,
    setSearchParams,
  ]);

  const listParams = useMemo(
    () => ({
      ...filters,
      ordering: `${sortDirection === "desc" ? "-" : ""}${sortField}`,
      page,
      page_size: PAGE_SIZE,
    }),
    [filters, page, sortField, sortDirection],
  );

  const {
    data: callsData,
    isLoading,
    isError,
    refetch,
  } = useGlobalCalls(listParams);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useCallsSummary(filters);

  const { data: usersData } = useUsers(1, 100);
  const users = usersData?.results ?? [];

  const calls = callsData?.results ?? [];
  const dailyCalls = summary?.daily_calls ?? [];
  const topCallers = summary?.top_callers ?? [];

  const totalPages = Math.max(
    1,
    Math.ceil((callsData?.count ?? 0) / PAGE_SIZE),
  );

  const maxDailyCalls = Math.max(1, ...dailyCalls.map((item) => item.count));

  function handleExport() {
    try {
      window.location.assign(callsService.exportCsvUrl(filters));
    } catch {
      toast.error("Unable to export calls.");
    }
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleDirection(value: string) {
    setDirection(value);
    setPage(1);
  }

  function handleSort(field: "call_timestamp" | "duration_seconds") {
    if (sortField === field) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(1);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calls</h1>
          <p className="text-sm text-muted-foreground">
            View and track calls across all leads.
          </p>
        </div>

        <Button onClick={handleExport}>Export CSV</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Calls</p>

          <p className="mt-2 text-2xl font-bold">
            {summaryLoading
              ? "..."
              : summaryError
                ? "-"
                : (summary?.total_calls ?? 0)}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Inbound: {summary?.inbound_calls ?? 0} | Outbound:{" "}
            {summary?.outbound_calls ?? 0}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Talk Time</p>

          <p className="mt-2 text-2xl font-bold">
            {summaryLoading
              ? "..."
              : summaryError
                ? "-"
                : formatTalkTime(summary?.talk_time_seconds ?? 0)}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Time spent on calls
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Average Duration</p>

          <p className="mt-2 text-2xl font-bold">
            {summaryLoading
              ? "..."
              : summaryError
                ? "-"
                : formatDuration(summary?.average_duration_seconds ?? 0)}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Average time per call
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Connect Rate</p>

          <p className="mt-2 text-2xl font-bold">
            {summaryLoading
              ? "..."
              : summaryError
                ? "-"
                : `${summary?.connect_rate ?? 0}%`}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Connected calls: {summary?.connected_calls ?? 0}
          </p>
        </div>
      </div>

      {/* Daily calls and top callers */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 xl:col-span-2">
          <h2 className="font-semibold">Daily Calls</h2>

          <p className="mb-5 text-sm text-muted-foreground">
            Number of calls per day
          </p>

          {summaryLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading chart...
            </p>
          ) : summaryError ? (
            <p className="py-10 text-center text-sm text-destructive">
              Unable to load daily calls.
            </p>
          ) : dailyCalls.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No daily call data available.
            </p>
          ) : (
            <div className="flex h-48 items-end gap-2 overflow-x-auto border-b px-2">
              {dailyCalls.map((item) => (
                <div
                  key={item.date}
                  className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-2"
                  title={`${item.date}: ${item.count} calls`}
                >
                  <span className="text-xs text-muted-foreground">
                    {item.count}
                  </span>

                  <div
                    className="w-full max-w-12 rounded-t-md bg-primary"
                    style={{
                      height: `${Math.max(
                        6,
                        (item.count / maxDailyCalls) * 100,
                      )}%`,
                    }}
                  />

                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDay(item.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Top 10 Callers</h2>

          <p className="mb-4 text-sm text-muted-foreground">
            Callers with the most calls
          </p>

          {summaryLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading callers...
            </p>
          ) : summaryError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Unable to load callers.
            </p>
          ) : topCallers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No caller data available.
            </p>
          ) : (
            <div className="space-y-3">
              {topCallers.slice(0, 10).map((caller, index) => (
                <div
                  key={`${caller.created_by__name ?? "unknown"}-${index}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {index + 1}. {caller.created_by__name || "Unknown caller"}
                  </span>

                  <Badge variant="secondary">{caller.call_count} calls</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search calls, leads, phone..."
          value={search}
          onChange={(event) => handleSearch(event.target.value)}
          className="max-w-sm"
        />

        <select
          value={loggedBy}
          onChange={(event) => {
            setLoggedBy(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All callers</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>

        <select
          value={direction}
          onChange={(event) => handleDirection(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>

        {/* Date range filter */}
        <select
          value={dateRange}
          onChange={(event) => {
            setDateRange(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="7days">Last 7 days</option>
          <option value="month">This month</option>
          <option value="custom">Custom range</option>
        </select>

        {dateRange === "custom" && (
          <>
            <Input
              type="date"
              value={customStart}
              onChange={(event) => {
                setCustomStart(event.target.value);
                setPage(1);
              }}
              className="w-auto"
            />
            <Input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(event) => {
                setCustomEnd(event.target.value);
                setPage(1);
              }}
              className="w-auto"
            />
          </>
        )}

        <Button
          variant="outline"
          onClick={() => {
            setSearch("");
            setDirection("");
            setLoggedBy("");
            setDateRange("all");
            setCustomStart("");
            setCustomEnd("");
            setPage(1);
          }}
        >
          Clear Filters
        </Button>
      </div>

      {/* Calls table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">
                <button
                  type="button"
                  onClick={() => handleSort("call_timestamp")}
                  className="font-semibold hover:underline"
                >
                  Date & Time{" "}
                  {sortField === "call_timestamp"
                    ? sortDirection === "desc"
                      ? "↓"
                      : "↑"
                    : ""}
                </button>
              </th>

              <th className="p-3 text-left">Lead</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Direction</th>
              <th className="p-3 text-left">Caller</th>

              <th className="p-3 text-left">
                <button
                  type="button"
                  onClick={() => handleSort("duration_seconds")}
                  className="font-semibold hover:underline"
                >
                  Duration{" "}
                  {sortField === "duration_seconds"
                    ? sortDirection === "desc"
                      ? "↓"
                      : "↑"
                    : ""}
                </button>
              </th>

              <th className="p-3 text-left">Outcome</th>
              <th className="p-3 text-left">Logged By</th>
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="p-6 text-center">
                  Loading calls...
                </td>
              </tr>
            )}

            {isError && (
              <tr>
                <td colSpan={8} className="p-6 text-center">
                  <p className="mb-2 text-destructive">Failed to load calls.</p>

                  <Button variant="outline" onClick={() => refetch()}>
                    Try Again
                  </Button>
                </td>
              </tr>
            )}

            {!isLoading && !isError && calls.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-muted-foreground"
                >
                  {Object.values(filters).some(
                    (value) => value !== undefined && value !== "",
                  )
                    ? "No calls match your filters. Try changing or clearing your filters."
                    : "No calls have been recorded yet."}
                </td>
              </tr>
            )}

            {!isLoading &&
              !isError &&
              calls.map((call) => (
                <tr
                  key={call.id}
                  className="border-t cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCall(call)}
                >
                  <td className="whitespace-nowrap p-3">
                    {formatDate(call.call_timestamp)}
                  </td>

                  <td className="p-3">
                    <Link
                      to={`/leads/${call.lead}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {call.lead_name || `Lead #${call.lead}`}
                    </Link>

                    {call.lead_reference_number && (
                      <p className="text-xs text-muted-foreground">
                        {call.lead_reference_number}
                      </p>
                    )}
                  </td>

                  <td className="p-3">{call.phone_number || "-"}</td>

                  <td className="p-3">
                    <Badge
                      variant={
                        call.direction === "inbound" ? "secondary" : "outline"
                      }
                    >
                      {call.direction}
                    </Badge>
                  </td>

                  <td className="p-3">{call.caller || "-"}</td>

                  <td className="p-3">
                    {formatDuration(call.duration_seconds)}
                  </td>

                  <td className="p-3">{call.outcome || "-"}</td>

                  <td className="p-3">{call.created_by_name || "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

            {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Total calls: {callsData?.count ?? 0}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>

          <span className="text-sm">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Call Details Side Panel */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-md overflow-y-auto bg-background p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Call Details</h2>

              <Button
                variant="outline"
                onClick={() => setSelectedCall(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <p><strong>Lead:</strong> {selectedCall.lead_name}</p>
              <p><strong>Reference:</strong> {selectedCall.lead_reference_number || "-"}</p>
              <p><strong>Date:</strong> {formatDate(selectedCall.call_timestamp)}</p>
              <p><strong>Phone:</strong> {selectedCall.phone_number || "-"}</p>
              <p><strong>Direction:</strong> {selectedCall.direction}</p>
              <p><strong>Caller:</strong> {selectedCall.caller || "-"}</p>
              <p><strong>Duration:</strong> {formatDuration(selectedCall.duration_seconds)}</p>
              <p><strong>Outcome:</strong> {selectedCall.outcome || "-"}</p>
              <p><strong>Logged By:</strong> {selectedCall.created_by_name || "-"}</p>
              <p><strong>Notes:</strong> {selectedCall.notes || "-"}</p>
              <p>
                <strong>Next Follow-up:</strong>{" "}
                {selectedCall.next_followup_at
                  ? formatDate(selectedCall.next_followup_at)
                  : "-"}
              </p>
              <p><strong>Next Action:</strong> {selectedCall.next_action || "-"}</p>

              {selectedCall.recording_url && (
                <a
                  href={selectedCall.recording_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Open recording
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}