import {
  Activity,
  CalendarDays,
  Clock3,
  Download,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { useCallSummary, useCalls } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { callsService } from "@/services/calls.service";
import type { Call } from "@/types/calls";
import CallsTable from "./components/calls-table";

function formatDuration(seconds: number | null | undefined) {
   if (seconds == null || !Number.isFinite(seconds)) {
    return "00:00";
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function SummaryCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function getDateRange(preset: string, dateFrom: string, dateTo: string) {
  const now = new Date();

  // Get today's date in Nepal.
  const nepalDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const toNepalISO = (date: string, time: string) => `${date}T${time}+05:45`;

  if (preset === "today") {
    return {
      call_timestamp__gte: toNepalISO(nepalDate, "00:00:00"),
      call_timestamp__lte: toNepalISO(nepalDate, "23:59:59.999"),
    };
  }

  if (preset === "7days" || preset === "30days") {
    const days = preset === "7days" ? 6 : 29;

    const start = new Date(`${nepalDate}T00:00:00+05:45`);
    start.setUTCDate(start.getUTCDate() - days);

    const startDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(start);

    return {
      call_timestamp__gte: toNepalISO(startDate, "00:00:00"),
      call_timestamp__lte: now.toISOString(),
    };
  }

  if (preset === "custom") {
    return {
      ...(dateFrom && {
        call_timestamp__gte: toNepalISO(dateFrom, "00:00:00"),
      }),
      ...(dateTo && {
        call_timestamp__lte: toNepalISO(dateTo, "23:59:59.999"),
      }),
    };
  }

  return {};
}

export default function CallsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isStaff = Boolean(user?.is_staff || user?.is_superuser);
  const [userSearch, setUserSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const debouncedUserSearch = useDebouncedValue(userSearch, 300);
  const debouncedBranchSearch = useDebouncedValue(branchSearch, 300);
  const branchesQuery = useBranches(1, 100, debouncedBranchSearch, isStaff);
  const usersQuery = useUsers(1, 100, debouncedUserSearch);
  const ordering = searchParams.get("ordering") || "-call_timestamp";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const direction = searchParams.get("direction") || "all";
  const createdBy = searchParams.get("created_by") || "all";
  const branchId = searchParams.get("branch_id") || "all";
  const datePreset = searchParams.get("date") || "all";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const dateRange = useMemo(
    () => getDateRange(datePreset, dateFrom, dateTo),
    [datePreset, dateFrom, dateTo],
  );
  const filters = {
    search: searchParams.get("search") || undefined,
    direction:
      direction === "all" ? undefined : (direction as "inbound" | "outbound"),
    created_by: createdBy === "all" ? undefined : Number(createdBy),
    branch_id: isStaff && branchId !== "all" ? Number(branchId) : undefined,
    ...dateRange,
  };
  const { data, isLoading, isError, refetch } = useCallSummary(filters);
  const totals = data?.totals;
  const {
    data: callsData,
    isLoading: isCallsLoading,
    error: isCallsError,
    refetch: refetchCalls,
  } = useCalls({
    page,
    page_size: 20,
    ...filters,
    ordering,
  });
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const chartRows = data?.calls_per_day ?? [];
  const maxDailyCalls = Math.max(1, ...chartRows.map((row) => row.total_calls));

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  async function exportCalls() {
    setIsExporting(true);
    try {
      await callsService.exportCsv(filters);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not export calls"));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-brand">
          CRM Workspace
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor inbound and outbound calls across your CRM.
        </p>
      </div>

      {isError && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
            <p className="text-sm text-destructive">
              Could not load call summary. Check your connection and try again.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Call overview</h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="space-y-3 pt-6">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-36" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <SummaryCard
                title="Total calls"
                value={totals?.total_calls ?? 0}
                icon={<Phone className="size-4" />}
                description="All recorded calls"
              />

              <SummaryCard
                title="Inbound calls"
                value={totals?.inbound_calls ?? 0}
                icon={<PhoneIncoming className="size-4" />}
                description="Calls received"
              />

              <SummaryCard
                title="Outbound calls"
                value={totals?.outbound_calls ?? 0}
                icon={<PhoneOutgoing className="size-4" />}
                description="Calls made"
              />

              <SummaryCard
                title="Total talk time"
                value={formatDuration(totals?.total_talk_time_seconds)}
                icon={<Clock3 className="size-4" />}
                description="Combined call duration"
              />

              <SummaryCard
                title="Average duration"
                value={formatDuration(totals?.average_duration_seconds)}
                icon={<Activity className="size-4" />}
                description="Average duration per call"
              />

              <SummaryCard
                title="Connect rate"
                value={`${totals?.connect_rate ?? 0}%`}
                icon={<Users className="size-4" />}
                description={`${totals?.connected_calls ?? 0} connected calls`}
              />
            </>
          )}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Calls per day</CardTitle>
            <p className="text-sm text-muted-foreground">
              Call dates use the Asia/Kathmandu calendar and active filters.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : chartRows.length ? (
              <div className="flex min-h-40 items-end gap-2 overflow-x-auto pb-2">
                {chartRows.map((row) => (
                  <div
                    key={row.day}
                    className="flex min-w-12 flex-1 flex-col items-center gap-2"
                    title={`${row.day}: ${row.total_calls} calls`}
                  >
                    <span className="text-xs font-medium">{row.total_calls}</span>
                    <div className="flex h-28 w-full items-end rounded bg-muted">
                      <div
                        className="w-full rounded bg-primary"
                        style={{
                          height: `${Math.max(4, (row.total_calls / maxDailyCalls) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {row.day.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No call activity for the selected filters.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Top callers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Callers ranked by number of recorded calls.
            </p>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-full" />
                ))}
              </div>
            ) : data?.top_callers?.length ? (
              <div className="space-y-4">
                {data.top_callers.map((caller, index) => (
                  <div
                    key={`${caller.caller_display}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">
                        {caller.caller_display || "Unknown"}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {caller.total_calls} calls
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(caller.total_talk_time_seconds)} talk
                        time
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No caller data available yet.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Call history</h2>
            <p className="text-sm text-muted-foreground">
              Recent inbound and outbound calls.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void exportCalls()}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 size-4" />
            {isExporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>

            <Input
              placeholder="Search lead, phone, caller, notes..."
              value={search}
              onChange={(event) => {
                const value = event.target.value;
                setSearch(value);

                const next = new URLSearchParams(searchParams);

                if (value.trim()) {
                  next.set("search", value);
                } else {
                  next.delete("search");
                }

                next.delete("page");
                setSearchParams(next);
              }}
              className="h-12 pl-10 pr-9"
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  const next = new URLSearchParams(searchParams);
                  next.delete("search");
                  next.delete("page");
                  setSearchParams(next);
                }}
                className="absolute right-3 top-0 h-12 flex items-center text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Direction filter */}
          <Select
            value={direction}
            onValueChange={(value) => {
              const next = new URLSearchParams(searchParams);

              if (value === "all") {
                next.delete("direction");
              } else {
                next.set("direction", value);
              }

              next.delete("page");
              setSearchParams(next);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All directions</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>

          {isStaff && (
            <Input
              aria-label="Find a staff user"
              placeholder="Find a user..."
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              className="w-full sm:w-48"
            />
          )}

          <Select
            value={createdBy}
            onValueChange={(value) => {
              const next = new URLSearchParams(searchParams);
              if (value === "all") next.delete("created_by");
              else next.set("created_by", value);
              next.delete("page");
              setSearchParams(next);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Logged by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {(usersQuery.data?.results ?? []).map((userOption) => (
                <SelectItem key={userOption.id} value={String(userOption.id)}>
                  {userOption.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isStaff && (
            <Input
              aria-label="Find a branch"
              placeholder="Find a branch..."
              value={branchSearch}
              onChange={(event) => setBranchSearch(event.target.value)}
              className="w-full sm:w-48"
            />
          )}

          {isStaff && (
            <Select
              value={branchId}
              onValueChange={(value) => {
                const next = new URLSearchParams(searchParams);
                if (value === "all") next.delete("branch_id");
                else next.set("branch_id", value);
                next.delete("page");
                setSearchParams(next);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {(branchesQuery.data?.results ?? []).map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={ordering}
            onValueChange={(value) => {
              const next = new URLSearchParams(searchParams);
              next.set("ordering", value);
              next.delete("page");
              setSearchParams(next);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="-call_timestamp">Newest first</SelectItem>
              <SelectItem value="call_timestamp">Oldest first</SelectItem>
              <SelectItem value="-duration_seconds">
                Longest duration
              </SelectItem>
              <SelectItem value="duration_seconds">
                Shortest duration
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Date filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Select
              value={datePreset}
              onValueChange={(value) => {
                const next = new URLSearchParams(searchParams);

                next.delete("date_from");
                next.delete("date_to");

                if (value === "all") {
                  next.delete("date");
                } else {
                  next.set("date", value);
                }

                next.delete("page");
                setSearchParams(next);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <CalendarDays className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            {datePreset === "custom" && (
              <>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    if (event.target.value) {
                      next.set("date_from", event.target.value);
                    } else {
                      next.delete("date_from");
                    }
                    next.delete("page");
                    setSearchParams(next);
                  }}
                  className="w-full sm:w-auto"
                />

                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    const next = new URLSearchParams(searchParams);
                    if (event.target.value) {
                      next.set("date_to", event.target.value);
                    } else {
                      next.delete("date_to");
                    }
                    next.delete("page");
                    setSearchParams(next);
                  }}
                  className="w-full sm:w-auto"
                />
              </>
            )}
          </div>
        </div>

        {isCallsError ? (
          <Card>
            <CardContent className="flex items-center justify-between gap-3 py-5">
              <p className="text-sm text-destructive">Could not load calls.</p>
              <Button variant="outline" onClick={() => refetchCalls()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CallsTable
            calls={callsData?.results ?? []}
            isLoading={isCallsLoading}
            onSelect={setSelectedCall}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {callsData?.count ? (page - 1) * 20 + 1 : 0}
            {"–"}
            {Math.min(page * 20, callsData?.count ?? 0)}
            {" of "}
            {callsData?.count ?? 0} calls
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!callsData?.previous || isCallsLoading}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (page <= 2) {
                  next.delete("page");
                } else {
                  next.set("page", String(page - 1));
                }
                setSearchParams(next);
              }}
            >
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!callsData?.next || isCallsLoading}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(page + 1));
                setSearchParams(next);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      <Sheet
        open={selectedCall != null}
        onOpenChange={(open) => {
          if (!open) setSelectedCall(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Call details</SheetTitle>
            <SheetDescription>
              {selectedCall?.lead_name || "Call record"}
            </SheetDescription>
          </SheetHeader>
          {selectedCall && (
            <SheetBody className="space-y-5">
              <Detail label="Date and time">
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Kathmandu",
                }).format(new Date(selectedCall.call_timestamp))}
              </Detail>
              <Detail label="Direction">{selectedCall.direction || "—"}</Detail>
              <Detail label="Lead">{selectedCall.lead_name || "—"}</Detail>
              <Detail label="Lead reference">
                {selectedCall.lead_reference_number || "—"}
              </Detail>
              <Detail label="Phone">{selectedCall.phone_number || "—"}</Detail>
              <Detail label="Caller">{selectedCall.caller || "—"}</Detail>
              <Detail label="Logged by">{selectedCall.created_by_name || "—"}</Detail>
              <Detail label="Duration">
                {selectedCall.duration_formatted || "—"}
              </Detail>
              <Detail label="Outcome">{selectedCall.outcome || "—"}</Detail>
              <Detail label="Notes">{selectedCall.notes || "—"}</Detail>
              <Detail label="Next follow-up">
                {selectedCall.next_followup_at
                  ? new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Kathmandu",
                    }).format(new Date(selectedCall.next_followup_at))
                  : "—"}
              </Detail>
              <Detail label="Next action">{selectedCall.next_action || "—"}</Detail>
              <Detail label="Branch">{selectedCall.branch ?? "—"}</Detail>
              <Detail label="Recording">
                {selectedCall.recording_url ? (
                  <a
                    href={selectedCall.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Listen
                  </a>
                ) : (
                  "—"
                )}
              </Detail>
            </SheetBody>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm">{children}</div>
    </div>
  );
}
