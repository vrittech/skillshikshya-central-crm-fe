
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { callsService } from "@/services/calls.services";
import { usersService } from "@/services/users.service";
import type { User } from "@/types";
import type {
  ApiCall,
  CallSummary,
  CallListParams,
} from "@/types/calls";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function CallsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<ApiCall | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loggedBy, setLoggedBy] = useState(
    searchParams.get("created_by") ?? ""
  );

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Restore filters and pagination from URL
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [direction, setDirection] = useState(
    searchParams.get("direction") ?? ""
  );
  const [datePreset, setDatePreset] = useState(
    searchParams.get("datePreset") ?? ""
  );
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") ?? ""
  );
  const [endDate, setEndDate] = useState(
    searchParams.get("endDate") ?? ""
  );
  const [ordering, setOrdering] = useState(
    searchParams.get("ordering") ?? "-call_timestamp"
  );
  const [page, setPage] = useState(
    Math.max(1, Number(searchParams.get("page")) || 1)
  );

  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<CallSummary | null>(null);

  // Load active users for the Logged By filter
  useEffect(() => {
    usersService
      .list({ page_size: 100, is_active: true })
      .then((data) => setUsers(data.results))
      .catch(() => toast.error("Failed to load users."));
  }, []);

  // Keep filters, sorting and page number in the URL

  // Keep filters, sorting and page number in the URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    params.delete("search");
    params.delete("direction");
    params.delete("created_by");
    params.delete("datePreset");
    params.delete("startDate");
    params.delete("endDate");
    params.delete("ordering");
    params.delete("page");

    if (search.trim()) params.set("search", search.trim());
    if (direction) params.set("direction", direction);
    if (loggedBy) params.set("created_by", loggedBy);
    if (datePreset) params.set("datePreset", datePreset);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (ordering !== "-call_timestamp") {
      params.set("ordering", ordering);
    }
    if (page > 1) params.set("page", String(page));

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [
    search,
    direction,
    loggedBy,
    datePreset,
    startDate,
    endDate,
    ordering,
    page,
    searchParams,
    setSearchParams,
  ]);


  // Load calls and summary
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

        let dateFrom: string | undefined;
        let dateTo: string | undefined;

        if (datePreset === "today") {
          dateFrom = today.toISOString();

          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          dateTo = new Date(
            tomorrow.getTime() - 1000
          ).toISOString();
        } else if (datePreset === "last7") {
          const date = new Date(today);
          date.setDate(date.getDate() - 6);
          dateFrom = date.toISOString();
          dateTo = now.toISOString();
        } else if (datePreset === "month") {
          dateFrom = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          ).toISOString();
          dateTo = now.toISOString();
        } else if (datePreset === "custom") {
          if (startDate) {
            dateFrom = new Date(
              `${startDate}T00:00:00+05:45`
            ).toISOString();
          }

          if (endDate) {
            dateTo = new Date(
              `${endDate}T23:59:59+05:45`
            ).toISOString();
          }
        }

        const filters: CallListParams = {
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(direction
            ? { direction: direction as "inbound" | "outbound" }
            : {}),
          ...(loggedBy ? { created_by: Number(loggedBy) } : {}),
          ...(dateFrom ? { call_timestamp__gte: dateFrom } : {}),
          ...(dateTo ? { call_timestamp__lte: dateTo } : {}),
        };

        setLoadError(false);

        const [summaryData, response] = await Promise.all([
          callsService.summary(filters),
          callsService.list({
            ...filters,
            page,
            page_size: 20,
            ordering,
          }),
        ]);

        setSummary(summaryData);
        setCalls(response.results ?? []);
        setTotalCount(response.count ?? 0);
      } catch {
        setLoadError(true);
        toast.error("Failed to load calls.");
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    search,
    direction,
    loggedBy,
    datePreset,
    startDate,
    endDate,
    ordering,
    page,
    retryCount,
  ]);

  // Export filtered calls
  const handleExport = async () => {
    try {
      setExporting(true);

      const params: CallListParams = {
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(direction
          ? { direction: direction as "inbound" | "outbound" }
          : {}),
        ...(loggedBy ? { created_by: Number(loggedBy) } : {}),
      };

      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      if (datePreset === "today") {
        params.call_timestamp__gte = today.toISOString();

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        params.call_timestamp__lte = new Date(
          tomorrow.getTime() - 1000
        ).toISOString();
      } else if (datePreset === "last7") {
        const date = new Date(today);
        date.setDate(date.getDate() - 6);

        params.call_timestamp__gte = date.toISOString();
        params.call_timestamp__lte = now.toISOString();
      } else if (datePreset === "month") {
        params.call_timestamp__gte = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();

        params.call_timestamp__lte = now.toISOString();
      } else if (datePreset === "custom") {
        if (startDate) {
          params.call_timestamp__gte = new Date(
            `${startDate}T00:00:00+05:45`
          ).toISOString();
        }

        if (endDate) {
          params.call_timestamp__lte = new Date(
            `${endDate}T23:59:59+05:45`
          ).toISOString();
        }
      }

      await callsService.exportCsv(params);
      toast.success("Calls exported successfully.");
    } catch {
      toast.error("Failed to export calls.");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / 20);
  const startItem = totalCount === 0 ? 0 : (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, totalCount);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Calls</h1>
        <p className="text-muted-foreground">
          View and manage calls across all leads.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Calls</p>
          <h2 className="text-2xl font-bold">
            {summary?.total_calls ?? 0}
          </h2>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Inbound Calls</p>
          <h2 className="text-2xl font-bold">
            {summary?.inbound_calls ?? 0}
          </h2>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Outbound Calls</p>
          <h2 className="text-2xl font-bold">
            {summary?.outbound_calls ?? 0}
          </h2>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Talk Time</p>
          <h2 className="text-2xl font-bold">
            {Math.floor((summary?.talk_time_seconds ?? 0) / 60)} min
          </h2>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Average Duration</p>
          <h2 className="text-2xl font-bold">
            {Math.floor((summary?.average_duration_seconds ?? 0) / 60)} min
          </h2>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Connect Rate</p>
          <h2 className="text-2xl font-bold">
            {(summary?.connect_rate ?? 0).toFixed(1)}%
          </h2>
        </div>
      </div>

      {/* Daily Calls Chart */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Daily Calls</h2>

        {summary?.daily_calls.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={summary.daily_calls}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total_calls"
                name="Calls"
                stroke="#2563eb"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No daily call data available yet.
          </p>
        )}
      </div>

      {/* Top 10 Callers */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Top 10 Callers</h2>

        {summary?.top_callers.length ? (
          <div className="space-y-3">
            {summary.top_callers.map((caller, index) => (
              <div
                key={`${caller.caller}-${index}`}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <span className="text-sm">
                  {index + 1}. {caller.caller || "Unknown"}
                </span>

                <span className="font-semibold">
                  {caller.total_calls} calls
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No caller data available yet.
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search lead, phone, caller, or notes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-md rounded-md border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <select
          value={direction}
          onChange={(e) => {
            setDirection(e.target.value);
            setPage(1);
          }}
          className="rounded-md border bg-background px-4 py-2 text-sm"
        >
          <option value="">All Directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>

        <select
          value={loggedBy}
          onChange={(e) => {
            setLoggedBy(e.target.value);
            setPage(1);
          }}
          className="rounded-md border bg-background px-4 py-2 text-sm"
        >
          <option value="">All Users</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>

        <select
          value={datePreset}
          onChange={(e) => {
            setDatePreset(e.target.value);
            setPage(1);
          }}
          className="rounded-md border bg-background px-4 py-2 text-sm"
        >
          <option value="">All Dates</option>
          <option value="today">Today</option>
          <option value="last7">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Date Range</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setDirection("");
            setLoggedBy("");
            setDatePreset("");
            setStartDate("");
            setEndDate("");
            setOrdering("-call_timestamp");
            setPage(1);
          }}
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          Clear Filters
        </button>
      </div>

      {/* Custom date range */}
      {datePreset === "custom" && (
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-sm">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Calls table */}
      {loading ? (
        <p>Loading calls...</p>
      ) : loadError ? (
        <div className="rounded-lg border p-6 text-center">
          <p className="mb-3 text-sm text-destructive">
            Failed to load calls. Please try again.
          </p>

          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th
                className="cursor-pointer p-3 text-left"
                onClick={() =>
                    setOrdering((current) =>
                        current === "call_timestamp" ? "-call_timestamp" : "call_timestamp"
            )
            }
            >
                When
                </th>

                <th className="p-3 text-left">Direction</th>
                <th className="p-3 text-left">Lead</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Logged By</th>

                <th
                  className="cursor-pointer p-3 text-left"
                  onClick={() =>
                    setOrdering((current) =>
                      current === "duration_seconds"
                        ? "-duration_seconds"
                        : "duration_seconds"
                    )
                  }
                >
                  Duration {ordering === "duration_seconds" ? "↑" : "↓"}
                </th>

                <th className="p-3 text-left">Outcome</th>
                <th className="p-3 text-left">Recording</th>
              </tr>
            </thead>

            <tbody>
              {calls.map((call) => (
                <tr
                   key={call.id}
                   onClick={() => setSelectedCall(call)}
                   className="border-t cursor-pointer hover:bg-muted/50"
                   >
                  <td className="p-3">
                    {new Date(call.call_timestamp).toLocaleString("en-GB", {
                      timeZone: "Asia/Kathmandu",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </td>

                  <td className="p-3 capitalize">{call.direction}</td>

                  <td className="p-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/leads/${call.lead}`);
                        }}
                      className="text-left font-medium text-primary hover:underline"
                    >
                      {call.lead_name}
                    </button>

                    <div className="text-xs text-muted-foreground">
                      {call.lead_reference_number || "No reference"}
                    </div>
                  </td>

                  <td className="p-3">{call.phone_number || "—"}</td>

                  <td className="p-3">
                    {call.created_by_name || "—"}
                  </td>

                  <td className="p-3">
                    {(() => {
                      const seconds = call.duration_seconds ?? 0;
                      const minutes = Math.floor(seconds / 60);
                      const remainingSeconds = seconds % 60;

                      return `${String(minutes).padStart(2, "0")}:${String(
                        remainingSeconds
                      ).padStart(2, "0")}`;
                    })()}
                  </td>

                  <td className="p-3">{call.outcome || "—"}</td>

                  <td className="p-3">
                    {call.recording_url ? (
                      <a
                        href={call.recording_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        Listen
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}

              {calls.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No calls found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Call Details Side Panel */}
<Sheet
  open={!!selectedCall}
  onOpenChange={(open) => {
    if (!open) setSelectedCall(null);
  }}
>
  <SheetContent className="w-[90vw] max-w-lg overflow-y-auto">
    {selectedCall && (
      <>
        <SheetHeader>
          <SheetTitle>Call Details</SheetTitle>
          <SheetDescription>
            Complete information about this call.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          <div>
            <p className="text-muted-foreground">Lead</p>
            <p className="font-medium">{selectedCall.lead_name || "—"}</p>
            <p className="text-xs text-muted-foreground">
              {selectedCall.lead_reference_number || "—"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Phone Number</p>
            <p className="font-medium">
              {selectedCall.phone_number || "—"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Date & Time (Nepal)</p>
            <p className="font-medium">
              {new Date(selectedCall.call_timestamp).toLocaleString(
                "en-GB",
                { timeZone: "Asia/Kathmandu" }
              )}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Direction</p>
            <p className="font-medium capitalize">
              {selectedCall.direction || "—"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium">
              {selectedCall.duration_formatted ||
                `${Math.floor((selectedCall.duration_seconds ?? 0) / 60)
                  .toString()
                  .padStart(2, "0")}:${((selectedCall.duration_seconds ?? 0) % 60)
                  .toString()
                  .padStart(2, "0")}`}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Caller</p>
            <p className="font-medium">
              {selectedCall.caller ?? "—"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Outcome</p>
            <p className="font-medium capitalize">
              {selectedCall.outcome || "—"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Notes</p>
            <p className="whitespace-pre-wrap">
              {selectedCall.notes || "—"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Next Action</p>
            <p className="font-medium">
              {selectedCall.next_action || "—"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Follow-up Date</p>
            <p className="font-medium">
              {selectedCall.next_followup_at
                ? new Date(selectedCall.next_followup_at).toLocaleString(
                    "en-GB",
                    { timeZone: "Asia/Kathmandu" }
                  )
                : "—"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Logged By</p>
            <p className="font-medium">
              {selectedCall.created_by_name || "—"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Recording</p>
            {selectedCall.recording_url ? (
              <a
                href={selectedCall.recording_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Listen to Recording
              </a>
            ) : (
              <p>—</p>
            )}
          </div>
        </div>
      </>
    )}
  </SheetContent>
</Sheet>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Showing {startItem}–{endItem} of {totalCount} calls
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={page >= totalPages || totalPages === 0}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
