import axios from "axios";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/auth";
import { CALL_OUTCOMES, labelOf } from "@/data/lead-lookups";
import { useBranches } from "@/hooks/use-branches";
import { type CallFilters, type DatePreset, useCallFilters, useCalls } from "@/hooks/use-calls";
import { useCounselors } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMmSs, formatPhone } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import { callsService } from "@/services/calls.service";
import type { GlobalCall } from "@/types/calls";
import type { CallOutcome } from "@/types/leads";
import { CallDetailSheet } from "./call-detail-sheet";
import { CallsSummary } from "./calls-summary";

const PAGE_SIZE = 20;

const DIRECTION_TONE: Record<string, string> = {
  inbound: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  outbound: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

function SortableHead({
  label,
  field,
  ordering,
  onSort,
}: {
  label: string;
  field: string;
  ordering: string;
  onSort: (ordering: string) => void;
}) {
  const desc = ordering === `-${field}`;
  const asc = ordering === field;
  const Icon = desc ? ArrowDown : asc ? ArrowUp : ArrowUpDown;
  return (
    <TableHead aria-sort={desc ? "descending" : asc ? "ascending" : "none"}>
      <button
        type="button"
        className="hover:text-foreground inline-flex items-center gap-1 font-mono text-[11px] font-medium tracking-wider uppercase"
        onClick={() => onSort(desc ? field : `-${field}`)}
      >
        {label}
        <Icon className={cn("size-3.5", !desc && !asc && "opacity-40")} />
      </button>
    </TableHead>
  );
}

export default function CallsPage() {
  const { user } = useAuth();
  const isStaff = !!user?.is_staff;
  const { filters, params, hasFilters, setFilters, setPage, clearFilters } = useCallFilters();
  const callsQ = useCalls(params, filters.page, PAGE_SIZE);
  const [activeCall, setActiveCall] = useState<GlobalCall | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const counselorsQ = useCounselors(userSearch);
  const branchesQ = useBranches(1, 100, "", isStaff);

  // a page past the end returns 404; fall back to page 1
  const pageNotFound = axios.isAxiosError(callsQ.error) && callsQ.error.response?.status === 404;
  useEffect(() => {
    if (pageNotFound && filters.page > 1) setPage(1);
  }, [pageNotFound, filters.page, setPage]);

  const counselorOptions = [
    { value: "all", label: "Anyone" },
    ...(counselorsQ.data?.results ?? []).map((u) => ({ value: String(u.id), label: u.name })),
  ];
  const rows = callsQ.data?.results ?? [];
  const isEmpty = callsQ.isSuccess && rows.length === 0;
  const count = callsQ.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;

  async function handleExport() {
    setExporting(true);
    try {
      await callsService.exportCsv(params);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every call your team logged{isStaff ? " across branches" : " in your branch"}.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          {exporting ? "Preparing…" : "Export CSV"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-[13rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search lead, phone, caller or notes"
            className="rounded-full pl-9"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>
        <Select
          value={filters.direction || "all"}
          onValueChange={(v) => setFilters({ direction: v === "all" ? "" : (v as CallFilters["direction"]) })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <Combobox
          className="w-44"
          value={filters.created_by}
          onChange={(v) => setFilters({ created_by: v === "all" ? "" : v })}
          options={counselorOptions}
          placeholder="Logged by: anyone"
          searchPlaceholder="Search users…"
          emptyText="No users found."
          onSearchChange={setUserSearch}
          loading={counselorsQ.isFetching}
        />
        {isStaff && (
          <Select
            value={filters.branch_id || "all"}
            onValueChange={(v) => setFilters({ branch_id: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branchesQ.data?.results.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.preset || "all"}
          onValueChange={(v) => setFilters({ preset: v === "all" ? "" : (v as DatePreset) })}
        >
          <SelectTrigger className="w-36">
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
        {filters.preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label="From date"
              className="w-40"
              value={filters.date_from}
              max={filters.date_to || undefined}
              onChange={(e) => setFilters({ date_from: e.target.value })}
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              aria-label="To date"
              className="w-40"
              value={filters.date_to}
              min={filters.date_from || undefined}
              onChange={(e) => setFilters({ date_to: e.target.value })}
            />
          </div>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <CallsSummary params={params} />

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        {/* kept outside the table so they stay centred at phone width */}
        {callsQ.isError && (
          <div className="px-4 py-14 text-center">
            <p className="text-destructive text-sm">{apiErrorMessage(callsQ.error, "Could not load calls.")}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void callsQ.refetch()}>
              Retry
            </Button>
          </div>
        )}
        {isEmpty && (
          <div className="px-4 py-14 text-center">
            <PhoneCall className="text-muted-foreground mx-auto size-8 opacity-40" />
            {hasFilters ? (
              <>
                <p className="text-muted-foreground mt-2 text-sm">No calls match these filters.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">
                No calls yet. Calls logged on a lead will show up here.
              </p>
            )}
          </div>
        )}
        {!callsQ.isError && !isEmpty && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="When"
                    field="call_timestamp"
                    ordering={filters.ordering}
                    onSort={(ordering) => setFilters({ ordering })}
                  />
                  <TableHead>Direction</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Logged by</TableHead>
                  <SortableHead
                    label="Duration"
                    field="duration_seconds"
                    ordering={filters.ordering}
                    onSort={(ordering) => setFilters({ ordering })}
                  />
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
                {rows.map((c) => (
                  <TableRow
                    key={c.id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => setActiveCall(c)}
                    onKeyDown={(e) => e.key === "Enter" && setActiveCall(c)}
                  >
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(c.call_timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("capitalize", DIRECTION_TONE[c.direction])}>
                        {c.direction === "inbound" ? <PhoneIncoming /> : <PhoneOutgoing />}
                        {c.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        to={`/leads/${c.lead}`}
                        className="font-semibold hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.lead_name}
                      </Link>
                      <p className="text-muted-foreground font-mono text-xs">{c.lead_reference_number}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatPhone(c.phone_number) || "—"}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{c.created_by_name || "—"}</TableCell>
                    <TableCell className="font-medium tabular-nums">{formatMmSs(c.duration_seconds)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {labelOf(CALL_OUTCOMES, c.outcome as CallOutcome)}
                    </TableCell>
                    <TableCell>
                      {c.recording_url ? (
                        <a
                          href={c.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand text-sm font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Listen
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
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-muted-foreground text-sm">
            {count === 0
              ? "No calls"
              : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, count)} of ${count} calls`}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft /> Previous
            </Button>
            <span className="text-muted-foreground px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <CallDetailSheet call={activeCall} onClose={() => setActiveCall(null)} />
    </div>
  );
}
