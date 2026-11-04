import { ArrowDown, ArrowUp, ArrowUpDown, Download, Phone, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HBarList, MiniBars } from "@/components/charts";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";
import { useBranches } from "@/hooks/use-branches";
import { useCallSummary, useCalls, useExportCalls } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { formatDateTime } from "@/lib/leads-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { CallDetailSheet, RecordingLink } from "@/pages/calls/call-detail-sheet";
import type { CallDirection, CallFilterParams, CallRow } from "@/types/calls";

const PAGE_SIZE = 20;
const DEFAULT_SORT = "-call_timestamp";
const SORTS = ["call_timestamp", "-call_timestamp", "duration_seconds", "-duration_seconds"];

type RangeKey = "all" | "today" | "7d" | "month" | "custom";
const RANGES: { value: RangeKey; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

const DIRECTION_TONE: Record<CallDirection, string> = {
  inbound: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  outbound: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

// Nepal is UTC+05:45 all year (no daylight saving), so days are cut at Nepal midnight.
const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

/** Start and end of the chosen days as ISO strings with the Nepal offset. */
function rangeBounds(range: RangeKey, from: string, to: string) {
  const today = ymd(new Date(Date.now() + NPT_OFFSET_MS));
  let a: string | undefined;
  let b: string | undefined;
  if (range === "today") {
    a = today;
    b = today;
  } else if (range === "7d") {
    a = addDays(today, -6);
    b = today;
  } else if (range === "month") {
    a = `${today.slice(0, 8)}01`;
    b = today;
  } else if (range === "custom") {
    a = from || undefined;
    b = to || undefined;
  }
  return {
    gte: a ? `${a}T00:00:00+05:45` : undefined,
    // .999 so a call at 23:59:59.5 is not lost on the last day
    lte: b ? `${b}T23:59:59.999+05:45` : undefined,
  };
}

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type SortField = "call_timestamp" | "duration_seconds";

function SortHead({
  field,
  label,
  ordering,
  onToggle,
}: {
  field: SortField;
  label: string;
  ordering: string;
  onToggle: (field: SortField) => void;
}) {
  const asc = ordering === field;
  const desc = ordering === `-${field}`;
  const Icon = asc ? ArrowUp : desc ? ArrowDown : ArrowUpDown;
  return (
    <TableHead aria-sort={asc ? "ascending" : desc ? "descending" : "none"}>
      <button
        type="button"
        className="hover:text-foreground inline-flex items-center gap-1 whitespace-nowrap"
        onClick={() => onToggle(field)}
      >
        {label}
        <Icon className={cn("size-3.5", !asc && !desc && "opacity-40")} />
      </button>
    </TableHead>
  );
}

/** Every day from the first to the last day with calls, so quiet days show as short bars. */
function fillDays(byDay: { date: string; calls: number }[]) {
  if (byDay.length === 0) return [];
  const first = byDay[0].date;
  const last = byDay[byDay.length - 1].date;
  const span = (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000;
  if (span > 90) return byDay; // too long to draw every day
  const counts = new Map(byDay.map((d) => [d.date, d.calls]));
  return Array.from({ length: span + 1 }, (_, i) => {
    const date = addDays(first, i);
    return { date, calls: counts.get(date) ?? 0 };
  });
}

function shortDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function Panel({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground mb-3 text-xs">{hint}</p>
      {children}
    </section>
  );
}

function NoCalls() {
  return <p className="text-muted-foreground py-6 text-center text-sm">No calls in this period.</p>;
}

function StatCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  loading: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="font-headline mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      )}
      <p className="text-muted-foreground mt-1 text-xs">{loading ? "\u00a0" : hint}</p>
    </div>
  );
}

export default function CallsPage() {
  const { isMock } = useDataSource();
  const { user: me } = useAuth();
  const isStaff = Boolean(me?.is_staff || me?.is_superuser);
  const [sp, setSp] = useSearchParams();

  // Everything the table shows lives in the URL, so a reload or a shared link gives the same view.
  const q = sp.get("q") ?? "";
  const dirParam = sp.get("direction");
  const direction: CallDirection | "" = dirParam === "inbound" || dirParam === "outbound" ? dirParam : "";
  const user = sp.get("user") ?? "";
  // Only staff can pick a branch; everyone else is already limited to their own by the backend.
  const branch = isStaff ? (sp.get("branch") ?? "") : "";
  const rangeParam = sp.get("range");
  const range: RangeKey = RANGES.some((r) => r.value === rangeParam) ? (rangeParam as RangeKey) : "all";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const sortParam = sp.get("sort") ?? DEFAULT_SORT;
  const ordering = SORTS.includes(sortParam) ? sortParam : DEFAULT_SORT;
  const page = Math.max(1, Number(sp.get("page")) || 1);

  const update = useCallback(
    (patch: Record<string, string | undefined>, resetPage = true) =>
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true },
      ),
    [setSp],
  );

  // The box shows what you type right away; the URL (and the request) follow 300 ms later.
  const [searchText, setSearchText] = useState(q);
  const debouncedText = useDebouncedValue(searchText);
  const pushedQ = useRef(q);
  useEffect(() => {
    if (q !== pushedQ.current) {
      pushedQ.current = q;
      setSearchText(q); // changed from outside, e.g. Clear filters or the back button
    }
  }, [q]);
  useEffect(() => {
    if (debouncedText !== pushedQ.current) {
      pushedQ.current = debouncedText;
      update({ q: debouncedText || undefined });
    }
  }, [debouncedText, update]);

  const branchesQ = useBranches(1, 100, "", isStaff);
  const branchOptions = (branchesQ.data?.results ?? []).map((b) => ({
    value: String(b.id),
    label: b.name,
  }));
  // Everyone who can log calls, narrowed to the chosen branch when there is one.
  const usersQ = useUsers(1, 100, "", branch ? Number(branch) : undefined);
  const userOptions = (usersQ.data?.results ?? []).map((u) => ({
    value: String(u.id),
    label: u.name,
  }));

  const filters = useMemo<CallFilterParams>(() => {
    const { gte, lte } = rangeBounds(range, from, to);
    return {
      search: q || undefined,
      direction: direction || undefined,
      created_by: user ? Number(user) : undefined,
      branch_id: branch ? Number(branch) : undefined,
      call_timestamp__gte: gte,
      call_timestamp__lte: lte,
    };
  }, [q, direction, user, branch, range, from, to]);

  const callsQ = useCalls({ ...filters, page, page_size: PAGE_SIZE, ordering });
  const summaryQ = useCallSummary(filters);
  const exportCalls = useExportCalls();
  const [selected, setSelected] = useState<CallRow | null>(null);

  const rows = callsQ.data?.results ?? [];
  const count = callsQ.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const firstShown = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(count, page * PAGE_SIZE);
  const hasFilters = Boolean(q || direction || user || branch || range !== "all");
  const summary = summaryQ.data;
  const days = fillDays(summary?.by_day ?? []);
  const busiest = days.reduce((best, d) => (d.calls > best.calls ? d : best), days[0] ?? { date: "", calls: 0 });
  const callers = (summary?.by_user ?? []).map((u) => ({ label: u.name, value: u.calls }));

  function toggleSort(field: SortField) {
    update({ sort: ordering === field ? `-${field}` : field });
  }

  function clearFilters() {
    setSearchText("");
    pushedQ.current = "";
    setSp({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every call your team has logged, across all leads.{isMock && " Switch to Live to see real calls."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportCalls.mutate(filters)}
          disabled={exportCalls.isPending || count === 0}
        >
          {exportCalls.isPending ? (
            <span
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              role="status"
              aria-label="Preparing file"
            />
          ) : (
            <Download />
          )}
          {exportCalls.isPending ? "Preparing…" : "Export CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total calls"
          value={String(summary?.total_calls ?? 0)}
          hint={`${summary?.inbound ?? 0} inbound · ${summary?.outbound ?? 0} outbound`}
          loading={summaryQ.isPending}
        />
        <StatCard
          label="Talk time"
          value={summary?.total_formatted ?? "00:00:00"}
          hint="Total across matching calls"
          loading={summaryQ.isPending}
        />
        <StatCard
          label="Average duration"
          value={formatMMSS(summary?.avg_seconds ?? 0)}
          hint="Minutes and seconds per call"
          loading={summaryQ.isPending}
        />
        <StatCard
          label="Connect rate"
          value={`${((summary?.connect_rate ?? 0) * 100).toFixed(1)}%`}
          hint={`${summary?.connected_calls ?? 0} of ${summary?.total_calls ?? 0} lasted over 0 sec`}
          loading={summaryQ.isPending}
        />
      </div>
      {summaryQ.isError && (
        <p className="text-destructive text-sm" role="alert">
          Could not load the totals.{" "}
          <button type="button" className="underline" onClick={() => void summaryQ.refetch()}>
            Retry
          </button>
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Calls per day"
          hint={days.length > 0 ? `Busiest: ${shortDay(busiest.date)} with ${busiest.calls} calls` : "Days are counted in Nepal time"}
        >
          {summaryQ.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : days.length === 0 ? (
            <NoCalls />
          ) : (
            <div
              role="img"
              aria-label={`Calls per day from ${shortDay(days[0].date)} to ${shortDay(days[days.length - 1].date)}. Busiest day ${shortDay(busiest.date)} with ${busiest.calls} calls.`}
            >
              <MiniBars values={days.map((d) => d.calls)} />
              <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                <span>{shortDay(days[0].date)}</span>
                <span>{shortDay(days[days.length - 1].date)}</span>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Top callers" hint="By number of calls, top 10">
          {summaryQ.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : callers.length === 0 ? (
            <NoCalls />
          ) : (
            <HBarList data={callers} />
          )}
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-[13rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            aria-label="Search calls"
            placeholder="Search lead, phone, caller or notes"
            className="rounded-full pl-9"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        {isStaff && (
          <Select
            value={branch || "all"}
            onValueChange={(v) => update({ branch: v === "all" ? undefined : v, user: undefined })}
          >
            <SelectTrigger className="w-44" aria-label="Branch">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branchOptions.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={direction || "all"}
          onValueChange={(v) => update({ direction: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-36" aria-label="Direction">
            <SelectValue placeholder="All directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <Select value={user || "all"} onValueChange={(v) => update({ user: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-44" aria-label="Logged by">
            <SelectValue placeholder="Logged by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Anyone</SelectItem>
            {userOptions.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={range}
          onValueChange={(v) =>
            update({
              range: v === "all" ? undefined : v,
              ...(v === "custom" ? {} : { from: undefined, to: undefined }),
            })
          }
        >
          <SelectTrigger className="w-40" aria-label="Date range">
            <SelectValue placeholder="All dates" />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {range === "custom" && (
          <>
            <Input
              type="date"
              aria-label="From date"
              className="w-40"
              value={from}
              onChange={(e) => update({ from: e.target.value || undefined })}
            />
            <Input
              type="date"
              aria-label="To date"
              className="w-40"
              value={to}
              onChange={(e) => update({ to: e.target.value || undefined })}
            />
          </>
        )}
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead field="call_timestamp" label="When" ordering={ordering} onToggle={toggleSort} />
                <TableHead>Direction</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Logged by</TableHead>
                <SortHead field="duration_seconds" label="Duration" ordering={ordering} onToggle={toggleSort} />
                <TableHead>Outcome</TableHead>
                <TableHead>Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callsQ.isPending &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {callsQ.isError && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center" role="alert">
                    <p className="text-destructive text-sm">Could not load calls.</p>
                    <Button variant="outline" className="mt-3" onClick={() => void callsQ.refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {!callsQ.isPending && !callsQ.isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <Phone className="text-muted-foreground mx-auto size-8 opacity-40" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      {hasFilters ? "No calls match these filters." : "No calls yet. Logged calls will show up here."}
                    </p>
                    {hasFilters && (
                      <Button variant="outline" className="mt-3" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <TableRow
                  key={c.id}
                  tabIndex={0}
                  className="focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                  onClick={() => setSelected(c)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return; // ignore keys pressed on the links inside
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(c);
                    }
                  }}
                >
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(c.call_timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("capitalize", DIRECTION_TONE[c.direction])}>
                      {c.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/leads/${c.lead}`}
                      className="font-semibold hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.lead_name}
                    </Link>
                    <p className="text-muted-foreground font-mono text-xs">{c.lead_reference_number}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{c.phone_number || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.created_by_name || "—"}</TableCell>
                  <TableCell className="tabular-nums">{c.duration_formatted}</TableCell>
                  <TableCell className="capitalize">{c.outcome || "—"}</TableCell>
                  <TableCell>
                    <RecordingLink url={c.recording_url} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          {count === 0 ? "No calls to show" : `Showing ${firstShown}–${lastShown} of ${count}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) }, false)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground tabular-nums">
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => update({ page: String(page + 1) }, false)}
          >
            Next
          </Button>
        </div>
      </div>

      <CallDetailSheet call={selected} onClose={() => setSelected(null)} />
    </div>
  );
}