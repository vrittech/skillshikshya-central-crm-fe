import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  Download,
  ExternalLink,
  FilterX,
  Loader2,
  Phone,
  PhoneCall,
  PhoneForwarded,
  RotateCcw,
  Search,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { HBarList, MiniBars } from "@/components/charts";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { downloadCallsCsv, useCalls, useCallSummary } from "@/hooks/use-calls";
import { useCounselors } from "@/hooks/use-users";
import { formatDateTime } from "@/lib/leads-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import type { Call, CallListParams, CallSummaryParams } from "@/types/calls";

// ---------------------------------------------------------------------------
// Constants & Timezone Helpers (Asia/Kathmandu)
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

function getTodayInNepal(): { year: number; month: number; day: number } {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + (5 * 60 + 45) * 60000;
  const nd = new Date(nepalMs);
  return {
    year: nd.getFullYear(),
    month: nd.getMonth() + 1,
    day: nd.getDate(),
  };
}

function toNepalIsoString(
  year: number,
  month: number,
  day: number,
  time = "00:00:00",
): string {
  const y = year.toString();
  const m = month.toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  return `${y}-${m}-${d}T${time}+05:45`;
}

// ---------------------------------------------------------------------------
// Subcomponents (KPI Cards & Field Display)
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number | undefined;
  subtext?: string;
  loading: boolean;
  isUpdating?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}

function StatCard({
  label,
  value,
  subtext,
  loading,
  isUpdating,
  icon: Icon,
  tone,
}: StatCardProps) {
  return (
    <Card className="gap-1 py-3.5 sm:gap-2 sm:py-5">
      <CardHeader className="flex-row items-center justify-between px-3.5 pb-0.5 sm:px-6 sm:pb-1">
        <div className="flex items-center gap-1 min-w-0">
          <CardDescription className="font-mono text-[10px] sm:text-[11px] font-medium tracking-wider uppercase truncate">
            {label}
          </CardDescription>
          {isUpdating && <Loader2 className="size-2.5 sm:size-3 animate-spin text-muted-foreground shrink-0" />}
        </div>
        <Icon className={cn("size-3.5 sm:size-4 shrink-0", tone)} />
      </CardHeader>
      <CardContent className="space-y-0.5 px-3.5 sm:space-y-1 sm:px-6">
        {loading ? (
          <Skeleton className="h-7 w-20 sm:h-8 sm:w-24" />
        ) : (
          <div className={cn("space-y-0.5 sm:space-y-1 transition-opacity", isUpdating && "opacity-60")}>
            <p className="font-headline text-lg sm:text-2xl font-semibold tabular-nums leading-tight">
              {value ?? 0}
            </p>
            {subtext && (
              <p className="text-muted-foreground text-[10px] leading-tight sm:text-xs truncate sm:whitespace-normal">
                {subtext}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground font-mono text-[11px] font-medium tracking-wider uppercase">
        {label}
      </p>
      {children || <p className="text-sm font-medium">{value || "—"}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Calls Dashboard Page Component (US-1, US-2, US-3, US-4, US-6)
// ---------------------------------------------------------------------------

export default function CallsPage() {
  const { user } = useAuth();
  const isStaff = !!(user?.is_staff || user?.is_superuser);

  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const rawSearch = searchParams.get("search") || "";
  const directionParam = (searchParams.get("direction") as "inbound" | "outbound" | "all") || "all";
  const createdByParam = searchParams.get("created_by") || "all";
  const branchParam = searchParams.get("branch_id") || "all";
  const datePresetParam = searchParams.get("date_preset") || "all";
  const dateFromParam = searchParams.get("date_from") || "";
  const dateToParam = searchParams.get("date_to") || "";
  const orderingParam = searchParams.get("ordering") || "-call_timestamp";
  const pageParam = parseInt(searchParams.get("page") || "1", 10) || 1;

  // Local search text for smooth typing
  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Sync debounced search back to URL query parameters
  useEffect(() => {
    if (debouncedSearch !== rawSearch) {
      const next = new URLSearchParams(searchParams);
      if (debouncedSearch) {
        next.set("search", debouncedSearch);
      } else {
        next.delete("search");
      }
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, rawSearch, searchParams, setSearchParams]);

  // Selected call for side panel
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Counselors and Branches
  const counselorsQ = useCounselors("", undefined, true);
  const branchesQ = useBranches(1, 100, "", isStaff);

  // Compute date range based on preset or custom
  const dateRange = useMemo<{ gte?: string; lte?: string }>(() => {
    const today = getTodayInNepal();
    if (datePresetParam === "today") {
      return {
        gte: toNepalIsoString(today.year, today.month, today.day, "00:00:00"),
        lte: toNepalIsoString(today.year, today.month, today.day, "23:59:59"),
      };
    }
    if (datePresetParam === "7d") {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      const pastUtcMs = past.getTime() + past.getTimezoneOffset() * 60000;
      const pastNepalMs = pastUtcMs + (5 * 60 + 45) * 60000;
      const pd = new Date(pastNepalMs);
      return {
        gte: toNepalIsoString(pd.getFullYear(), pd.getMonth() + 1, pd.getDate(), "00:00:00"),
        lte: toNepalIsoString(today.year, today.month, today.day, "23:59:59"),
      };
    }
    if (datePresetParam === "month") {
      return {
        gte: toNepalIsoString(today.year, today.month, 1, "00:00:00"),
        lte: toNepalIsoString(today.year, today.month, today.day, "23:59:59"),
      };
    }
    if (datePresetParam === "custom") {
      const range: { gte?: string; lte?: string } = {};
      if (dateFromParam) {
        range.gte = `${dateFromParam}T00:00:00+05:45`;
      }
      if (dateToParam) {
        range.lte = `${dateToParam}T23:59:59+05:45`;
      }
      return range;
    }
    return {};
  }, [datePresetParam, dateFromParam, dateToParam]);

  // Build query filters
  const filterParams: CallSummaryParams = useMemo(() => {
    const p: CallSummaryParams = {};
    if (debouncedSearch) p.search = debouncedSearch;
    if (directionParam !== "all") p.direction = directionParam;
    if (createdByParam !== "all") p.created_by = createdByParam;
    if (isStaff && branchParam !== "all") p.branch_id = branchParam;
    if (dateRange.gte) p.call_timestamp__gte = dateRange.gte;
    if (dateRange.lte) p.call_timestamp__lte = dateRange.lte;
    return p;
  }, [debouncedSearch, directionParam, createdByParam, isStaff, branchParam, dateRange]);

  const listParams: CallListParams = useMemo(() => {
    return {
      ...filterParams,
      ordering: orderingParam,
      page: pageParam,
      page_size: PAGE_SIZE,
    };
  }, [filterParams, orderingParam, pageParam]);

  // Queries
  const callsQ = useCalls(listParams);
  const summaryQ = useCallSummary(filterParams);

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    directionParam !== "all" ||
    createdByParam !== "all" ||
    (isStaff && branchParam !== "all") ||
    datePresetParam !== "all" ||
    Boolean(dateFromParam) ||
    Boolean(dateToParam);

  function updateParams(updates: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === undefined || val === "" || val === "all") {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    setSearchParams(next, { replace: true });
  }

  function handleFilterChange(key: string, value: string) {
    updateParams({ [key]: value, page: "1" });
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearchParams(new URLSearchParams({ page: "1", ordering: "-call_timestamp" }), {
      replace: true,
    });
  }

  function handleSort(field: "call_timestamp" | "duration_seconds") {
    let nextOrdering = `-${field}`;
    if (orderingParam === `-${field}`) {
      nextOrdering = field;
    } else if (orderingParam === field) {
      nextOrdering = `-${field}`;
    }
    updateParams({ ordering: nextOrdering, page: "1" });
  }

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadCallsCsv(filterParams);
      toast.success("CSV export downloaded");
    } catch {
      toast.error("Failed to export calls to CSV");
    } finally {
      setIsExporting(false);
    }
  }

  const callsData = callsQ.data?.results ?? [];
  const totalCount = callsQ.data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const summary = summaryQ.data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Calls
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Call history, team talk-time metrics, and counselor activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || callsQ.isLoading}
            className="rounded-lg font-medium"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Exporting…
              </>
            ) : (
              <>
                <Download className="mr-2 size-4" /> Export CSV
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Section / KPI Cards & Charts */}
      {summaryQ.isError ? (
        <Card className="border-destructive/30 bg-destructive/5 py-4">
          <CardContent className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <div className="flex items-center gap-2.5 text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Failed to load calls summary</p>
                <p className="text-muted-foreground text-xs">
                  An error occurred while fetching summary metrics. The calls table below is still available.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => summaryQ.refetch()}
              disabled={summaryQ.isFetching}
              className="h-8 shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className={cn("size-3.5", summaryQ.isFetching && "animate-spin")} />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Calls"
              value={summary?.total_calls}
              subtext={
                summary
                  ? `${summary.inbound} inbound · ${summary.outbound} outbound`
                  : undefined
              }
              loading={summaryQ.isLoading}
              isUpdating={summaryQ.isFetching && !summaryQ.isLoading}
              icon={PhoneCall}
              tone="text-brand"
            />
            <StatCard
              label="Talk Time"
              value={summary?.total_formatted}
              subtext={
                summary
                  ? `${Math.round(summary.total_seconds / 60)} min total talk time`
                  : undefined
              }
              loading={summaryQ.isLoading}
              isUpdating={summaryQ.isFetching && !summaryQ.isLoading}
              icon={Clock}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Average Duration"
              value={
                summary
                  ? `${Math.floor(summary.avg_seconds / 60)}m ${summary.avg_seconds % 60}s`
                  : undefined
              }
              subtext={summary ? `${summary.avg_seconds}s avg per call` : undefined}
              loading={summaryQ.isLoading}
              isUpdating={summaryQ.isFetching && !summaryQ.isLoading}
              icon={Timer}
              tone="text-sky-600 dark:text-sky-400"
            />
            <StatCard
              label="Connect Rate"
              value={
                summary ? `${(summary.connect_rate * 100).toFixed(1)}%` : undefined
              }
              subtext={
                summary
                  ? `${summary.connected_calls} of ${summary.total_calls} connected (>0s)`
                  : undefined
              }
              loading={summaryQ.isLoading}
              isUpdating={summaryQ.isFetching && !summaryQ.isLoading}
              icon={PhoneForwarded}
              tone="text-violet-600 dark:text-violet-400"
            />
          </div>

          {/* Charts */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm sm:text-base">Calls per day</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Daily call activity in Nepal time</CardDescription>
                  </div>
                  {summaryQ.isFetching && !summaryQ.isLoading && (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                {summaryQ.isLoading ? (
                  <Skeleton className="h-28 w-full" />
                ) : summary?.by_day && summary.by_day.length > 0 ? (
                  <div className={cn("transition-opacity", summaryQ.isFetching && !summaryQ.isLoading && "opacity-60")}>
                    <MiniBars
                      values={summary.by_day.map((d) => d.calls)}
                      labels={summary.by_day.map((d) => d.date)}
                    />
                    {summary.by_day.length > 1 &&
                    summary.by_day[0]?.date !== summary.by_day[summary.by_day.length - 1]?.date ? (
                      <div className="text-muted-foreground mt-3 flex justify-between text-xs tabular-nums">
                        <span>{summary.by_day[0]?.date}</span>
                        <span>{summary.by_day[summary.by_day.length - 1]?.date}</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground mt-3 hidden lg:flex justify-center text-xs tabular-nums">
                        <span>{summary.by_day[0]?.date}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No daily call activity in this period.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm sm:text-base">Top 10 callers</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Counselors with highest call count</CardDescription>
                  </div>
                  {summaryQ.isFetching && !summaryQ.isLoading && (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                {summaryQ.isLoading ? (
                  <Skeleton className="h-28 w-full" />
                ) : summary?.by_user && summary.by_user.length > 0 ? (
                  <div className={cn("transition-opacity", summaryQ.isFetching && !summaryQ.isLoading && "opacity-60")}>
                    <HBarList
                      data={summary.by_user.map((u, idx) => {
                        const mins = Math.round(u.seconds / 60);
                        const pct = summary.total_calls > 0 ? Math.round((u.calls / summary.total_calls) * 100) : 0;
                        return {
                          id: u.user_id != null ? u.user_id : `unknown-${idx}`,
                          label: u.name,
                          value: u.calls,
                          detail: `${mins}m talk time · ${pct}%`,
                        };
                      })}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No caller activity recorded.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-[13rem] sm:max-w-sm sm:flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search by lead, phone, caller, notes..."
            className="rounded-full pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Direction Filter */}
        <Select
          value={directionParam}
          onValueChange={(val) => handleFilterChange("direction", val)}
        >
          <SelectTrigger className="w-full sm:w-36 flex-1 min-w-[130px]">
            <SelectValue placeholder="All directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>

        {/* Counselor Picker */}
        <Select
          value={createdByParam}
          onValueChange={(val) => handleFilterChange("created_by", val)}
        >
          <SelectTrigger className="w-full sm:w-44 flex-1 min-w-[150px]">
            <SelectValue placeholder="Logged by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All counselors</SelectItem>
            {(counselorsQ.data?.results ?? []).map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Branch Filter for Staff */}
        {isStaff && (
          <Select
            value={branchParam}
            onValueChange={(val) => handleFilterChange("branch_id", val)}
          >
            <SelectTrigger className="w-full sm:w-40 flex-1 min-w-[140px]">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {(branchesQ.data?.results ?? []).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date Presets */}
        <Select
          value={datePresetParam}
          onValueChange={(val) => {
            const next: Record<string, string | null> = {
              date_preset: val,
              page: "1",
            };
            if (val !== "custom") {
              next.date_from = null;
              next.date_to = null;
            }
            updateParams(next);
          }}
        >
          <SelectTrigger className="w-full sm:w-36 flex-1 min-w-[130px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Pickers */}
        {datePresetParam === "custom" && (
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <Input
              type="date"
              className="w-full sm:w-36 flex-1 min-w-[120px]"
              value={dateFromParam}
              onChange={(e) => handleFilterChange("date_from", e.target.value)}
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              className="w-full sm:w-36 flex-1 min-w-[120px]"
              value={dateToParam}
              onChange={(e) => handleFilterChange("date_to", e.target.value)}
            />
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground h-9 px-2 text-xs"
          >
            <FilterX className="mr-1 size-3.5" /> Clear filters
          </Button>
        )}
      </div>

      {/* Calls Table Card */}
      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("call_timestamp")}
                >
                  <div className="flex items-center gap-1">
                    <span>When</span>
                    {orderingParam === "-call_timestamp" ? (
                      <ArrowDown className="size-3.5 text-brand" />
                    ) : orderingParam === "call_timestamp" ? (
                      <ArrowUp className="size-3.5 text-brand" />
                    ) : (
                      <ArrowUpDown className="text-muted-foreground/60 size-3.5" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Logged by</TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("duration_seconds")}
                >
                  <div className="flex items-center gap-1">
                    <span>Duration</span>
                    {orderingParam === "-duration_seconds" ? (
                      <ArrowDown className="size-3.5 text-brand" />
                    ) : orderingParam === "duration_seconds" ? (
                      <ArrowUp className="size-3.5 text-brand" />
                    ) : (
                      <ArrowUpDown className="text-muted-foreground/60 size-3.5" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="w-20">Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Loading State */}
              {callsQ.isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {/* Error State */}
              {callsQ.isError && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <p className="text-destructive font-medium text-sm">
                      Failed to load calls
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      An error occurred while fetching the call records.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void callsQ.refetch();
                        void summaryQ.refetch();
                      }}
                      className="mt-4"
                    >
                      <RotateCcw className="mr-1.5 size-3.5" /> Retry
                    </Button>
                  </TableCell>
                </TableRow>
              )}

              {/* Empty State */}
              {!callsQ.isLoading && !callsQ.isError && callsData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <Phone className="text-muted-foreground mx-auto size-9 opacity-35" />
                    <p className="text-foreground mt-3 font-semibold text-base">
                      {hasActiveFilters
                        ? "No matching calls found"
                        : "No calls recorded yet"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {hasActiveFilters
                        ? "Try adjusting your search terms or clearing active filters."
                        : "Logged counselor calls will appear here automatically."}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        className="mt-4"
                      >
                        Reset filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}

              {/* Data Rows */}
              {!callsQ.isLoading &&
                callsData.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedCall(call)}
                  >
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                      {formatDateTime(call.call_timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize font-medium",
                          call.direction === "inbound"
                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {call.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/leads/${call.lead}`}
                        onClick={(e) => e.stopPropagation()}
                        className="group inline-flex flex-col"
                      >
                        <span className="font-semibold text-foreground group-hover:text-brand transition-colors">
                          {call.lead_name}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {call.lead_reference_number}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {call.phone_number || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {call.created_by_name || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium tabular-nums">
                      {call.duration_formatted}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[12rem] truncate">
                      {call.outcome || "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {call.recording_url ? (
                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Open recording"
                          className="text-brand hover:text-brand/80 inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <ExternalLink className="size-3.5" /> Audio
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

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t px-6 py-4 sm:flex-row">
            <p className="text-muted-foreground text-xs">
              Showing{" "}
              <span className="text-foreground font-medium">
                {(pageParam - 1) * PAGE_SIZE + 1}
              </span>
              –
              <span className="text-foreground font-medium">
                {Math.min(pageParam * PAGE_SIZE, totalCount)}
              </span>{" "}
              of{" "}
              <span className="text-foreground font-medium">{totalCount}</span>{" "}
              calls
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pageParam <= 1 || callsQ.isLoading}
                onClick={() => handleFilterChange("page", String(pageParam - 1))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground text-xs">
                Page {pageParam} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pageParam >= totalPages || callsQ.isLoading}
                onClick={() => handleFilterChange("page", String(pageParam + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Call Details Side Panel (US-3) */}
      {/* ------------------------------------------------------------------- */}
      <Sheet
        open={selectedCall !== null}
        onOpenChange={(open) => !open && setSelectedCall(null)}
      >
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle>Call Details</SheetTitle>
              {selectedCall && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "capitalize",
                    selectedCall.direction === "inbound"
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  )}
                >
                  {selectedCall.direction}
                </Badge>
              )}
            </div>
            <SheetDescription>
              {selectedCall
                ? `Logged on ${formatDateTime(selectedCall.call_timestamp)}`
                : "Call information and counselor notes."}
            </SheetDescription>
          </SheetHeader>

          {selectedCall && (
            <SheetBody className="space-y-5">
              <DetailField label="Date & Time" value={formatDateTime(selectedCall.call_timestamp)} />

              <DetailField label="Direction">
                <span className="capitalize text-sm font-medium">
                  {selectedCall.direction}
                </span>
              </DetailField>

              <DetailField label="Lead">
                <Link
                  to={`/leads/${selectedCall.lead}`}
                  className="text-brand hover:underline inline-flex items-center gap-1.5 text-sm font-semibold"
                >
                  {selectedCall.lead_name} ({selectedCall.lead_reference_number})
                  <ExternalLink className="size-3.5" />
                </Link>
              </DetailField>

              <DetailField label="Phone" value={selectedCall.phone_number} />

              <DetailField label="Caller" value={selectedCall.caller} />

              <DetailField label="Logged By" value={selectedCall.created_by_name} />

              <DetailField
                label="Duration"
                value={`${selectedCall.duration_formatted} (${selectedCall.duration_seconds} sec)`}
              />

              <DetailField label="Outcome" value={selectedCall.outcome} />

              <DetailField label="Notes">
                <p className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {selectedCall.notes || "—"}
                </p>
              </DetailField>

              <DetailField label="Next Action" value={selectedCall.next_action} />

              <DetailField
                label="Next Follow-up"
                value={
                  selectedCall.next_followup_at
                    ? formatDateTime(selectedCall.next_followup_at)
                    : null
                }
              />

              <DetailField label="Recording">
                {selectedCall.recording_url ? (
                  <a
                    href={selectedCall.recording_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                  >
                    <ExternalLink className="size-4" /> Listen to audio recording
                  </a>
                ) : (
                  <p className="text-sm">—</p>
                )}
              </DetailField>
            </SheetBody>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
