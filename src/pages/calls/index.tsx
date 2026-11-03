import { ArrowDown, ArrowUp, Download, LoaderCircle, Phone, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { HBarList, MiniBars } from "@/components/charts";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { useCallSummary } from "@/hooks/use-call-summary";
import { useCalls } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { callsService } from "@/services/calls.service";
import type { CallParams, CallRecord } from "@/types/calls";

const PAGE_SIZE = 20;
type DatePreset = "all" | "today" | "last7" | "month" | "custom";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localBoundary(date: string, endOfDay: boolean) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  const offsetMinutes = -value.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offset = Math.abs(offsetMinutes);
  const time = endOfDay ? "23:59:59.999999" : "00:00:00.000000";
  return `${date}T${time}${sign}${String(Math.floor(offset / 60)).padStart(2, "0")}:${String(offset % 60).padStart(2, "0")}`;
}

function presetBounds(preset: Exclude<DatePreset, "all" | "custom">) {
  const today = new Date();
  const end = dateKey(today);
  if (preset === "today") return { from: end, to: end };
  if (preset === "last7") {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    return { from: dateKey(start), to: end };
  }
  return { from: dateKey(new Date(today.getFullYear(), today.getMonth(), 1)), to: end };
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

function CallDetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1 border-b pb-3 last:border-b-0">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div className="break-words text-sm">{children || "—"}</div>
    </div>
  );
}

function SortableHeader({
  label,
  field,
  ordering,
  onSort,
}: {
  label: string;
  field: "call_timestamp" | "duration_seconds";
  ordering: string;
  onSort: (field: "call_timestamp" | "duration_seconds") => void;
}) {
  const active = ordering.replace(/^-/, "") === field;
  const descending = ordering.startsWith("-");
  return (
    <TableHead>
      <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => onSort(field)}>
        {label}
        {active && (descending ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />)}
      </button>
    </TableHead>
  );
}

export default function CallsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const staff = Boolean(currentUser?.is_staff || currentUser?.is_superuser);
  const searchFromUrl = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const observedUrlSearch = useRef(searchFromUrl);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const direction = searchParams.get("direction") ?? "all";
  const createdBy = searchParams.get("created_by") ?? "";
  const branchId = searchParams.get("branch_id") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const datePreset = (searchParams.get("range") ?? (from || to ? "custom" : "all")) as DatePreset;
  const ordering = searchParams.get("ordering") ?? "-call_timestamp";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);

  const updateParams = useCallback((changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
    });
    if (resetPage) next.delete("page");
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    // URL navigation (including Clear Filters and browser back/forward) is the
    // source of truth. Sync the field and skip applying any pending old value.
    if (searchFromUrl !== observedUrlSearch.current) {
      observedUrlSearch.current = searchFromUrl;
      setSearchInput(searchFromUrl);
      return;
    }
    // Only commit a settled input value. updateParams resets pagination, and
    // list queries are driven exclusively by URL parameters.
    if (searchInput !== debouncedSearch || debouncedSearch === searchFromUrl) return;
    updateParams({ search: debouncedSearch.trim() || null });
  }, [debouncedSearch, searchFromUrl, searchInput, updateParams]);

  const directionValue = direction === "inbound" || direction === "outbound" ? direction : undefined;
  const filters: CallParams = useMemo(() => ({
    search: searchFromUrl || undefined,
    direction: directionValue,
    created_by: createdBy ? Number(createdBy) : undefined,
    branch_id: staff && branchId ? Number(branchId) : undefined,
    "call_timestamp__gte": from ? localBoundary(from, false) : undefined,
    "call_timestamp__lte": to ? localBoundary(to, true) : undefined,
  }), [searchFromUrl, directionValue, createdBy, staff, branchId, from, to]);
  const listParams: CallParams = { ...filters, ordering, page, page_size: PAGE_SIZE };
  const calls = useCalls(listParams);
  const hasFilters = Boolean(searchFromUrl || directionValue || createdBy || (staff && branchId) || from || to);
  const allCalls = useCalls({ page: 1, page_size: 1 }, hasFilters && calls.data?.count === 0);
  const summary = useCallSummary(filters);
  const users = useUsers(1, 100);
  const branches = useBranches(1, 100, "", staff);
  const userOptions = useMemo(
    () => (users.data?.results ?? []).map((user) => ({ value: String(user.id), label: user.name })),
    [users.data],
  );
  const branchOptions = useMemo(
    () => (branches.data?.results ?? []).map((branch) => ({ value: String(branch.id), label: branch.name })),
    [branches.data],
  );
  const data = summary.data;
  const cards = [
    { label: "Total calls", value: data?.total_calls ?? 0, detail: `${data?.inbound ?? 0} inbound · ${data?.outbound ?? 0} outbound` },
    { label: "Talk time", value: data?.total_formatted ?? "00:00:00", detail: "Combined call duration" },
    { label: "Average duration", value: formatDuration(data?.avg_seconds ?? 0), detail: "Per call" },
    { label: "Connect rate", value: `${((data?.connect_rate ?? 0) * 100).toFixed(1)}%`, detail: `${data?.connected_calls ?? 0} connected calls` },
  ];

  function setDatePreset(value: DatePreset) {
    if (value === "all") {
      updateParams({ range: null, from: null, to: null });
    } else if (value === "custom") {
      updateParams({ range: "custom" });
    } else {
      updateParams({ range: value, ...presetBounds(value) });
    }
  }

  function sortBy(field: "call_timestamp" | "duration_seconds") {
    const nextOrder = ordering === field ? `-${field}` : field;
    updateParams({ ordering: nextOrder });
  }

  function clearFilters() {
    observedUrlSearch.current = "";
    setSearchInput("");
    setSearchParams({});
  }

  async function exportCalls() {
    setIsExporting(true);
    try {
      const blob = await callsService.export({ ...filters, ordering });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      link.href = url;
      link.download = `calls-${dateKey(now)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not export calls"));
    } finally {
      setIsExporting(false);
    }
  }

  const startRow = calls.data?.count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endRow = Math.min(page * PAGE_SIZE, calls.data?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil((calls.data?.count ?? 0) / PAGE_SIZE));

  function openCallFromKeyboard(event: KeyboardEvent<HTMLTableRowElement>, call: CallRecord) {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    setSelectedCall(call);
  }

  const followUpAt = selectedCall?.next_followup_at
    ? new Date(selectedCall.next_followup_at).toLocaleString("en-GB", {
        dateStyle: "full", timeStyle: "long", timeZone: "Asia/Kathmandu",
      })
    : "—";
  const callTimestamp = selectedCall
    ? new Date(selectedCall.call_timestamp).toLocaleString("en-GB", {
        dateStyle: "full", timeStyle: "long", timeZone: "Asia/Kathmandu",
      })
    : "—";

  return (
    <main className="min-w-0 space-y-6">
      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
        <p className="text-muted-foreground mt-1 text-sm">Team calling activity across leads.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-card rounded-2xl border p-4">
            <p className="text-muted-foreground text-sm">{card.label}</p>
            {summary.isLoading ? <Skeleton className="mt-2 h-8 w-28" /> : <p className="font-headline mt-2 text-2xl font-semibold tabular-nums">{card.value}</p>}
            <p className="text-muted-foreground mt-1 text-xs">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="font-semibold">Calls per day</h2>
          {summary.isLoading ? <Skeleton className="mt-4 h-24 w-full" /> : data?.by_day.length ? <>
            <MiniBars values={data.by_day.map((day) => day.calls)} />
            <div className="text-muted-foreground mt-2 flex justify-between gap-1 overflow-hidden text-[10px]">
              {data.by_day.map((day) => <span key={day.date}>{day.date.slice(5)}</span>)}
            </div>
          </> : <p className="text-muted-foreground py-10 text-center text-sm">No calls for these filters.</p>}
        </section>
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="font-semibold">Top callers</h2>
          {summary.isLoading ? <div className="mt-4 space-y-3">{[1, 2, 3].map((x) => <Skeleton key={x} className="h-8 w-full" />)}</div> : data?.by_user.length ? <div className="mt-4"><HBarList data={data.by_user.map((user) => ({ label: user.name, value: user.calls }))} /></div> : <p className="text-muted-foreground py-10 text-center text-sm">No callers for these filters.</p>}
        </section>
      </div>

      <section className="min-w-0 space-y-3" aria-label="Call filters">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Input
            className="w-full sm:max-w-xs"
            placeholder="Search lead, phone, caller, notes"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Select value={direction} onValueChange={(value) => updateParams({ direction: value === "all" ? null : value })}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All directions</SelectItem><SelectItem value="inbound">Inbound</SelectItem><SelectItem value="outbound">Outbound</SelectItem></SelectContent>
          </Select>
          <div className="w-full sm:w-52">
            <Combobox
              value={createdBy}
              onChange={(value) => updateParams({ created_by: value })}
              options={userOptions}
              placeholder="All callers"
              searchPlaceholder="Find logged by…"
              emptyText="No users found."
              className="w-full"
            />
          </div>
          {staff && <div className="w-full sm:w-52">
            <Combobox
              value={branchId}
              onChange={(value) => updateParams({ branch_id: value })}
              options={branchOptions}
              placeholder="All branches"
              searchPlaceholder="Find branch…"
              emptyText="No branches found."
              className="w-full"
            />
          </div>}
          <Select value={datePreset} onValueChange={(value) => setDatePreset(value as DatePreset)}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any date</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full sm:w-auto sm:ml-auto" onClick={exportCalls} disabled={isExporting}>
            {isExporting ? <LoaderCircle className="animate-spin" /> : <Download />}
            {isExporting ? "Preparing CSV…" : "Export CSV"}
          </Button>
          <Button variant="ghost" className="w-full sm:w-auto" onClick={clearFilters}><X /> Clear filters</Button>
        </div>
        {datePreset === "custom" && <div className="flex flex-wrap items-center gap-2">
          <label className="text-muted-foreground flex items-center gap-2 text-sm">From
            <Input aria-label="From date" type="date" className="w-auto" value={from} onChange={(event) => updateParams({ range: "custom", from: event.target.value })} />
          </label>
          <label className="text-muted-foreground flex items-center gap-2 text-sm">To
            <Input aria-label="To date" type="date" className="w-auto" value={to} onChange={(event) => updateParams({ range: "custom", to: event.target.value })} />
          </label>
        </div>}
      </section>

      <section className="bg-card min-w-0 overflow-hidden rounded-2xl border">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader><TableRow>
              <SortableHeader label="When" field="call_timestamp" ordering={ordering} onSort={sortBy} />
              <TableHead>Direction</TableHead><TableHead>Lead</TableHead><TableHead>Phone</TableHead>
              <TableHead>Logged by</TableHead>
              <SortableHeader label="Duration" field="duration_seconds" ordering={ordering} onSort={sortBy} />
              <TableHead>Outcome</TableHead><TableHead>Recording</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {calls.isLoading && Array.from({ length: 6 }).map((_, index) => <TableRow key={index}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)}
              {calls.isError && <TableRow><TableCell colSpan={8} className="py-12 text-center">
                <p className="text-destructive text-sm">Could not load calls.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void calls.refetch()}><RotateCw /> Retry</Button>
              </TableCell></TableRow>}
              {!calls.isLoading && !calls.isError && !(calls.data?.results.length) && <TableRow><TableCell colSpan={8} className="py-14 text-center">
                <Phone className="text-muted-foreground mx-auto size-8 opacity-40" />
                <p className="text-muted-foreground mt-2 text-sm">
                  {!hasFilters || allCalls.data?.count === 0 ? "No calls yet." : allCalls.isLoading ? "Checking calls…" : "No calls match these filters."}
                </p>
              </TableCell></TableRow>}
              {!calls.isError && calls.data?.results.map((call) => <TableRow
                key={call.id}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                tabIndex={0}
                aria-label={`Open call details for ${call.lead_name}`}
                onClick={() => setSelectedCall(call)}
                onKeyDown={(event) => openCallFromKeyboard(event, call)}
              >
                <TableCell className="whitespace-nowrap">{new Date(call.call_timestamp).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" })}</TableCell>
                <TableCell className="capitalize">{call.direction}</TableCell>
                <TableCell><Link className="text-primary hover:underline" to={`/leads/${call.lead}`} onClick={(event) => event.stopPropagation()}>{call.lead_name}</Link><span className="text-muted-foreground block text-xs">{call.lead_reference_number}</span></TableCell>
                <TableCell>{call.phone_number || "—"}</TableCell>
                <TableCell>{call.created_by_name || "Unknown"}</TableCell>
                <TableCell className="tabular-nums">{call.duration_formatted}</TableCell>
                <TableCell>{call.outcome || "—"}</TableCell>
                <TableCell>{call.recording_url ? <a className="text-primary hover:underline" href={call.recording_url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Listen</a> : "—"}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
        {!calls.isError && <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-muted-foreground text-sm">{calls.data?.count ? `Showing ${startRow}–${endRow} of ${calls.data.count}` : "Showing 0 calls"}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || calls.isFetching} onClick={() => updateParams({ page: String(page - 1) }, false)}>Previous</Button>
            <span className="text-muted-foreground text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages || calls.isFetching} onClick={() => updateParams({ page: String(page + 1) }, false)}>Next</Button>
          </div>
        </div>}
      </section>

      <Sheet open={selectedCall != null} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Call details</SheetTitle>
            <SheetDescription>
              {selectedCall ? `${selectedCall.lead_name} · ${selectedCall.lead_reference_number}` : "Full call record"}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {selectedCall && <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <CallDetailField label="Date & time (NPT)">{callTimestamp}</CallDetailField>
                <CallDetailField label="Direction"><span className="capitalize">{selectedCall.direction || "—"}</span></CallDetailField>
                <CallDetailField label="Lead">
                  <Link className="text-primary hover:underline" to={`/leads/${selectedCall.lead}`} onClick={() => setSelectedCall(null)}>
                    {selectedCall.lead_name || "—"}
                  </Link>
                  <span className="text-muted-foreground mt-0.5 block text-xs">{selectedCall.lead_reference_number || "—"}</span>
                </CallDetailField>
                <CallDetailField label="Phone">{selectedCall.phone_number || "—"}</CallDetailField>
                <CallDetailField label="Caller">{selectedCall.caller || "—"}</CallDetailField>
                <CallDetailField label="Logged by">{selectedCall.created_by_name || "—"}</CallDetailField>
                <CallDetailField label="Duration">{selectedCall.duration_formatted || "—"}</CallDetailField>
                <CallDetailField label="Outcome">{selectedCall.outcome || "—"}</CallDetailField>
                <CallDetailField label="Next follow-up">{followUpAt}</CallDetailField>
                <CallDetailField label="Recording">
                  {selectedCall.recording_url ? <a className="text-primary hover:underline" href={selectedCall.recording_url} target="_blank" rel="noreferrer">Open recording</a> : "—"}
                </CallDetailField>
              </div>
              <CallDetailField label="Notes">{selectedCall.notes || "—"}</CallDetailField>
              <CallDetailField label="Next action">{selectedCall.next_action || "—"}</CallDetailField>
            </div>}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </main>
  );
}
