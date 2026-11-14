import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Clock, Download, Loader2, PhoneCall, PhoneIncoming, Search, Signal, Timer, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HBarList } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";
import { CALL_OUTCOMES } from "@/data/lead-lookups";
import { useBranches } from "@/hooks/use-branches";
import { useCalls, useCallsSummary, useExportCalls } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api";
import { formatMMSS, formatTalkTime } from "@/lib/call-duration";
import { formatDateTime } from "@/lib/leads-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { CallDetailSheet } from "@/pages/calls/call-detail-sheet";
import { PAGE_SIZE, type DatePreset, useCallsUrlState } from "@/pages/calls/url-state";
import type { ApiGlobalCall } from "@/types/calls";

const OUTCOME_LABEL = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.value, o.label]));
const DAY_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function Kpi({ label, value, sub, icon: Icon, loading }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; loading: boolean;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="flex-row items-center justify-between">
        <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">{label}</CardDescription>
        <Icon className="text-brand size-4" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20" /> : <p className="font-headline text-2xl font-semibold tabular-nums">{value}</p>}
        {sub && !loading && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SortHead({ label, field, sort, onSort, className }: {
  label: string; field: string; sort: string; onSort: (s: string) => void; className?: string;
}) {
  const active = sort.replace("-", "") === field;
  const desc = sort.startsWith("-");
  return (
    <TableHead className={className} aria-sort={active ? (desc ? "descending" : "ascending") : "none"}>
      <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => onSort(active && desc ? field : `-${field}`)}>
        {label}
        {active && (desc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />)}
      </button>
    </TableHead>
  );
}

export default function CallsPage() {
  const { user } = useAuth();
  const { isMock } = useDataSource();
  const isStaff = !!(user?.is_staff || user?.is_superuser);
  const { state, update, clear, hasFilters, filterParams } = useCallsUrlState();
  const [search, setSearch] = useState(state.q);
  const debounced = useDebouncedValue(search, 350);
  const [userSearch, setUserSearch] = useState("");
  const [selected, setSelected] = useState<ApiGlobalCall | null>(null);

  useEffect(() => {
    if (debounced !== state.q) update({ q: debounced });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setSearch(state.q), [state.q]);

  const listQ = useCalls({ ...filterParams, ordering: state.sort, page: state.page, page_size: PAGE_SIZE });
  const summaryQ = useCallsSummary(filterParams);
  const exportCalls = useExportCalls();
  const usersQ = useUsers(1, 20, userSearch);
  const branchesQ = useBranches(1, 100, "", isStaff && !isMock);

  const rows = listQ.data?.results ?? [];
  const count = listQ.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = (state.page - 1) * PAGE_SIZE;
  const s = summaryQ.data;
  const sLoading = summaryQ.isLoading;
  const userOptions = (usersQ.data?.results ?? []).map((u) => ({ value: String(u.id), label: u.name }));
  const maxDay = Math.max(1, ...(s?.per_day ?? []).map((d) => d.count));

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every call your team logged{isStaff ? " across branches" : " in your branch"}. Days are Nepal time.
            {isMock && " Switch to the live API to see calls."}
          </p>
        </div>
        <Button variant="outline" disabled={exportCalls.isPending || isMock} onClick={() => exportCalls.mutate({ ...filterParams, ordering: state.sort })}>
          {exportCalls.isPending ? <Loader2 className="animate-spin" /> : <Download />} Export CSV
        </Button>
      </div>

      {/* US-1: totals for the current filters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total calls" icon={PhoneCall} loading={sLoading} value={String(s?.total_calls ?? 0)}
          sub={`${s?.inbound_calls ?? 0} inbound · ${s?.outbound_calls ?? 0} outbound`} />
        <Kpi label="Talk time" icon={Clock} loading={sLoading} value={formatTalkTime(s?.talk_time_seconds ?? 0)} />
        <Kpi label="Avg duration" icon={Timer} loading={sLoading} value={formatMMSS(s?.avg_duration_seconds ?? 0)} />
        <Kpi label="Connect rate" icon={Signal} loading={sLoading} value={`${s?.connect_rate ?? 0}%`}
          sub={`${s?.connected_calls ?? 0} lasted over 0 sec`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Calls per day</CardTitle></CardHeader>
          <CardContent>
            {!s?.per_day.length ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No calls in this range.</p>
            ) : (
              <div className="flex h-36 items-end gap-1 overflow-x-auto pt-2" role="img" aria-label="Calls per day">
                {s.per_day.map((d) => (
                  <div key={d.date} className="flex h-full min-w-3 flex-1 flex-col justify-end" title={`${DAY_FMT.format(new Date(d.date))}: ${d.count}`}>
                    <span className="bg-brand rounded-t" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 4 : 1 }} />
                  </div>
                ))}
              </div>
            )}
            {!!s?.per_day.length && (
              <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                <span>{DAY_FMT.format(new Date(s.per_day[0].date))}</span>
                <span>{DAY_FMT.format(new Date(s.per_day[s.per_day.length - 1].date))}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top callers</CardTitle></CardHeader>
          <CardContent>
            {!s?.top_callers.length ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No callers yet.</p>
            ) : (
              <HBarList data={s.top_callers.map((c) => ({ label: c.name, value: c.calls }))} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* US-2: filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input placeholder="Search lead, phone, caller or notes" className="rounded-full pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={state.direction} onValueChange={(v) => update({ direction: v })}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
          </SelectContent>
        </Select>
        <Combobox className="w-44" value={state.user} onChange={(v) => update({ user: v })} options={userOptions}
          onSearchChange={setUserSearch} loading={usersQ.isFetching} placeholder="Logged by: anyone" searchPlaceholder="Search users…" />
        <Select value={state.preset} onValueChange={(v) => update({ preset: v, from: "", to: "" })}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {state.preset === ("custom" satisfies DatePreset) && (
          <>
            <Input type="date" aria-label="From" className="w-40" value={state.from} onChange={(e) => update({ from: e.target.value })} />
            <Input type="date" aria-label="To" className="w-40" value={state.to} onChange={(e) => update({ to: e.target.value })} />
          </>
        )}
        {isStaff && (
          <Select value={state.branch || "all"} onValueChange={(v) => update({ branch: v })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {(branchesQ.data?.results ?? []).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button variant="ghost" onClick={() => { setSearch(""); clear(); }}>
            <X /> Clear filters
          </Button>
        )}
      </div>

      <div className="bg-card min-w-0 overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="When" field="call_timestamp" sort={state.sort} onSort={(v) => update({ sort: v })} />
              <TableHead>Direction</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Logged by</TableHead>
              <SortHead label="Duration" field="duration_seconds" sort={state.sort} onSort={(v) => update({ sort: v })} className="text-right" />
              <TableHead>Outcome</TableHead>
              <TableHead>Recording</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
            {listQ.isError && (
              <TableRow>
                <TableCell colSpan={8} className="py-14 text-center">
                  <p className="text-destructive text-sm">{apiErrorMessage(listQ.error, "Could not load calls")}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => void listQ.refetch()}>Retry</Button>
                </TableCell>
              </TableRow>
            )}
            {!listQ.isLoading && !listQ.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-14 text-center">
                  <PhoneIncoming className="text-muted-foreground mx-auto size-8 opacity-40" />
                  <p className="text-muted-foreground mt-2 text-sm">
                    {hasFilters ? "No calls match these filters." : "No calls yet. Calls logged on a lead show up here."}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {!listQ.isError && rows.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateTime(c.call_timestamp)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn("capitalize", c.direction === "inbound" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>
                    {c.direction}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Link to={`/leads/${c.lead}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>{c.lead_name}</Link>
                  <span className="text-muted-foreground block font-mono text-xs">{c.lead_reference_number}</span>
                </TableCell>
                <TableCell className="font-mono text-xs whitespace-nowrap">{c.phone_number || "—"}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">{c.created_by_name || "—"}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatMMSS(c.duration_seconds)}</TableCell>
                <TableCell className="whitespace-nowrap">{c.outcome ? OUTCOME_LABEL[c.outcome] ?? c.outcome : "—"}</TableCell>
                <TableCell>
                  {c.recording_url ? (
                    <a href={c.recording_url} target="_blank" rel="noreferrer" className="text-brand hover:underline" onClick={(e) => e.stopPropagation()}>Listen</a>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-muted-foreground text-sm">
            {count === 0 ? "No calls" : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, count)} of ${count}`}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={state.page <= 1} onClick={() => update({ page: state.page - 1 })}>
              <ChevronLeft /> Previous
            </Button>
            <span className="text-muted-foreground px-3 text-sm">Page {state.page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={state.page >= totalPages} onClick={() => update({ page: state.page + 1 })}>
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <CallDetailSheet call={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
