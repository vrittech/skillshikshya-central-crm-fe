import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  PhoneCall,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { HBarList, MiniBars } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { useCalls, useCallSummary } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api";
import { formatPhone } from "@/lib/leads-format";
import {
  addDays,
  endOfNepalDay,
  formatNepalDateTime,
  nepalToday,
  startOfNepalDay,
} from "@/lib/nepal-time";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { CallDetailSheet } from "@/pages/calls/call-detail-sheet";
import { outcomeLabel } from "@/pages/calls/outcome";
import { callsService } from "@/services/calls.service";
import type { Call, CallDirection, CallFilterParams, CallSummaryDay } from "@/types/calls";

const PAGE_SIZE = 20;
const DEFAULT_SORT = "-call_timestamp";
const COLUMN_COUNT = 8;
/** Keeps the per-day chart readable on a phone when the range covers months. */
const MAX_CHART_DAYS = 60;

const FILTER_KEYS = ["q", "direction", "user", "branch", "range", "from", "to"];

const DIRECTION_TONE: Record<CallDirection, string> = {
  inbound: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  outbound: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

function dateBounds(range: string, from: string, to: string) {
  const today = nepalToday();
  let start = "";
  let end = "";
  if (range === "today") [start, end] = [today, today];
  if (range === "7d") [start, end] = [addDays(today, -6), today];
  if (range === "month") [start, end] = [`${today.slice(0, 7)}-01`, today];
  if (range === "custom") [start, end] = [from, to];
  return {
    call_timestamp__gte: start ? startOfNepalDay(start) : undefined,
    call_timestamp__lte: end ? endOfNepalDay(end) : undefined,
  };
}

/** Tie-breaks keep paging stable: many calls share a duration, such as 0 seconds. */
function toOrdering(sort: string) {
  return sort.endsWith("call_timestamp") ? `${sort},-id` : `${sort},-call_timestamp,-id`;
}

/** The API skips days with no calls; the chart should show those gaps. */
function dailyCounts(days: CallSummaryDay[]) {
  if (days.length === 0) return [];
  const counts = new Map(days.map((d) => [d.date, d.calls]));
  const values: number[] = [];
  const last = days[days.length - 1].date;
  for (let day = days[0].date; day <= last; day = addDays(day, 1)) {
    values.push(counts.get(day) ?? 0);
  }
  return values.slice(-MAX_CHART_DAYS);
}

function formatMmSs(total: number) {
  const m = Math.floor(total / 60);
  return `${String(m).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function StatCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  loading: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
      <p className="text-muted-foreground font-mono text-[11px] font-bold tracking-wider uppercase">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="font-headline mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      )}
      {loading ? <Skeleton className="mt-2 h-4 w-32" /> : <p className="text-muted-foreground mt-1 text-xs">{hint || " "}</p>}
    </div>
  );
}

function SortHeader({
  field,
  label,
  sort,
  onSort,
}: {
  field: string;
  label: string;
  sort: string;
  onSort: (field: string) => void;
}) {
  const active = sort === field || sort === `-${field}`;
  const Icon = !active ? ArrowUpDown : sort.startsWith("-") ? ArrowDown : ArrowUp;
  return (
    <TableHead aria-sort={!active ? "none" : sort.startsWith("-") ? "descending" : "ascending"}>
      <button
        type="button"
        className="hover:text-foreground inline-flex cursor-pointer items-center gap-1 uppercase"
        onClick={() => onSort(field)}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-40")} />
      </button>
    </TableHead>
  );
}

export default function CallsPage() {
  const { user } = useAuth();
  const isStaff = !!(user?.is_staff || user?.is_superuser);
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get("q") ?? "";
  const direction = searchParams.get("direction");
  const userId = searchParams.get("user") ?? "";
  const branchId = searchParams.get("branch") ?? "";
  const range = searchParams.get("range") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sort = searchParams.get("sort") ?? DEFAULT_SORT;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [search, setSearch] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(search);
  const [selected, setSelected] = useState<Call | null>(null);
  const [exporting, setExporting] = useState(false);

  /** Any change except paging goes back to page 1. */
  const updateParams = useCallback(
    (changes: Record<string, string | null>, replace = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!("page" in changes)) next.delete("page");
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  // The URL changed from outside the box (Back button, Clear filters). Our own
  // writes match the debounced text, so they can't overwrite what's being typed.
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    if (urlSearch !== debouncedSearch) setSearch(urlSearch);
  }

  // Write once typing has settled, so a stale debounced value is never written back.
  useEffect(() => {
    if (debouncedSearch === search && debouncedSearch !== urlSearch) {
      updateParams({ q: debouncedSearch || null }, true);
    }
  }, [debouncedSearch, search, urlSearch, updateParams]);

  const filters = useMemo<CallFilterParams>(
    () => ({
      search: urlSearch || undefined,
      direction: direction === "inbound" || direction === "outbound" ? direction : undefined,
      created_by: Number(userId) || undefined,
      branch_id: isStaff ? Number(branchId) || undefined : undefined,
      ...dateBounds(range, from, to),
    }),
    [urlSearch, direction, userId, branchId, isStaff, range, from, to],
  );
  const ordering = toOrdering(sort);

  const list = useCalls({ ...filters, ordering, page, page_size: PAGE_SIZE });
  const summary = useCallSummary(filters);
  const usersQ = useUsers(1, 100);
  const branchesQ = useBranches(1, 100, "", isStaff);

  const rows = list.data?.results ?? [];
  const count = list.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const firstRow = (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, count);
  const hasFilters = FILTER_KEYS.some((key) => searchParams.get(key));
  const hasError = list.isError || summary.isError;
  const pageGone =
    list.isError && axios.isAxiosError(list.error) && list.error.response?.status === 404 && page > 1;

  // A shared link can point past the last page once filters or data change.
  useEffect(() => {
    if (pageGone) updateParams({ page: null }, true);
  }, [pageGone, updateParams]);

  const userOptions = useMemo(
    () => [
      { value: "all", label: "All users" },
      ...(usersQ.data?.results ?? []).map((u) => ({ value: String(u.id), label: u.name })),
    ],
    [usersQ.data],
  );

  const stats = summary.data;
  const dayValues = useMemo(() => dailyCounts(stats?.by_day ?? []), [stats]);
  const callerBars = (stats?.by_user ?? []).map((u) => ({ label: u.name, value: u.calls }));

  function clearFilters() {
    setSearch("");
    updateParams(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])));
  }

  function toggleSort(field: string) {
    const next = sort === `-${field}` ? field : `-${field}`;
    updateParams({ sort: next === DEFAULT_SORT ? null : next });
  }

  function retry() {
    void list.refetch();
    void summary.refetch();
  }

  async function handleExport() {
    setExporting(true);
    try {
      await callsService.exportCsv({ ...filters, ordering });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every call your counselors make. Days and times are in Nepal time.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting || count === 0}>
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          {exporting ? "Preparing…" : "Export CSV"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total calls"
          loading={summary.isLoading}
          value={stats?.total_calls ?? "—"}
          hint={stats && `${stats.inbound} inbound · ${stats.outbound} outbound`}
        />
        <StatCard
          label="Talk time"
          loading={summary.isLoading}
          value={stats?.total_formatted ?? "—"}
          hint="HH:MM:SS"
        />
        <StatCard
          label="Average duration"
          loading={summary.isLoading}
          value={stats ? formatMmSs(stats.avg_seconds) : "—"}
          hint="MM:SS per call"
        />
        <StatCard
          label="Connect rate"
          loading={summary.isLoading}
          value={stats ? `${(stats.connect_rate * 100).toFixed(1)}%` : "—"}
          hint={stats && `${stats.connected_calls} connected`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="bg-card min-w-0 rounded-2xl border p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
          <h2 className="font-headline font-semibold">Calls per day</h2>
          {summary.isLoading ? (
            <Skeleton className="mt-3 h-24 w-full" />
          ) : dayValues.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No calls to chart.</p>
          ) : (
            <>
              <MiniBars values={dayValues} className="gap-px sm:gap-0.5" />
              <p className="text-muted-foreground mt-2 text-xs">
                {dayValues.length === MAX_CHART_DAYS
                  ? `Last ${MAX_CHART_DAYS} days of this range`
                  : `${stats?.by_day[0].date} to ${stats?.by_day[stats.by_day.length - 1].date}`}
              </p>
            </>
          )}
        </div>
        <div className="bg-card min-w-0 rounded-2xl border p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
          <h2 className="font-headline mb-3 font-semibold">Top callers</h2>
          {summary.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : callerBars.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No callers to show.</p>
          ) : (
            <HBarList data={callerBars} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-[13rem] sm:w-auto sm:max-w-sm sm:flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search by lead, phone, caller, or notes"
            aria-label="Search calls"
            className="rounded-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filters.direction ?? "all"}
          onValueChange={(v) => updateParams({ direction: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-full sm:w-48">
          <Combobox
            value={userId || "all"}
            onChange={(v) => updateParams({ user: v === "all" ? null : v })}
            options={userOptions}
            selectedLabel="Selected user"
            searchPlaceholder="Search users…"
            emptyText="No users found."
            loading={usersQ.isLoading}
          />
        </div>
        <Select
          value={range || "all"}
          onValueChange={(v) =>
            updateParams({ range: v === "all" ? null : v, ...(v === "custom" ? {} : { from: null, to: null }) })
          }
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {range === "custom" && (
          <>
            <Input
              type="date"
              aria-label="From date"
              className="w-full sm:w-40"
              value={from}
              max={to || undefined}
              onChange={(e) => updateParams({ from: e.target.value || null })}
            />
            <Input
              type="date"
              aria-label="To date"
              className="w-full sm:w-40"
              value={to}
              min={from || undefined}
              onChange={(e) => updateParams({ to: e.target.value || null })}
            />
          </>
        )}
        {isStaff && (
          <Select
            value={branchId || "all"}
            onValueChange={(v) => updateParams({ branch: v === "all" ? null : v })}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Branch">
              <SelectValue />
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
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        {hasError && !pageGone ? (
          <div className="px-4 py-14 text-center">
            <TriangleAlert className="text-destructive mx-auto size-8" />
            <p className="mt-2 text-sm font-medium">Could not load calls.</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {apiErrorMessage(list.error ?? summary.error)}
            </p>
            <Button variant="outline" className="mt-4" onClick={retry}>
              <RotateCcw /> Retry
            </Button>
          </div>
        ) : (
          <Table className={cn("whitespace-nowrap", list.isPlaceholderData && "opacity-60")}>
            <TableHeader>
              <TableRow>
                <SortHeader field="call_timestamp" label="When" sort={sort} onSort={toggleSort} />
                <TableHead>Direction</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Logged by</TableHead>
                <SortHeader field="duration_seconds" label="Duration" sort={sort} onSort={toggleSort} />
                <TableHead>Outcome</TableHead>
                <TableHead>Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={COLUMN_COUNT}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!list.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center whitespace-normal">
                    <PhoneCall className="text-muted-foreground mx-auto size-8 opacity-40" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      {hasFilters
                        ? "No calls match these filters."
                        : "No calls yet. Calls logged on a lead will appear here."}
                    </p>
                    {hasFilters && (
                      <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((call) => (
                <TableRow
                  key={call.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => setSelected(call)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) setSelected(call);
                  }}
                >
                  <TableCell className="text-muted-foreground">
                    {formatNepalDateTime(call.call_timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("capitalize", DIRECTION_TONE[call.direction])}>
                      {call.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/leads/${call.lead}`}
                      className="font-semibold hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {call.lead_name}
                    </Link>
                    <span className="text-muted-foreground block font-mono text-xs">
                      {call.lead_reference_number}
                    </span>
                  </TableCell>
                  <TableCell>{formatPhone(call.phone_number)}</TableCell>
                  <TableCell className="text-muted-foreground">{call.created_by_name || "—"}</TableCell>
                  <TableCell className="font-mono tabular-nums">{call.duration_formatted}</TableCell>
                  <TableCell className="text-muted-foreground">{outcomeLabel(call.outcome)}</TableCell>
                  <TableCell>
                    {call.recording_url && (
                      <a
                        href={call.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand inline-flex items-center gap-1 font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Listen <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {!hasError && count > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Showing {firstRow}–{lastRow} of {count}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: page > 2 ? String(page - 1) : null })}
            >
              <ChevronLeft /> Previous
            </Button>
            <span className="text-muted-foreground text-sm tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      <CallDetailSheet call={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
