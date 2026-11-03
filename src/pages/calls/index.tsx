import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  ExternalLink,
  Loader2,
  PhoneCall,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useBranches } from "@/hooks/use-branches";
import { useCalls, useCallsSummary, useExportCalls } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { cn } from "@/lib/utils";
import type { CallDirection, CallsListParams } from "@/types/calls";

const PAGE_SIZE = 20;
const NPT_OFFSET = "+05:45"; // Nepal has no daylight saving, so the offset is fixed

// ---- Nepal-time date helpers -------------------------------------------
function nepalToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());
}
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
/** Turns the range preset (or custom dates) in the URL into from/to day strings. */
function resolveRange(range: string, from: string, to: string) {
  const today = nepalToday();
  if (range === "today") return { from: today, to: today };
  if (range === "7d") return { from: addDays(today, -6), to: today };
  if (range === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  if (range === "custom") return { from, to };
  return { from: "", to: "" };
}

// ---- Display helpers ---------------------------------------------------
function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
function formatMMSS(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type UserOption = {
  id: number;
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};
function userLabel(u: UserOption): string {
  return (
    u.full_name ||
    u.name ||
    `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() ||
    u.email ||
    `User ${u.id}`
  );
}

export default function CallsPage() {
  const { user } = useAuth();
  const isStaff = !!(user?.is_staff || user?.is_superuser);
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- Everything the page shows is read from the URL -------------------
  const q = searchParams.get("q") ?? "";
  const dir = searchParams.get("dir") ?? "";
  const by = searchParams.get("by") ?? "";
  const branch = searchParams.get("branch") ?? "";
  const range = searchParams.get("range") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const sort = searchParams.get("sort") === "duration" ? "duration" : "when";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  /** Change filters. Any change except paging itself goes back to page 1. */
  function update(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    setSearchParams(next);
  }

  // Search box: type freely, write to the URL after a short pause.
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => setSearchInput(q), [q]);
  useEffect(() => {
    if (searchInput === q) return;
    const t = setTimeout(
      () => update({ q: searchInput.trim() || undefined }),
      300,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // ---- URL -> API params ------------------------------------------------
  const params: CallsListParams = useMemo(() => {
    const { from, to } = resolveRange(range, fromParam, toParam);
    const p: CallsListParams = {
      page,
      page_size: PAGE_SIZE,
      ordering: `${order === "desc" ? "-" : ""}${sort === "duration" ? "duration_seconds" : "call_timestamp"}`,
    };
    if (q) p.search = q;
    if (dir === "inbound" || dir === "outbound")
      p.direction = dir as CallDirection;
    if (by) p.created_by = Number(by);
    if (isStaff && branch) p.branch_id = Number(branch);
    if (from) p.call_timestamp__gte = `${from}T00:00:00${NPT_OFFSET}`;
    if (to) p.call_timestamp__lte = `${to}T23:59:59.999999${NPT_OFFSET}`; // "Today" runs to 23:59:59
    return p;
  }, [
    q,
    dir,
    by,
    branch,
    range,
    fromParam,
    toParam,
    sort,
    order,
    page,
    isStaff,
  ]);

  const { data, isLoading, isError, refetch, isFetching } = useCalls(params);
  // Filters only (no page, page size or sort), shared by the cards and the export
  const filterParams = useMemo(() => {
    const { page, page_size, ordering, ...rest } = params;
    void page;
    void page_size;
    void ordering;
    return rest;
  }, [params]);

  const summaryQuery = useCallsSummary(filterParams);
  const exportCalls = useExportCalls();
  const summary = summaryQuery.data;
  // Options for the "Logged by" and branch filters
  const usersQuery = useUsers(1, 100);
  const branchesQuery = useBranches(1, 100, "", isStaff);
  const userOptions =
    (usersQuery.data as { results?: UserOption[] } | undefined)?.results ?? [];
  const branchOptions =
    (
      branchesQuery.data as
        { results?: { id: number; name: string }[] } | undefined
    )?.results ?? [];

  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const firstRow = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, count);
  const hasFilters = !!(q || dir || by || branch || range);

  function toggleSort(column: "when" | "duration") {
    if (sort === column)
      update({ sort: column, order: order === "desc" ? "asc" : "desc" });
    else update({ sort: column, order: "desc" });
  }
  function SortIcon({ column }: { column: "when" | "duration" }) {
    if (sort !== column) return <ArrowUpDown className="size-3.5 opacity-40" />;
    return order === "desc" ? (
      <ArrowDown className="size-3.5" />
    ) : (
      <ArrowUp className="size-3.5" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Calls
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every call logged across leads.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportCalls.mutate(filterParams)}
          disabled={exportCalls.isPending}
        >
          {exportCalls.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Download />
          )}
          Export CSV
        </Button>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Total calls</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {summary?.total_calls ?? 0}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {summary?.inbound ?? 0} inbound · {summary?.outbound ?? 0} outbound
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Talk time</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMMSS(summary?.talk_seconds ?? 0)}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Average duration</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMMSS(Math.round(summary?.average_seconds ?? 0))}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Connect rate</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {summary && summary.total_calls > 0
              ? `${Math.round((summary.connected_calls / summary.total_calls) * 100)}%`
              : "0%"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {summary?.connected_calls ?? 0} connected
          </p>
        </div>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-[13rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search caller, phone, lead, notes"
            className="rounded-full pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={dir || "all"}
          onValueChange={(v) => update({ dir: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={by || "all"}
          onValueChange={(v) => update({ by: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Logged by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            {userOptions.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {userLabel(u)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isStaff && (
          <Select
            value={branch || "all"}
            onValueChange={(v) =>
              update({ branch: v === "all" ? undefined : v })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branchOptions.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={range || "all"}
          onValueChange={(v) =>
            update({
              range: v === "all" ? undefined : v,
              from: undefined,
              to: undefined,
            })
          }
        >
          <SelectTrigger className="w-40">
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
        {range === "custom" && (
          <>
            <Input
              type="date"
              className="w-40"
              aria-label="From date"
              value={fromParam}
              onChange={(e) => update({ from: e.target.value || undefined })}
            />
            <Input
              type="date"
              className="w-40"
              aria-label="To date"
              value={toParam}
              onChange={(e) => update({ to: e.target.value || undefined })}
            />
          </>
        )}
        {hasFilters && (
          <Button variant="ghost" onClick={() => setSearchParams({})}>
            <X /> Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium"
                    onClick={() => toggleSort("when")}
                  >
                    When <SortIcon column="when" />
                  </button>
                </TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Logged by</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium"
                    onClick={() => toggleSort("duration")}
                  >
                    Duration <SortIcon column="duration" />
                  </button>
                </TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <p className="text-destructive text-sm font-medium">
                      Could not load calls.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => void refetch()}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <PhoneCall className="text-muted-foreground mx-auto size-8 opacity-40" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      {hasFilters
                        ? "No calls match these filters."
                        : "No calls yet."}
                    </p>
                  </TableCell>
                </TableRow>
              )}

              {!isError &&
                rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatWhen(c.call_timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize",
                          c.direction === "inbound"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                        )}
                      >
                        {c.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/leads/${c.lead}`}
                        className="font-semibold hover:underline"
                      >
                        {c.lead_name}
                      </Link>
                      <p className="text-muted-foreground font-mono text-xs">
                        {c.lead_reference_number}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {c.phone_number || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.created_by_name || "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatMMSS(c.duration_seconds)}
                    </TableCell>
                    <TableCell>{c.outcome || "—"}</TableCell>
                    <TableCell>
                      {c.recording_url ? (
                        <a
                          href={c.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand inline-flex items-center gap-1 hover:underline"
                        >
                          Listen <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {count > 0 && !isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            Showing {firstRow}–{lastRow} of {count}
            {isFetching && " …"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() =>
                update({ page: page > 2 ? String(page - 1) : undefined })
              }
            >
              Previous
            </Button>
            <span className="text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => update({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
