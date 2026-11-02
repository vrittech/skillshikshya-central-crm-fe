import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  RotateCcw,
  Search,
  Timer,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/auth";
import { CALL_OUTCOMES, COUNSELORS } from "@/data/lead-lookups";
import { useBranches } from "@/hooks/use-branches";
import { useCalls } from "@/hooks/use-calls";
import { useCounselors } from "@/hooks/use-users";
import { formatDateTime, formatPhone, initialsOf } from "@/lib/leads-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import type { ApiCallsPerDay, ApiTopCaller, CallRow, DatePreset } from "@/types/calls";

const CALL_OUTCOME_TONE: Record<string, string> = {
  interested: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  enrolled: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  follow_up_required: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  follow_up_needed: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  callback_requested: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  call_back_later: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  requested_details: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  requested_counseling: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  no_answer: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  busy: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  switched_off: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  wrong_number: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  not_interested: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  enrolled_elsewhere: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  do_not_contact: "bg-destructive/15 text-destructive",
};

/** Formats duration into human-readable e.g. "2h 45m" or "4m 19s" */
function formatHumanDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0s";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

/** Format YYYY-MM-DD into "2 Nov" */
function formatShortDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/** Small chart showing calls per day */
function CallsPerDayChart({ data }: { data: ApiCallsPerDay[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="text-muted-foreground size-8 opacity-40" />
        <p className="mt-2 text-sm font-medium">No calls recorded</p>
        <p className="text-muted-foreground text-xs">No daily call activity for the selected filters.</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      <div className="flex h-36 items-end gap-2 overflow-x-auto pt-6 pb-2">
        {data.map((d) => {
          const heightPct = Math.max(10, Math.round((d.count / maxCount) * 100));
          return (
            <div
              key={d.date}
              className="group relative flex flex-1 min-w-[2.25rem] flex-col items-center justify-end h-full"
            >
              <span className="text-muted-foreground mb-1 text-[11px] font-semibold opacity-80 group-hover:opacity-100 group-hover:text-brand transition-colors">
                {d.count}
              </span>
              <div
                className="bg-brand/85 hover:bg-brand w-full rounded-t transition-all"
                style={{ height: `${heightPct}%` }}
                title={`${formatShortDate(d.date)}: ${d.count} call${d.count === 1 ? "" : "s"}`}
              />
              <span className="text-muted-foreground mt-1.5 truncate text-[10px] whitespace-nowrap">
                {formatShortDate(d.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Top 10 Callers list component */
function TopCallersList({ callers }: { callers: ApiTopCaller[] }) {
  if (callers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="text-muted-foreground size-8 opacity-40" />
        <p className="mt-2 text-sm font-medium">No callers found</p>
        <p className="text-muted-foreground text-xs">No caller activity recorded for the selected filters.</p>
      </div>
    );
  }

  const maxCalls = Math.max(...callers.map((c) => c.calls), 1);

  return (
    <div className="space-y-2.5">
      {callers.map((c, index) => {
        const pct = Math.round((c.calls / maxCalls) * 100);
        return (
          <div key={c.caller} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground font-mono text-[11px] w-4 text-center font-bold">
                  {index + 1}
                </span>
                <span className="bg-brand-fixed-dim/30 text-brand-container flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  {initialsOf(c.caller)}
                </span>
                <span className="font-semibold truncate max-w-[10rem] sm:max-w-[12rem]">
                  {c.caller}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground text-[11px]">
                  {formatHumanDuration(c.seconds)}
                </span>
                <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0">
                  {c.calls} {c.calls === 1 ? "call" : "calls"}
                </Badge>
              </div>
            </div>
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full ml-6 max-w-[calc(100%-1.5rem)]">
              <div
                className="bg-brand h-full rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Detail row for the call detail side panel */
function DetailRow({ label, value, isLink }: { label: string; value?: string | null; isLink?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b text-sm last:border-b-0">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="col-span-2 font-medium break-words text-xs sm:text-sm">
        {value ? (
          isLink ? (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline inline-flex items-center gap-1"
            >
              Open link <ExternalLink className="size-3" />
            </a>
          ) : (
            value
          )
        ) : (
          "—"
        )}
      </span>
    </div>
  );
}

export default function CallsPage() {
  const { user } = useAuth();
  const isStaff = Boolean(user?.is_staff || user?.is_superuser);
  const branchesQuery = useBranches(1, 100, '', isStaff);

  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL search params
  const searchParam = searchParams.get("search") || "";
  const directionParam = searchParams.get("direction") || "all";
  const outcomeParam = searchParams.get("outcome") || "all";
  const createdByParam = searchParams.get("logged_by") || "all";
  const datePresetParam = (searchParams.get("date_preset") as DatePreset) || "all";
  const startDateParam = searchParams.get("start_date") || "";
  const endDateParam = searchParams.get("end_date") || "";
  const branchIdParam = searchParams.get("branch_id") || "all";
  const orderingParam = searchParams.get("ordering") || "-call_timestamp";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  // Local search text for debouncing
  const [searchInput, setSearchInput] = useState(searchParam);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Synchronize debounced search to URL search param
  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch.trim()) next.set("search", debouncedSearch.trim());
        else next.delete("search");
        next.set("page", "1");
        return next;
      });
    }
  }, [debouncedSearch, searchParam, setSearchParams]);

  // Selected call for US-3 side panel
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);

  // Compute ISO date range with local Nepal offset (+05:45) based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    // Nepal offset (+5:45)
    const npt = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
    const y = npt.getUTCFullYear();
    const m = String(npt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(npt.getUTCDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    if (datePresetParam === "today") {
      return {
        gte: `${todayStr}T00:00:00+05:45`,
        lte: `${todayStr}T23:59:59+05:45`,
      };
    }
    if (datePresetParam === "last_7_days") {
      const past = new Date(npt.getTime() - 6 * 24 * 60 * 60 * 1000);
      const pastY = past.getUTCFullYear();
      const pastM = String(past.getUTCMonth() + 1).padStart(2, "0");
      const pastD = String(past.getUTCDate()).padStart(2, "0");
      return {
        gte: `${pastY}-${pastM}-${pastD}T00:00:00+05:45`,
        lte: `${todayStr}T23:59:59+05:45`,
      };
    }
    if (datePresetParam === "this_month") {
      return {
        gte: `${y}-${m}-01T00:00:00+05:45`,
        lte: `${todayStr}T23:59:59+05:45`,
      };
    }
    if (datePresetParam === "custom") {
      return {
        gte: startDateParam ? `${startDateParam}T00:00:00+05:45` : undefined,
        lte: endDateParam ? `${endDateParam}T23:59:59+05:45` : undefined,
      };
    }
    return { gte: undefined, lte: undefined };
  }, [datePresetParam, startDateParam, endDateParam]);

  // Query parameters for useCalls
  const queryParams = useMemo(
    () => ({
      search: searchParam || undefined,
      direction: directionParam !== "all" ? directionParam : undefined,
      outcome: outcomeParam !== "all" ? outcomeParam : undefined,
      created_by: createdByParam !== "all" ? createdByParam : undefined,
      branch_id: branchIdParam !== "all" ? branchIdParam : undefined,
      call_timestamp__gte: dateRange.gte,
      call_timestamp__lte: dateRange.lte,
      ordering: orderingParam,
      page: pageParam,
      page_size: 20,
    }),
    [
      searchParam,
      directionParam,
      outcomeParam,
      createdByParam,
      branchIdParam,
      dateRange,
      orderingParam,
      pageParam,
    ],
  );

  const {
    rows,
    totalCount,
    stats,
    isLoading,
    isError,
    error,
    isExporting,
    exportCsv,
    refetch,
    isMock,
  } = useCalls(queryParams);

  const counselorsQuery = useCounselors("", undefined, !isMock);

  // Counselor options
  const counselorOptions = useMemo(() => {
    if (!isMock && counselorsQuery.data?.results) {
      return counselorsQuery.data.results.map((u) => ({
        id: String(u.id),
        name: u.name,
      }));
    }
    return COUNSELORS.map((c) => ({
      id: c.name,
      name: c.name,
    }));
  }, [isMock, counselorsQuery.data]);

  // Helper to update URL search params
  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      next.set("page", "1"); // changing filter goes back to page 1
      return next;
    });
  };

  const handleSort = (column: "call_timestamp" | "duration_seconds") => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const current = prev.get("ordering") || "-call_timestamp";
      if (current === column) {
        next.set("ordering", `-${column}`);
      } else {
        next.set("ordering", column);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    searchParam ||
      directionParam !== "all" ||
      outcomeParam !== "all" ||
      createdByParam !== "all" ||
      datePresetParam !== "all" ||
      branchIdParam !== "all",
  );

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));
  const pageStart = totalCount === 0 ? 0 : (pageParam - 1) * 20 + 1;
  const pageEnd = Math.min(pageParam * 20, totalCount);

  return (
    <div className="space-y-6">
      {/* Copied header layout from src/pages/payments/index.tsx */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Call log across all leads.{isMock && " Previewing mock data."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={isExporting || totalCount === 0}
            className="shrink-0"
          >
            {isExporting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            {isExporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Acceptance Criteria: Four cards show Total calls (with inbound/outbound split), Talk time, Average duration and Connect rate */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Calls */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Total Calls</span>
              <PhoneCall className="text-brand size-4" />
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.totalCalls}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.outboundCalls} outbound · {stats.inboundCalls} inbound
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Talk Time */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Talk Time</span>
              <Clock className="text-brand size-4" />
            </div>
            <div className="mt-2 text-2xl font-bold">{formatHumanDuration(stats.totalSeconds)}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.totalSeconds > 0 ? stats.talkTimeFormatted : "0s"} total duration
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Average Duration */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Average Duration</span>
              <Timer className="text-brand size-4" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {formatHumanDuration(stats.avgDurationSeconds)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.avgDurationSeconds > 0 ? stats.avgDurationFormatted : "0s"} per completed call
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Connect Rate (lasted > 0 seconds) */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Connect Rate</span>
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.connectRate}%
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.connectedCalls} connected (&gt;0s) of {stats.totalCalls} calls
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acceptance Criteria: Small chart of calls per day & Top 10 callers */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="border shadow-xs lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Calls per Day</CardTitle>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Counted in Nepal Time (NPT)
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {stats.callsPerDay.length} {stats.callsPerDay.length === 1 ? "day" : "days"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-36 items-end gap-2 pt-6">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-full flex-1 rounded" />
                ))}
              </div>
            ) : (
              <CallsPerDayChart data={stats.callsPerDay} />
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-xs lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Top 10 Callers</CardTitle>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Ranked by number of completed calls
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {stats.topCallers.length} {stats.topCallers.length === 1 ? "caller" : "callers"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded" />
                ))}
              </div>
            ) : (
              <TopCallersList callers={stats.topCallers} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative min-w-[13rem] max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search by lead, phone, caller, or notes…"
            className="rounded-full pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Direction Filter */}
        <Select value={directionParam} onValueChange={(v) => updateParam("direction", v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
          </SelectContent>
        </Select>

        {/* Logged by Filter (user picker) */}
        <Select value={createdByParam} onValueChange={(v) => updateParam("logged_by", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All callers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All callers</SelectItem>
            {counselorOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Outcome Filter */}
        <Select value={outcomeParam} onValueChange={(v) => updateParam("outcome", v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All outcomes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            {CALL_OUTCOMES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Presets */}
        <Select value={datePresetParam} onValueChange={(v) => updateParam("date_preset", v)}>
          <SelectTrigger className="w-40">
            <Calendar className="mr-2 size-3.5 opacity-60" />
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="last_7_days">Last 7 days</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Inputs */}
        {datePresetParam === "custom" && (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              className="w-36 text-xs"
              value={startDateParam}
              onChange={(e) => updateParam("start_date", e.target.value)}
              title="Start date"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              className="w-36 text-xs"
              value={endDateParam}
              onChange={(e) => updateParam("end_date", e.target.value)}
              title="End date"
            />
          </div>
        )}

        {/* Branch Filter (staff only) */}
        {isStaff && (
          <Select value={branchIdParam} onValueChange={(v) => updateParam("branch_id", v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branchesQuery.data?.results?.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
            <RotateCcw className="mr-1 size-3.5" /> Reset
          </Button>
        )}
      </div>

      {/* Error State with Retry Button */}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto size-8 text-destructive" />
          <h3 className="mt-2 text-sm font-semibold text-destructive">Failed to load calls</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {error instanceof Error ? error.message : "An unexpected network error occurred."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            <RotateCcw className="mr-1.5 size-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Calls Table (Responsive table: scrolls in its own box at 390px) */}
      {!isError && (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {/* When header (sortable) */}
                  <TableHead
                    className="w-44 cursor-pointer select-none"
                    onClick={() => handleSort("call_timestamp")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>When</span>
                      {orderingParam === "call_timestamp" ? (
                        <ArrowUp className="size-3.5 text-brand" />
                      ) : orderingParam === "-call_timestamp" ? (
                        <ArrowDown className="size-3.5 text-brand" />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead className="w-28">Direction</TableHead>
                  <TableHead className="w-48">Lead</TableHead>
                  <TableHead className="w-36">Phone</TableHead>
                  <TableHead className="w-36">Logged by</TableHead>

                  {/* Duration header (sortable) */}
                  <TableHead
                    className="w-32 cursor-pointer select-none"
                    onClick={() => handleSort("duration_seconds")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Duration</span>
                      {orderingParam === "duration_seconds" ? (
                        <ArrowUp className="size-3.5 text-brand" />
                      ) : orderingParam === "-duration_seconds" ? (
                        <ArrowDown className="size-3.5 text-brand" />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead className="w-36">Outcome</TableHead>
                  <TableHead className="w-24 text-center">Recording</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}

                {/* Empty State: Different message for 'no calls yet' vs 'no calls match filters' */}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <PhoneCall className="text-muted-foreground mx-auto size-9 opacity-40" />
                      <p className="font-headline mt-3 text-base font-semibold">
                        {hasActiveFilters ? "No calls match these filters" : "No calls yet"}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {hasActiveFilters
                          ? "Try clearing some filters to see more results."
                          : "Calls logged by counselors in your branch will appear here."}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((call) => (
                  <TableRow
                    key={call.id}
                    className="hover:bg-accent/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedCall(call)}
                  >
                    {/* When */}
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(call.callTimestamp)}
                    </TableCell>

                    {/* Direction */}
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          call.direction === "inbound"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            : "bg-purple-500/10 text-purple-700 dark:text-purple-300",
                        )}
                      >
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="size-3" />
                        ) : (
                          <PhoneOutgoing className="size-3" />
                        )}
                        {call.direction}
                      </span>
                    </TableCell>

                    {/* Lead (name + reference) - clicking lead opens detail without opening side panel */}
                    <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                      {call.leadId ? (
                        <Link
                          to={`/leads/${call.leadId}`}
                          className="text-brand hover:underline font-semibold"
                        >
                          {call.leadName}
                        </Link>
                      ) : (
                        <span className="font-semibold">{call.leadName}</span>
                      )}
                      {call.leadReference && (
                        <div className="text-muted-foreground font-mono text-[11px]">
                          {call.leadReference}
                        </div>
                      )}
                    </TableCell>

                    {/* Phone */}
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {formatPhone(call.phoneNumber)}
                    </TableCell>

                    {/* Logged by */}
                    <TableCell className="whitespace-nowrap text-xs font-medium">
                      {call.loggedBy}
                    </TableCell>

                    {/* Duration (MM:SS) */}
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold tabular-nums">
                      {call.durationFormatted}
                    </TableCell>

                    {/* Outcome */}
                    <TableCell>
                      {call.outcome ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "capitalize text-[11px] font-medium border-0",
                            CALL_OUTCOME_TONE[call.outcome] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {call.outcome.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Recording link only when call has a recording */}
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      {call.recordingUrl ? (
                        <a
                          href={call.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand hover:text-brand/80 inline-flex items-center justify-center p-1 rounded-md transition-colors"
                          title="Listen to recording"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination: 20 rows per page, says "Showing X–Y of Z" */}
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <div>
              {totalCount > 0 ? (
                <span>
                  Showing {pageStart}–{pageEnd} of {totalCount}
                </span>
              ) : (
                <span>0 calls</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                disabled={pageParam <= 1 || isLoading}
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("page", String(pageParam - 1));
                    return next;
                  });
                }}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 font-medium">
                Page {pageParam} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                disabled={pageParam >= totalPages || isLoading}
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("page", String(pageParam + 1));
                    return next;
                  });
                }}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* US-3: Read the full details of one call (Side Panel / Sheet) */}
      <Sheet open={selectedCall != null} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Call Details</SheetTitle>
            <SheetDescription>
              Logged call record and scheduled next touchpoints.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {selectedCall && (
              <div className="space-y-2">
                <DetailRow
                  label="Date & Time"
                  value={formatDateTime(selectedCall.callTimestamp)}
                />
                <DetailRow label="Direction" value={selectedCall.direction} />
                <DetailRow
                  label="Lead"
                  value={
                    selectedCall.leadReference
                      ? `${selectedCall.leadName} (${selectedCall.leadReference})`
                      : selectedCall.leadName
                  }
                />
                <DetailRow
                  label="Phone"
                  value={selectedCall.phoneNumber ? formatPhone(selectedCall.phoneNumber) : null}
                />
                <DetailRow label="Caller" value={selectedCall.caller} />
                <DetailRow label="Logged by" value={selectedCall.loggedBy} />
                <DetailRow
                  label="Duration"
                  value={
                    selectedCall.durationFormatted
                      ? `${selectedCall.durationFormatted} (${selectedCall.durationSeconds}s)`
                      : null
                  }
                />
                <DetailRow
                  label="Outcome"
                  value={selectedCall.outcome ? selectedCall.outcome.replace(/_/g, " ") : null}
                />
                <DetailRow label="Notes" value={selectedCall.notes} />
                <DetailRow label="Next action" value={selectedCall.nextAction} />
                <DetailRow
                  label="Next follow-up"
                  value={
                    selectedCall.nextFollowupAt ? formatDateTime(selectedCall.nextFollowupAt) : null
                  }
                />
                <DetailRow
                  label="Recording"
                  value={selectedCall.recordingUrl}
                  isLink
                />
                {selectedCall.branchName && (
                  <DetailRow label="Branch" value={selectedCall.branchName} />
                )}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
