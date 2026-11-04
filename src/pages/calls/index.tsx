import { ArrowDown, ArrowUp, Download, ExternalLink, Loader2, PhoneCall, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HBarList, MiniBars } from "@/components/charts";
import { CallDetailSheet } from "./call-detail-sheet";
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
import { useCallSummary, useCalls, useExportCalls } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { formatDateTime } from "@/lib/leads-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { CallDirection, CallListParams, CallRow } from "@/types/calls";

const PAGE_SIZE = 20;
const DEFAULT_ORDERING = "-call_timestamp";
type Preset = "all" | "today" | "7d" | "month" | "custom";

/** ISO string with the local timezone offset, e.g. 2026-11-03T23:59:59.999+05:45 */
function isoWithOffset(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}` +
    `${sign}${p(Math.floor(abs / 60))}:${p(abs % 60)}`
  );
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function dateRange(preset: Preset, from: string, to: string): { gte?: string; lte?: string } {
  const now = new Date();
  if (preset === "today") return { gte: isoWithOffset(startOfDay(now)), lte: isoWithOffset(endOfDay(now)) };
  if (preset === "7d") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { gte: isoWithOffset(start), lte: isoWithOffset(endOfDay(now)) };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { gte: isoWithOffset(start), lte: isoWithOffset(endOfDay(now)) };
  }
  if (preset === "custom") {
    const f = parseDay(from);
    const t = parseDay(to);
    return {
      gte: f ? isoWithOffset(startOfDay(f)) : undefined,
      lte: t ? isoWithOffset(endOfDay(t)) : undefined,
    };
  }
  return {};
}

function SortHead({
  label,
  field,
  ordering,
  onSort,
}: {
  label: string;
  field: string;
  ordering: string;
  onSort: (field: string) => void;
}) {
  const active = ordering === field || ordering === `-${field}`;
  const desc = ordering === `-${field}`;
  return (
    <TableHead>
      <button
        type="button"
        className="hover:text-foreground inline-flex items-center gap-1"
        onClick={() => onSort(field)}
      >
        {label}
        {active && (desc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />)}
      </button>
    </TableHead>
  );
}

function formatAvg(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  
  function StatCard({ label, value, hint, loading }: { label: string; value: string; hint?: string; loading: boolean }) {
    return (
      <div className="bg-card rounded-2xl border p-4">
        <p className="text-muted-foreground font-mono text-[11px] font-bold tracking-wider uppercase">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <p className="font-headline mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        )}
        {hint && !loading && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
    );
  }
export default function CallsPage() {
  const { user } = useAuth();
  const isStaff = !!user && (user.is_staff || user.is_superuser);
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const direction = searchParams.get("direction") ?? "all";
  const userId = searchParams.get("user") ?? "all";
  const branch = searchParams.get("branch") ?? "all";
  const preset = (searchParams.get("range") ?? "all") as Preset;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const ordering = searchParams.get("sort") ?? DEFAULT_ORDERING;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v === null || v === "") next.delete(k);
            else next.set(k, v);
          }
          if (!("page" in changes)) next.delete("page"); // any filter change goes back to page 1
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Debounced search: only write to the URL once the typed text has settled.
  const [searchInput, setSearchInput] = useState(q);
  const [selected, setSelected] = useState<CallRow | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  useEffect(() => {
    if (debouncedSearch === searchInput && debouncedSearch !== q) update({ q: debouncedSearch });
  }, [debouncedSearch, searchInput, q, update]);

  const usersQ = useUsers(1, 100);
  const branchesQ = useBranches(1, 100, "", isStaff);

  // Filters shared by the table now, and the summary cards and export later.
  const filters = useMemo(() => {
    const range = dateRange(preset, from, to);
    return {
      search: q || undefined,
      direction: direction === "all" ? undefined : (direction as CallDirection),
      created_by: userId === "all" ? undefined : Number(userId),
      branch_id: isStaff && branch !== "all" ? Number(branch) : undefined,
      call_timestamp__gte: range.gte,
      call_timestamp__lte: range.lte,
    };
  }, [q, direction, userId, branch, preset, from, to, isStaff]);

  const listParams: CallListParams = { ...filters, ordering, page, page_size: PAGE_SIZE };
  const callsQ = useCalls(listParams);
  const summaryQ = useCallSummary(filters);
  const exportCalls = useExportCalls();
  const s = summaryQ.data;
  const days = s?.by_day ?? [];
  const callers = s?.by_user ?? [];

  const rows = callsQ.data?.results ?? [];
  const count = callsQ.data?.count ?? 0;
  const firstRow = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, count);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const hasFilters = !!(q || direction !== "all" || userId !== "all" || branch !== "all" || preset !== "all");

  function onSort(field: string) {
    if (ordering === field) update({ sort: `-${field}` });
    else if (ordering === `-${field}`) update({ sort: field });
    else update({ sort: `-${field}` });
  }

  function clearFilters() {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
        <p className="text-muted-foreground mt-1 text-sm">Every call your counselors have logged.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-[13rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search lead, phone, caller or notes"
            className="rounded-full pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={direction} onValueChange={(v) => update({ direction: v === "all" ? null : v })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
          </SelectContent>
        </Select>
        <Select value={userId} onValueChange={(v) => update({ user: v === "all" ? null : v })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Logged by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            {(usersQ.data?.results ?? []).map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isStaff && (
          <Select value={branch} onValueChange={(v) => update({ branch: v === "all" ? null : v })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Branch" />
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
        <Select value={preset} onValueChange={(v) => update({ range: v === "all" ? null : v, from: null, to: null })}>
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
        {preset === "custom" && (
          <>
            <Input type="date" className="w-40" value={from} onChange={(e) => update({ from: e.target.value })} />
            <Input type="date" className="w-40" value={to} onChange={(e) => update({ to: e.target.value })} />
          </>
        )}
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          disabled={exportCalls.isPending}
          onClick={() => exportCalls.mutate(filters)}
        >
          {exportCalls.isPending ? <Loader2 className="animate-spin" /> : <Download />}
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total calls"
          value={String(s?.total_calls ?? 0)}
          hint={`${s?.inbound ?? 0} inbound · ${s?.outbound ?? 0} outbound`}
          loading={summaryQ.isLoading}
        />
        <StatCard label="Talk time" value={s?.total_formatted ?? "00:00:00"} loading={summaryQ.isLoading} />
        <StatCard
          label="Average duration"
          value={formatAvg(s?.avg_seconds ?? 0)}
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Connect rate"
          value={`${Math.round((s?.connect_rate ?? 0) * 100)}%`}
          hint={`${s?.connected_calls ?? 0} connected`}
          loading={summaryQ.isLoading}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="bg-card rounded-2xl border p-4">
          <p className="mb-1 text-sm font-semibold">Calls per day</p>
          {days.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No calls in this period.</p>
          ) : (
            <>
              <MiniBars values={days.map((d) => d.calls)} />
              <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                <span>{days[0].date}</span>
                <span>{days[days.length - 1].date}</span>
              </div>
            </>
          )}
        </div>
        <div className="bg-card rounded-2xl border p-4">
          <p className="mb-2 text-sm font-semibold">Top callers</p>
          {callers.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No calls in this period.</p>
          ) : (
            <HBarList data={callers.map((c) => ({ label: c.name, value: c.calls }))} />
          )}
        </div>
      </div>
      
      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="When" field="call_timestamp" ordering={ordering} onSort={onSort} />
                <TableHead>Direction</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Logged by</TableHead>
                <SortHead label="Duration" field="duration_seconds" ordering={ordering} onSort={onSort} />
                <TableHead>Outcome</TableHead>
                <TableHead>Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callsQ.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {callsQ.isError && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <p className="text-destructive text-sm">Could not load calls.</p>
                    <Button variant="outline" className="mt-3" onClick={() => void callsQ.refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {!callsQ.isLoading && !callsQ.isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <PhoneCall className="text-muted-foreground mx-auto size-8 opacity-40" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      {hasFilters ? "No calls match these filters." : "No calls yet."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(c.call_timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {c.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link to={`/leads/${c.lead}`} 
                    className="font-semibold hover:underline"
                    onClick={(e) => e.stopPropagation()}
                    >
                      {c.lead_name}
                    </Link>
                    <p className="text-muted-foreground font-mono text-xs">{c.lead_reference_number}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.phone_number || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.created_by_name || c.caller || "—"}</TableCell>
                  <TableCell className="font-mono tabular-nums">{c.duration_formatted}</TableCell>
                  <TableCell className="capitalize">{c.outcome || "—"}</TableCell>
                  <TableCell>
                    {c.recording_url ? (
                      <a
                        href={c.recording_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand inline-flex items-center gap-1 text-sm hover:underline"
                      >
                        Listen <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            {count === 0 ? "No calls" : `Showing ${firstRow}–${lastRow} of ${count}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
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
      </div>
      <CallDetailSheet call={selected} onClose={() => setSelected(null)} />
    </div>
  );
}