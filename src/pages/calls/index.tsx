import {
  ArrowDown,
  ArrowUp,
  Download,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { useDataSource } from "@/context/data-source";
import { CALL_OUTCOMES } from "@/data/lead-lookups";
import { useCalls, useExportCalls } from "@/hooks/use-calls";
import { formatClock } from "@/lib/duration";
import { cn } from "@/lib/utils";
import { CallsOverview } from "@/pages/calls/calls-overview";
import {
  PAGE_SIZE,
  useCallFilters,
  type DatePreset,
  type SortKey,
} from "@/pages/calls/use-call-filters";

import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";

const DIRECTION_TONE: Record<string, string> = {
  inbound: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  outbound: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

// Always display call times in Nepal time, regardless of the browser timezone.
const NPT_DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function outcomeLabel(outcome: string | null) {
  if (!outcome) return "—";
  return (
    CALL_OUTCOMES.find((o) => o.value === outcome)?.label ??
    outcome.replace(/_/g, " ")
  );
}

function SortHead({
  label,
  sortKey,
  ordering,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  ordering: string;
  onSort: (key: SortKey) => void;
}) {
  const ascending = ordering === sortKey;
  const active = ascending || ordering === `-${sortKey}`;
  const Arrow = ascending ? ArrowUp : ArrowDown;
  return (
    <TableHead
      aria-sort={active ? (ascending ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="hover:text-foreground flex items-center gap-1"
      >
        {label}
        {active && <Arrow className="size-3.5" aria-hidden />}
      </button>
    </TableHead>
  );
}

export default function CallsPage() {
  const { isMock } = useDataSource();
  const f = useCallFilters();
  const { values, update } = f;
  const { calls, count, isLoading, isFetching, isError, refetch } = useCalls(
    f.listParams,
  );
  const exportCalls = useExportCalls();
  const { user } = useAuth();
  const isStaff = Boolean(user?.is_staff || user?.is_superuser);
  const usersQ = useUsers(1, 100);
  const branchesQ = useBranches(1, 100, "", isStaff && !isMock);
  const [searchInput, setSearchInput] = useState(values.search);

  // Type-ahead search: wait 300 ms after the last keystroke before touching the URL.
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === values.search) return;
    const timer = setTimeout(() => update({ q: trimmed || null }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, values.search, update]);

  if (isMock) {
    return (
      <div className="space-y-2">
        <h1 className="font-headline text-3xl font-semibold tracking-tight">
          Calls
        </h1>
        <p className="text-muted-foreground text-sm">
          The Calls page needs the live backend. Switch the data source to the
          API.
        </p>
      </div>
    );
  }

  const userOptions = (usersQ.data?.results ?? []).map((u) => ({
    value: String(u.id),
    label: u.name,
  }));
  const branchOptions = (branchesQ.data?.results ?? []).map((b) => ({
    value: String(b.id),
    label: b.name,
  }));
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const firstRow = count === 0 ? 0 : (f.page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(f.page * PAGE_SIZE, count);

  function clearAll() {
    setSearchInput("");
    f.clear();
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
            Every call your team has logged.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportCalls.mutate(f.apiFilters)}
          disabled={exportCalls.isPending}
        >
          {exportCalls.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Download />
          )}
          {exportCalls.isPending ? "Preparing…" : "Export CSV"}
        </Button>
      </div>

      <CallsOverview filters={f.apiFilters} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-[13rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search lead, phone, caller, or notes"
            className="rounded-full pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={values.direction || "all"}
          onValueChange={(v) => update({ direction: v === "all" ? null : v })}
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
          value={values.createdBy || "all"}
          onValueChange={(v) => update({ by: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Logged by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {userOptions.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isStaff && (
          <Select
            value={values.branch || "all"}
            onValueChange={(v) => update({ branch: v === "all" ? null : v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Branch" />
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
          value={values.range}
          onValueChange={(v) =>
            update({ range: v === "all" ? null : v, from: null, to: null })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {values.range === "custom" && (
          <>
            <Input
              type="date"
              aria-label="From date"
              className="w-auto"
              value={values.from}
              max={values.to || undefined}
              onChange={(e) => update({ from: e.target.value || null })}
            />
            <Input
              type="date"
              aria-label="To date"
              className="w-auto"
              value={values.to}
              min={values.from || undefined}
              onChange={(e) => update({ to: e.target.value || null })}
            />
          </>
        )}
        <Button
          variant="ghost"
          onClick={clearAll}
          disabled={!f.hasActiveFilters}
        >
          <X /> Clear filters
        </Button>
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead
                  label="When (NPT)"
                  sortKey="call_timestamp"
                  ordering={f.ordering}
                  onSort={f.toggleSort}
                />
                <TableHead>Direction</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Logged by</TableHead>
                <SortHead
                  label="Duration"
                  sortKey="duration_seconds"
                  ordering={f.ordering}
                  onSort={f.toggleSort}
                />
                <TableHead>Outcome</TableHead>
                <TableHead>Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && isError && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <p className="text-destructive text-sm">
                      Could not load calls.
                    </p>
                    <div className="mt-3 flex justify-center gap-2">
                      <Button variant="outline" onClick={() => void refetch()}>
                        <RotateCw /> Retry
                      </Button>
                      {f.page > 1 && (
                        <Button variant="ghost" onClick={() => f.setPage(1)}>
                          Back to page 1
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && calls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <Phone className="text-muted-foreground mx-auto size-8 opacity-40" />
                    {f.hasActiveFilters ? (
                      <>
                        <p className="text-muted-foreground mt-2 text-sm">
                          No calls match these filters.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-3"
                          onClick={clearAll}
                        >
                          Clear filters
                        </Button>
                      </>
                    ) : (
                      <p className="text-muted-foreground mt-2 text-sm">
                        No calls yet. Calls logged from a lead will appear here.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {!isError &&
                calls.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">
                      {NPT_DATE_TIME.format(new Date(c.call_timestamp))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "gap-1 capitalize",
                          DIRECTION_TONE[c.direction],
                        )}
                      >
                        {c.direction === "inbound" ? (
                          <PhoneIncoming className="size-3" />
                        ) : (
                          <PhoneOutgoing className="size-3" />
                        )}
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
                    <TableCell className="tabular-nums">
                      {c.phone_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.created_by_name || "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatClock(c.duration_seconds)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {outcomeLabel(c.outcome)}
                    </TableCell>
                    <TableCell>
                      {c.recording_url ? (
                        <a
                          href={c.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand hover:underline"
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
        {count > 0 && !isError && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              Showing {firstRow}–{lastRow} of {count}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={f.page <= 1 || isFetching}
                onClick={() => f.setPage(f.page - 1)}
              >
                Previous
              </Button>
              <span className="text-muted-foreground tabular-nums">
                Page {f.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={f.page >= totalPages || isFetching}
                onClick={() => f.setPage(f.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
