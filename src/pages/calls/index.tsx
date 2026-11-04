import {
  Activity,
  Clock3,
  Download,
  LoaderCircle,
  PhoneCall,
  RefreshCw,
  Search,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DailyCallsChart } from "@/components/charts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CallsTable } from "@/pages/calls/calls-table";
import { CallDetailsPanel } from "@/pages/calls/call-details-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { useCallsList, useCallsSummary, useExportCalls } from "@/hooks/use-calls";
import { useCallLogUsers } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  callOverviewCallerName,
  formatCallDuration,
} from "@/lib/calls-overview";
import {
  callsApiFilters,
  readCallsPageState,
  type CallDateRange,
  type CallSortField,
} from "@/lib/calls-page";
import type { CallSummary, GlobalCall } from "@/types/leads-api";

const EMPTY_SUMMARY: CallSummary = {
  total_calls: 0,
  inbound_calls: 0,
  outbound_calls: 0,
  connected_calls: 0,
  total_duration_seconds: 0,
  average_duration_seconds: 0,
  connect_rate: 0,
  calls_per_day: [],
  top_callers: [],
};

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  isLoading: boolean;
}

function MetricCard({ title, value, description, icon: Icon, isLoading }: MetricCardProps) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-1">
          <CardDescription>{title}</CardDescription>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <CardTitle className="font-headline text-2xl tabular-nums">{value}</CardTitle>
          )}
        </div>
        <span className="bg-brand/10 text-brand rounded-lg p-2" aria-hidden="true">
          <Icon className="size-5" />
        </span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-4 w-36" />
        ) : (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface CallsOverviewContentProps {
  summary: CallSummary | undefined;
  isLoading: boolean;
  errorMessage: string | null;
  isFetching: boolean;
  onRetry: () => void;
  isExporting?: boolean;
  exportErrorMessage?: string | null;
  onExport?: () => void;
}

export function CallsOverviewContent({
  summary: response,
  isLoading,
  errorMessage,
  isFetching,
  onRetry,
  isExporting = false,
  exportErrorMessage = null,
  onExport = () => undefined,
}: CallsOverviewContentProps) {
  const summary = response ?? EMPTY_SUMMARY;
  const number = new Intl.NumberFormat();
  const percent = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Call activity overview across the leads you can access.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onExport}
          disabled={isExporting}
          aria-label="Export all matching calls to CSV"
        >
          {isExporting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Download />
          )}
          {isExporting ? "Preparing CSV..." : "Export CSV"}
        </Button>
      </header>

      {exportErrorMessage && (
        <p role="alert" className="text-destructive text-sm">
          {exportErrorMessage}
        </p>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
        >
          <p className="text-sm">{errorMessage}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? "animate-spin" : ""} />
            Retry
          </Button>
        </div>
      )}

      <section aria-label="Call summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Calls"
          value={number.format(summary.total_calls)}
          description={`${number.format(summary.inbound_calls)} inbound · ${number.format(summary.outbound_calls)} outbound`}
          icon={PhoneCall}
          isLoading={isLoading}
        />
        <MetricCard
          title="Talk Time"
          value={formatCallDuration(summary.total_duration_seconds)}
          description="Combined duration of matching calls"
          icon={Clock3}
          isLoading={isLoading}
        />
        <MetricCard
          title="Average Duration"
          value={formatCallDuration(summary.average_duration_seconds)}
          description="Average time per call"
          icon={Timer}
          isLoading={isLoading}
        />
        <MetricCard
          title="Connect Rate"
          value={`${percent.format(summary.connect_rate)}%`}
          description={`${number.format(summary.connected_calls)} calls longer than 0 seconds`}
          icon={Activity}
          isLoading={isLoading}
        />
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Calls per day</CardTitle>
            <CardDescription>Daily call volume in Nepal local time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : summary.calls_per_day.length ? (
              <DailyCallsChart data={summary.calls_per_day} />
            ) : (
              <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
                No daily call data for this view.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="text-brand size-4" />
              Top callers
            </CardTitle>
            <CardDescription>Users with the most calls in this view</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))
            ) : summary.top_callers.length ? (
              summary.top_callers.map((caller, index) => (
                <div
                  key={caller.id ?? `unknown-${index}`}
                  className="flex min-w-0 items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {callOverviewCallerName(caller.name)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {caller.email || "No linked user account"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {number.format(caller.call_count)}
                    <span className="text-muted-foreground ml-1 font-normal">
                      {caller.call_count === 1 ? "call" : "calls"}
                    </span>
                  </span>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground flex min-h-44 items-center justify-center text-center text-sm">
                No caller data for this view.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default function CallsPage() {
  const [selectedCall, setSelectedCall] = useState<GlobalCall | null>(null);
  const { user } = useAuth();
  const canSelectBranch = !!user && (user.is_staff || user.is_superuser);
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => readCallsPageState(searchParams), [searchParams]);
  const debouncedSearch = useDebouncedValue(state.search, 300);
  const searchPending = state.search.trim() !== debouncedSearch.trim();
  const filters = useMemo(
    () => callsApiFilters(state, debouncedSearch, canSelectBranch),
    [state, debouncedSearch, canSelectBranch],
  );
  const ordering = `${state.sortDirection === "desc" ? "-" : ""}${state.sortField}`;
  const listParams = useMemo(
    () => ({
      ...filters,
      page: state.page,
      page_size: 20,
      ordering,
    }),
    [filters, state.page, ordering],
  );
  const callsQuery = useCallsList(listParams);
  const summaryQuery = useCallsSummary(filters);
  const isFiltered = Boolean(
    state.search.trim() ||
    state.direction !== "all" ||
    state.loggedBy ||
    (state.dateRange !== "all" &&
      (state.dateRange !== "custom" || state.startDate || state.endDate)) ||
    (canSelectBranch && state.branch),
  );
  const emptyFilterSummary = useCallsSummary({}, isFiltered && !callsQuery.isLoading &&
    callsQuery.data?.count === 0);
  const usersQuery = useCallLogUsers(!!user);
  const branchesQuery = useBranches(1, 100, "", canSelectBranch);
  const exportMutation = useExportCalls();
  const maxPage = Math.max(1, callsQuery.data?.total_pages ?? 1);
  const rows = searchPending ? [] : callsQuery.data?.results ?? [];
  const isTableLoading = callsQuery.isLoading || searchPending;
  const hasNoCalls = isFiltered
    ? emptyFilterSummary.data?.total_calls === 0
    : callsQuery.data?.count === 0;
  const isCheckingEmptyHistory =
    isFiltered &&
    !callsQuery.isLoading &&
    callsQuery.data?.count === 0 &&
    emptyFilterSummary.isLoading;

  const updateQuery = (
    updates: Record<string, string>,
    options: { resetPage?: boolean; replace?: boolean } = {},
  ) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (options.resetPage !== false) next.delete("page");
    setSearchParams(next, { replace: options.replace });
  };

  const updateFilter = (key: string, value: string) => {
    updateQuery({ [key]: value });
  };

  const clearFilters = () => setSearchParams(new URLSearchParams());

  const changeDateRange = (range: CallDateRange) => {
    updateQuery({
      date_range: range === "all" ? "" : range,
      ...(range === "custom" ? {} : { start_date: "", end_date: "" }),
    });
  };

  const changeSort = (field: CallSortField) => {
    const direction =
      field === state.sortField && state.sortDirection === "desc" ? "asc" : "desc";
    updateQuery({ sort: field, sort_dir: direction });
  };

  const changePage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next);
  };

  const onExport = () => {
    exportMutation.mutate(filters, {
      onSuccess: ({ blob, filename }) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      },
    });
  };

  const loggers = usersQuery.data ?? [];
  const tableError = callsQuery.isError
    ? apiErrorMessage(callsQuery.error, "Could not load calls.")
    : null;

  useEffect(() => {
    if (!canSelectBranch && searchParams.has("branch_id")) {
      const next = new URLSearchParams(searchParams);
      next.delete("branch_id");
      setSearchParams(next, { replace: true });
    }
  }, [canSelectBranch, searchParams, setSearchParams]);

  useEffect(() => {
    if (
      state.page > 1 &&
      callsQuery.isError &&
      isAxiosError(callsQuery.error) &&
      callsQuery.error.response?.status === 404
    ) {
      const next = new URLSearchParams(searchParams);
      next.delete("page");
      setSearchParams(next, { replace: true });
    }
  }, [callsQuery.error, callsQuery.isError, searchParams, setSearchParams, state.page]);

  return (
    <div className="min-w-0 space-y-6">
      <CallsOverviewContent
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading || searchPending}
        errorMessage={
          summaryQuery.isError
            ? apiErrorMessage(summaryQuery.error, "Could not load calls overview.")
            : null
        }
        isFetching={summaryQuery.isFetching}
        onRetry={() => void summaryQuery.refetch()}
        isExporting={exportMutation.isPending}
        exportErrorMessage={
          exportMutation.isError
            ? apiErrorMessage(exportMutation.error, "Could not export calls CSV.")
            : null
        }
        onExport={onExport}
      />

      <section aria-label="Calls list" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-headline text-xl font-semibold">Call log</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Search and filter calls visible to your account.
            </p>
          </div>
          {isFiltered && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="grid min-w-0 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-4">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <Input
              aria-label="Search calls"
              placeholder="Search lead, phone, caller, or notes..."
              className="pl-9"
              value={state.search}
              onChange={(event) =>
                updateQuery({ search: event.target.value }, { replace: true })
              }
            />
          </div>
          <Select
            value={state.direction}
            onValueChange={(value) => updateFilter("direction", value === "all" ? "" : value)}
          >
            <SelectTrigger aria-label="Filter by direction">
              <SelectValue placeholder="All directions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directions</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={state.loggedBy || "all"}
            onValueChange={(value) => updateFilter("created_by", value === "all" ? "" : value)}
          >
            <SelectTrigger aria-label="Filter by logged by">
              <SelectValue placeholder="Anyone who logged a call" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone who logged a call</SelectItem>
              {loggers.map((entry) => (
                <SelectItem key={entry.id} value={String(entry.id)}>
                  {entry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={state.dateRange} onValueChange={(value) => changeDateRange(value as CallDateRange)}>
            <SelectTrigger aria-label="Filter by date range">
              <SelectValue placeholder="All dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="thismonth">This month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {canSelectBranch && (
            <Select
              value={state.branch || "all"}
              onValueChange={(value) => updateFilter("branch_id", value === "all" ? "" : value)}
            >
              <SelectTrigger aria-label="Filter by branch">
                <SelectValue placeholder="All branches" />
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

          {state.dateRange === "custom" && (
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
              <label className="grid min-w-36 flex-1 gap-1 text-xs font-medium">
                Start date (NPT)
                <Input
                  type="date"
                  aria-label="Custom start date"
                  value={state.startDate}
                  max={state.endDate || undefined}
                  onChange={(event) => updateFilter("start_date", event.target.value)}
                />
              </label>
              <label className="grid min-w-36 flex-1 gap-1 text-xs font-medium">
                End date (NPT)
                <Input
                  type="date"
                  aria-label="Custom end date"
                  value={state.endDate}
                  min={state.startDate || undefined}
                  onChange={(event) => updateFilter("end_date", event.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        {tableError && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          >
            <p className="text-sm">{tableError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void callsQuery.refetch()}
              disabled={callsQuery.isFetching}
            >
              <RefreshCw className={callsQuery.isFetching ? "animate-spin" : ""} />
              Retry
            </Button>
          </div>
        )}

        <CallsTable
          rows={rows}
          isLoading={isTableLoading}
          hasError={Boolean(tableError)}
          hasNoCalls={hasNoCalls}
          isCheckingEmptyHistory={isCheckingEmptyHistory}
          currentPage={state.page}
          totalPages={maxPage}
          totalCount={callsQuery.data?.count ?? 0}
          sortField={state.sortField}
          sortDirection={state.sortDirection}
          onSort={changeSort}
          onSelectCall={setSelectedCall}
          onPrevious={() => changePage(state.page - 1)}
          onNext={() => changePage(state.page + 1)}
        />
      </section>
      <CallDetailsPanel
        call={selectedCall}
        open={selectedCall !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCall(null);
        }}
      />
    </div>
  );
}
