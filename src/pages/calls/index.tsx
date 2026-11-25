import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Download, ExternalLink, PhoneCall, RefreshCw, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBranches } from "@/hooks/use-branches";
import { useCalls, useCallsSummary } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { callsService, type CallsParams } from "@/services/calls.service";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const PAGE_SIZE = 20;
const NPT_PARTS = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" });
const dateString = (d: Date) => {
  const parts = Object.fromEntries(NPT_PARTS.formatToParts(d).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const formatNptDateTime = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value));
const formatCallClock = (seconds: number | null | undefined) => {
  const value = Math.max(0, seconds ?? 0);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
};
const formatCallTime = (seconds: number | null | undefined) => {
  const value = Math.max(0, seconds ?? 0);
  return `${Math.floor(value / 60)} min ${String(value % 60).padStart(2, "0")} sec`;
};
const nptBounds = (from: string, to: string) => ({
  ...(from ? { call_timestamp__gte: from } : {}),
  ...(to ? { call_timestamp__lte: to } : {}),
});

function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => ({
    search: searchParams.get("search") ?? "", direction: searchParams.get("direction") ?? "all",
    created_by: searchParams.get("created_by") ?? "all", branch_id: searchParams.get("branch_id") ?? "all",
    range: searchParams.get("range") ?? "", from: searchParams.get("from") ?? "", to: searchParams.get("to") ?? "",
    ordering: searchParams.get("ordering") ?? "-call_timestamp", page: Math.max(1, Number(searchParams.get("page") ?? 1)),
  }), [searchParams]);
  const set = useCallback((key: string, value: string, resetPage = true) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value); else next.delete(key);
    if (resetPage && key !== "page") next.delete("page");
    return next;
  }), [setSearchParams]);
  return { state, set, clear: () => setSearchParams({}) };
}

export default function CallsPage() {
  const { state, set, clear } = useUrlState();
  const [searchDraft, setSearchDraft] = useState(state.search);
  const [selected, setSelected] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const clearDateParams = (range: string) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    next.delete("from"); next.delete("to"); next.delete("page");
    if (range) next.set("range", range); else next.delete("range");
    return next;
  });
  const branches = useBranches(1, 100);
  const users = useUsers(1, 100, "");
  useEffect(() => { const timer = window.setTimeout(() => set("search", searchDraft), 300); return () => window.clearTimeout(timer); }, [searchDraft, set]);
  useEffect(() => setSearchDraft(state.search), [state.search]);
  const dates = useMemo(() => {
    const now = new Date(); const today = dateString(now);
    if (state.range === "today") return { from: today, to: today };
    if (state.range === "7d") { const [year, month, day] = today.split("-").map(Number); const from = new Date(Date.UTC(year, month - 1, day - 6)); return { from: from.toISOString().slice(0, 10), to: today }; }
    if (state.range === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
    return { from: state.from, to: state.to };
  }, [state.range, state.from, state.to]);
  const filters = useMemo<CallsParams>(() => ({
    ...(state.search ? { search: state.search } : {}), ...(state.direction !== "all" ? { direction: state.direction as "inbound" | "outbound" } : {}),
    ...(state.created_by !== "all" ? { created_by: Number(state.created_by) } : {}),
    ...(state.branch_id !== "all" ? { branch_id: Number(state.branch_id) } : {}),
    ...nptBounds(dates.from, dates.to),
  }), [state.search, state.direction, state.created_by, state.branch_id, dates]);
  const params = useMemo(() => ({ ...filters, page: state.page, page_size: PAGE_SIZE, ordering: state.ordering }), [filters, state.page, state.ordering]);
  const calls = useCalls(params);
  const summary = useCallsSummary(filters);
  const rows = calls.data?.results ?? [];
  const total = calls.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const active = Boolean(state.search || state.direction !== "all" || state.created_by !== "all" || state.branch_id !== "all" || dates.from || dates.to);
  const detail = rows.find((row) => row.id === selected);
  const toggleSort = (field: "call_timestamp" | "duration_seconds") => set("ordering", state.ordering === field ? `-${field}` : field, false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await callsService.exportCsv(filters); const href = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = href; anchor.download = `calls-${dateString(new Date())}.csv`; anchor.click(); URL.revokeObjectURL(href);
    } finally { setExporting(false); }
  };
  const rangePreset = (value: string) => {
    clearDateParams(value === "custom" ? "" : value);
  };
  const setCustom = (field: "from" | "to", value: string) => {
    clearDateParams("");
    set(field, value);
  };

  return <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
    <header><p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p><h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1><p className="text-muted-foreground mt-1 text-sm">Call activity across your branch scope.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["Total calls", summary.data?.total_calls], ["Talk time", summary.data ? formatCallTime(summary.data.talk_seconds) : undefined], ["Average duration", summary.data ? formatCallTime(summary.data.average_duration_seconds) : undefined], ["Connect rate", summary.data ? `${summary.data.connect_rate}%` : undefined]].map(([label, value]) => <div className="bg-card rounded-xl border p-4" key={String(label)}><p className="text-muted-foreground text-xs">{label}</p><p className="font-headline mt-1 text-2xl font-semibold tabular-nums">{value ?? <Skeleton className="mt-2 h-7 w-20" />}</p>{label === "Total calls" && summary.data && <p className="text-muted-foreground mt-1 text-xs">{summary.data.inbound_calls} inbound · {summary.data.outbound_calls} outbound</p>}</div>)}
    </section>
    <section className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
      <div className="bg-card rounded-xl border p-4"><h2 className="mb-4 font-semibold">Calls per day</h2>{summary.isLoading ? <Skeleton className="h-36 w-full" /> : !summary.data?.calls_per_day.length ? <p className="text-muted-foreground flex h-32 items-center justify-center text-sm">No calls in this date range.</p> : <div className="flex h-36 items-end gap-2 overflow-x-auto">{summary.data.calls_per_day.map((day) => { const max = Math.max(1, ...summary.data!.calls_per_day.map((x) => x.count)); return <div key={day.date} className="flex min-w-7 flex-1 flex-col items-center justify-end gap-1"><span className="text-muted-foreground text-[10px]">{day.count}</span><div className="bg-brand/80 w-full min-w-3 rounded-t" style={{ height: `${Math.max(5, 100 * day.count / max)}px` }} /><span className="text-muted-foreground text-[10px]">{day.date.slice(5)}</span></div>; })}</div>}</div>
      <div className="bg-card rounded-xl border p-4"><h2 className="mb-4 font-semibold">Top callers</h2>{summary.isLoading ? <Skeleton className="h-36 w-full" /> : !summary.data?.top_callers.length ? <p className="text-muted-foreground flex h-32 items-center justify-center text-sm">No callers to show.</p> : <div className="space-y-3">{summary.data.top_callers.map((c, i) => <div key={c.caller} className="flex items-center gap-3 text-sm"><span className="text-muted-foreground w-5">{i + 1}.</span><span className="min-w-0 flex-1 truncate">{c.caller}</span><span className="font-semibold tabular-nums">{c.total}</span></div>)}</div>}</div>
    </section>
    <section className="bg-card space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2"><div className="relative min-w-[13rem] flex-1"><Search className="text-muted-foreground absolute top-2.5 left-3 size-4"/><Input className="pl-9" placeholder="Search lead, phone, caller or notes" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} /></div>
        <Select value={state.direction} onValueChange={(v) => set("direction", v === "all" ? "" : v)}><SelectTrigger className="w-36"><SelectValue placeholder="Direction"/></SelectTrigger><SelectContent><SelectItem value="all">All directions</SelectItem><SelectItem value="inbound">Inbound</SelectItem><SelectItem value="outbound">Outbound</SelectItem></SelectContent></Select>
        <Select value={state.created_by} onValueChange={(v) => set("created_by", v === "all" ? "" : v)}><SelectTrigger className="w-44"><SelectValue placeholder="Logged by"/></SelectTrigger><SelectContent><SelectItem value="all">All callers</SelectItem>{(users.data?.results ?? []).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent></Select>
        <Select value={state.branch_id} onValueChange={(v) => set("branch_id", v === "all" ? "" : v)}><SelectTrigger className="w-40"><SelectValue placeholder="Branch"/></SelectTrigger><SelectContent><SelectItem value="all">All branches</SelectItem>{(branches.data?.results ?? []).map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent></Select>
        <Select value={state.range || "custom"} onValueChange={rangePreset}><SelectTrigger className="w-40"><SelectValue placeholder="Date range"/></SelectTrigger><SelectContent><SelectItem value="custom">Custom range</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="7d">Last 7 days</SelectItem><SelectItem value="month">This month</SelectItem></SelectContent></Select>
        <Input aria-label="From date" type="date" className="w-36" value={dates.from} onChange={(e) => setCustom("from", e.target.value)} /><Input aria-label="To date" type="date" className="w-36" value={dates.to} onChange={(e) => setCustom("to", e.target.value)} />
        {active && <Button variant="ghost" onClick={() => { clear(); setSearchDraft(""); }}>Clear filters</Button>}
        <Button variant="outline" className="ml-auto" disabled={exporting || calls.isError} onClick={() => void exportCsv()}><Download/>{exporting ? "Preparing…" : "Export CSV"}</Button>
      </div>
      {calls.isError ? <div className="text-destructive flex flex-col items-center gap-3 py-12"><AlertCircle/><p>Calls could not be loaded.</p><Button variant="outline" onClick={() => void calls.refetch()}><RefreshCw/>Retry</Button></div> : calls.isLoading ? <div className="space-y-2">{Array.from({length: 5}, (_, i) => <Skeleton key={i} className="h-12 w-full"/>)}</div> : rows.length === 0 ? <div className="text-muted-foreground flex flex-col items-center gap-2 py-14 text-sm"><PhoneCall/><p>{active ? "No calls match these filters." : "No calls yet."}</p></div> : <>
        <div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead><button className="inline-flex items-center gap-1" onClick={() => toggleSort("call_timestamp")}>When {state.ordering.includes("call_timestamp") && (state.ordering.startsWith("-") ? <ArrowDown className="size-3"/> : <ArrowUp className="size-3"/>)}</button></TableHead><TableHead>Direction</TableHead><TableHead>Lead</TableHead><TableHead>Phone</TableHead><TableHead>Logged by</TableHead><TableHead><button className="inline-flex items-center gap-1" onClick={() => toggleSort("duration_seconds")}>Duration {state.ordering.includes("duration_seconds") && (state.ordering.startsWith("-") ? <ArrowDown className="size-3"/> : <ArrowUp className="size-3"/>)}</button></TableHead><TableHead>Outcome</TableHead><TableHead>Recording</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row.id)}><TableCell>{formatNptDateTime(row.call_timestamp)} <span className="text-muted-foreground text-[10px]">NPT</span></TableCell><TableCell className="capitalize">{row.direction}</TableCell><TableCell><Link className="text-brand hover:underline" to={`/leads/${row.lead}`} onClick={(e) => e.stopPropagation()}>{row.lead_name}<span className="text-muted-foreground ml-1 text-xs">{row.lead_reference_number}</span></Link></TableCell><TableCell>{row.phone_number || "—"}</TableCell><TableCell>{row.created_by_name || row.caller || "—"}</TableCell><TableCell>{formatCallClock(row.duration_seconds)}</TableCell><TableCell>{row.outcome || "—"}</TableCell><TableCell>{row.recording_url ? <a href={row.recording_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-brand inline-flex items-center gap-1">Open <ExternalLink className="size-3"/></a> : "—"}</TableCell></TableRow>)}</TableBody></Table></div>
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-sm"><span>Showing {(state.page - 1) * PAGE_SIZE + 1}–{Math.min(state.page * PAGE_SIZE, total)} of {total}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={state.page <= 1} onClick={() => set("page", String(state.page - 1), false)}>Previous</Button><Button size="sm" variant="outline" disabled={state.page >= pages} onClick={() => set("page", String(state.page + 1), false)}>Next</Button></div></div>
      </>}
    </section>
    <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}><SheetContent><SheetHeader><SheetTitle>Call details</SheetTitle><SheetDescription>{detail?.lead_name ?? "Call record"}</SheetDescription></SheetHeader>{detail && <SheetBody className="space-y-5"><Link className="text-brand inline-flex items-center gap-1 text-sm" to={`/leads/${detail.lead}`}>Open lead <ExternalLink className="size-3"/></Link><dl className="grid grid-cols-1 gap-4 text-sm">{[["Date and time (NPT)", formatNptDateTime(detail.call_timestamp)], ["Direction", detail.direction], ["Lead", `${detail.lead_name} · ${detail.lead_reference_number}`], ["Phone", detail.phone_number], ["Caller", detail.caller], ["Logged by", detail.created_by_name], ["Duration", formatCallClock(detail.duration_seconds)], ["Outcome", detail.outcome || "—"], ["Notes", detail.notes || "—"], ["Next action", detail.next_action || "—"], ["Next follow-up", detail.next_followup_at ? formatNptDateTime(detail.next_followup_at) : "—"]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground text-xs">{label}</dt><dd className="mt-1 whitespace-pre-wrap">{value}</dd></div>)}</dl>{detail.recording_url && <a className="text-brand inline-flex items-center gap-2" href={detail.recording_url} target="_blank" rel="noreferrer">Open recording <ExternalLink className="size-4"/></a>}</SheetBody>}</SheetContent></Sheet>
  </div>;
}
