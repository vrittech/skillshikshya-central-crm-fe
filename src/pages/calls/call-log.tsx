import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { useCalls, useExportCalls } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { apiErrorMessage } from "@/lib/api";
import type { ApiCall } from "@/types/calls";
import {
  getCallSummaryParams,
  getCallListParams,
  getLocalDateValue,
  hasActiveCallFilters,
} from "@/pages/calls/call-filters";

const PAGE_SIZE = 20;
const DEFAULT_ORDERING = "-call_timestamp";
const NUMBER_FORMAT = new Intl.NumberFormat();
const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

function formatCallDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(value));
}

function SortHeader({
  label,
  active,
  descending,
  onClick,
}: {
  label: string;
  active: boolean;
  descending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 font-mono text-[11px] font-medium tracking-wider uppercase hover:text-foreground"
      aria-label={`Sort by ${label}${active ? (descending ? ", descending" : ", ascending") : ""}`}
    >
      {label}
      {active ? (
        descending ? (
          <ArrowDown className="size-3" aria-hidden="true" />
        ) : (
          <ArrowUp className="size-3" aria-hidden="true" />
        )
      ) : (
        <span className="text-muted-foreground/60">↕</span>
      )}
    </button>
  );
}

function CallTableRow({ call, onSelect }: { call: ApiCall; onSelect: (call: ApiCall) => void }) {
  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      aria-label={`View call details: ${call.lead_name}, ${formatCallDate(call.call_timestamp)}`}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("a, button")) onSelect(call);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(call);
        }
      }}
    >
      <TableCell className="text-muted-foreground text-xs">
        <time dateTime={call.call_timestamp}>{formatCallDate(call.call_timestamp)}</time>
      </TableCell>
      <TableCell>
        <Badge variant={call.direction === "inbound" ? "secondary" : "brand"} className="capitalize">
          {call.direction}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-normal">
        <Link to={`/leads/${call.lead}`} className="text-brand font-semibold hover:underline">
          {call.lead_name}
        </Link>
        {call.lead_reference_number && (
          <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
            {call.lead_reference_number}
          </p>
        )}
      </TableCell>
      <TableCell>
        {call.phone_number ? (
          <a className="hover:text-brand" href={`tel:${call.phone_number.replace(/[^0-9+]/g, "")}`}>
            {call.phone_number}
          </a>
        ) : "—"}
      </TableCell>
      <TableCell>{call.created_by_name || "Unknown"}</TableCell>
      <TableCell className="font-mono tabular-nums">{call.duration_formatted}</TableCell>
      <TableCell className="capitalize">{call.outcome?.replaceAll("_", " ") || "—"}</TableCell>
      <TableCell>
        {call.recording_url ? (
          <a
            href={call.recording_url}
            target="_blank"
            rel="noreferrer"
            className="text-brand font-medium hover:underline"
          >
            Listen
          </a>
        ) : "—"}
      </TableCell>
    </TableRow>
  );
}

function fullDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(value));
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground font-mono text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-sm break-words">{children || "—"}</dd>
    </div>
  );
}

function CallDetailSheet({
  call,
  onOpenChange,
}: {
  call: ApiCall | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={call !== null} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        {call && (
          <>
            <SheetHeader>
              <SheetTitle>Call details</SheetTitle>
              <SheetDescription>
                {call.lead_name} · {fullDateTime(call.call_timestamp)}
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <DetailField label="Date and time">
                  <time dateTime={call.call_timestamp}>{fullDateTime(call.call_timestamp)}</time>
                </DetailField>
                <DetailField label="Direction">
                  <span className="inline-flex items-center gap-1.5 capitalize">
                    {call.direction === "inbound" ? (
                      <ArrowDownLeft className="text-brand size-4" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight className="text-brand size-4" aria-hidden="true" />
                    )}
                    {call.direction}
                  </span>
                </DetailField>
                <DetailField label="Lead">
                  <span>
                    <Link to={`/leads/${call.lead}`} className="text-brand font-semibold hover:underline">
                      {call.lead_name || "—"}
                    </Link>
                    {call.lead_reference_number && (
                      <span className="text-muted-foreground ml-2 font-mono text-xs">
                        {call.lead_reference_number}
                      </span>
                    )}
                  </span>
                </DetailField>
                <DetailField label="Phone">
                  {call.phone_number ? (
                    <a className="text-brand hover:underline" href={`tel:${call.phone_number.replace(/[^0-9+]/g, "")}`}>
                      {call.phone_number}
                    </a>
                  ) : null}
                </DetailField>
                <DetailField label="Caller">{call.caller}</DetailField>
                <DetailField label="Logged by">{call.created_by_name}</DetailField>
                <DetailField label="Duration">{call.duration_formatted}</DetailField>
                <DetailField label="Outcome">{call.outcome?.replaceAll("_", " ")}</DetailField>
                <DetailField label="Notes">
                  {call.notes ? <span className="whitespace-pre-wrap">{call.notes}</span> : null}
                </DetailField>
                <DetailField label="Next action">{call.next_action}</DetailField>
                <DetailField label="Next follow-up">
                  {call.next_followup_at ? (
                    <time dateTime={call.next_followup_at}>
                      {fullDateTime(call.next_followup_at)}
                    </time>
                  ) : null}
                </DetailField>
                <DetailField label="Recording">
                  {call.recording_url ? (
                    <a
                      href={call.recording_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand font-semibold hover:underline"
                    >
                      Open recording
                    </a>
                  ) : null}
                </DetailField>
              </dl>
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function CallLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCall, setSelectedCall] = useState<ApiCall | null>(null);
  const { user } = useAuth();
  const isStaff = !!(user?.is_staff || user?.is_superuser);
  const search = searchParams.get("search") ?? "";
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const listParams = getCallListParams(searchParams, debouncedSearch, isStaff);
  const callsQuery = useCalls(listParams);
  const exportCalls = useExportCalls();
  const usersQuery = useUsers(1, 100);
  const branchesQuery = useBranches(1, 100, "", isStaff);
  const page = listParams.page ?? 1;
  const rows = callsQuery.data?.results ?? [];
  const total = callsQuery.data?.count ?? 0;
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const ordering = searchParams.get("ordering") || DEFAULT_ORDERING;

  function updateParams(
    updates: Record<string, string | null>,
    { resetPage = true, replace = false }: { resetPage?: boolean; replace?: boolean } = {},
  ) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.set("page", "1");
    setSearchParams(next, { replace });
  }

  function setDateRange(value: string) {
    if (value === "custom") {
      const today = getLocalDateValue(new Date());
      updateParams({
        date_range: value,
        date_from: searchParams.get("date_from") || today,
        date_to: searchParams.get("date_to") || today,
      });
    } else {
      updateParams({ date_range: value === "all" ? null : value, date_from: null, date_to: null });
    }
  }

  function toggleSort(field: "call_timestamp" | "duration_seconds") {
    const next = ordering === field ? `-${field}` : field;
    updateParams({ ordering: next });
  }

  function clearFilters() {
    setSearchParams({});
  }

  const dateRange = searchParams.get("date_range") || "all";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const sortField = ordering.replace(/^-/, "");
  const descending = ordering.startsWith("-");
  const exportParams = {
    ...getCallSummaryParams(searchParams, debouncedSearch, isStaff),
    ordering: listParams.ordering,
  };

  return (
    <>
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Call log</CardTitle>
            <CardDescription className="mt-1">
              Search and filter calls across your branch.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveCallFilters(searchParams) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X aria-hidden="true" /> Clear filters
              </Button>
            )}
            <Button
              variant="brand"
              size="sm"
              disabled={exportCalls.isPending}
              onClick={() => exportCalls.mutate(exportParams)}
            >
              {exportCalls.isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {exportCalls.isPending ? "Preparing CSV…" : "Export CSV"}
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,2fr)_repeat(3,minmax(9rem,1fr))]">
          <div className="relative min-w-0">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search lead, phone, caller, notes..."
              aria-label="Search calls"
              className="pl-9"
              value={search}
              onChange={(event) =>
                updateParams({ search: event.target.value || null }, { replace: true })
              }
            />
          </div>
          <Select
            value={searchParams.get("direction") || "all"}
            onValueChange={(value) => updateParams({ direction: value === "all" ? null : value })}
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
            value={searchParams.get("created_by") || "all"}
            onValueChange={(value) => updateParams({ created_by: value === "all" ? null : value })}
          >
            <SelectTrigger aria-label="Filter by logged by">
              <SelectValue placeholder="All callers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All callers</SelectItem>
              {usersQuery.data?.results.map((caller) => (
                <SelectItem key={caller.id} value={String(caller.id)}>
                  {caller.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger aria-label="Filter by date range">
              <CalendarDays className="text-muted-foreground size-4" aria-hidden="true" />
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isStaff && (
            <Select
              value={searchParams.get("branch_id") || "all"}
              onValueChange={(value) => updateParams({ branch_id: value === "all" ? null : value })}
            >
              <SelectTrigger aria-label="Filter by branch">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branchesQuery.data?.results.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {dateRange === "custom" && (
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-full">
              <label className="text-muted-foreground text-xs" htmlFor="calls-date-from">From</label>
              <Input
                id="calls-date-from"
                type="date"
                className="w-auto min-w-36"
                max={dateTo || undefined}
                value={dateFrom}
                onChange={(event) => updateParams({ date_from: event.target.value || null })}
              />
              <label className="text-muted-foreground text-xs" htmlFor="calls-date-to">To</label>
              <Input
                id="calls-date-to"
                type="date"
                className="w-auto min-w-36"
                min={dateFrom || undefined}
                value={dateTo}
                onChange={(event) => updateParams({ date_to: event.target.value || null })}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="min-w-0 space-y-3">
        {callsQuery.isError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-destructive text-sm">
              {apiErrorMessage(callsQuery.error, "Could not load calls.")}
            </p>
            <Button variant="outline" size="sm" onClick={() => void callsQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                Showing {start}–{end} of {NUMBER_FORMAT.format(total)}
              </span>
              {callsQuery.isFetching && !callsQuery.isLoading && (
                <span role="status" className="text-xs">Updating calls…</span>
              )}
            </div>
            <div className="min-w-0 overflow-x-auto rounded-lg border">
              <Table className="min-w-[75rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortHeader
                        label="When"
                        active={sortField === "call_timestamp"}
                        descending={descending}
                        onClick={() => toggleSort("call_timestamp")}
                      />
                    </TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Logged by</TableHead>
                    <TableHead>
                      <SortHeader
                        label="Duration"
                        active={sortField === "duration_seconds"}
                        descending={descending}
                        onClick={() => toggleSort("duration_seconds")}
                      />
                    </TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Recording</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callsQuery.isLoading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`loading-${index}`}>
                        <TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))}
                  {!callsQuery.isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center whitespace-normal">
                        <p className="font-medium">
                          {hasActiveCallFilters(searchParams) ? "No calls match these filters." : "No calls yet."}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {hasActiveCallFilters(searchParams)
                            ? "Try changing or clearing your filters."
                            : "Calls logged by your team will appear here."}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                  {!callsQuery.isLoading && rows.map((call) => (
                    <CallTableRow key={call.id} call={call} onSelect={setSelectedCall} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">Newest calls appear first by default.</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Previous page"
                  disabled={page <= 1 || callsQuery.isFetching}
                  onClick={() => updateParams({ page: String(page - 1) }, { resetPage: false })}
                >
                  <ChevronLeft aria-hidden="true" /> Previous
                </Button>
                <span className="text-muted-foreground text-xs tabular-nums">
                  Page {page}{total ? ` of ${Math.max(1, Math.ceil(total / PAGE_SIZE))}` : ""}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Next page"
                  disabled={page * PAGE_SIZE >= total || callsQuery.isFetching}
                  onClick={() => updateParams({ page: String(page + 1) }, { resetPage: false })}
                >
                  Next <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    <CallDetailSheet call={selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)} />
    </>
  );
}
