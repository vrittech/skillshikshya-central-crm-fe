import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAGE_SIZE, useCallFilters, type CallSortColumn } from "@/hooks/use-call-filters";
import { useCalls, useCallSummary, useExportCalls } from "@/hooks/use-calls";
import { formatDateTime } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import { CallFilters } from "./call-filters";
import { CallSummary } from "./call-summary";
import type { ApiGlobalCall } from "@/types/calls";
import { CallDetailSheet } from "./call-detail-sheet";

const COLUMNS = 8;

function SortHead({
  column,
  label,
  sort,
  onToggle,
}: {
  column: CallSortColumn;
  label: string;
  sort: string;
  onToggle: (c: CallSortColumn) => void;
}) {
  const active = sort.replace(/^-/, "") === column;
  const desc = sort.startsWith("-");
  const Icon = !active ? ArrowUpDown : desc ? ArrowDown : ArrowUp;
  return (
    <TableHead aria-sort={active ? (desc ? "descending" : "ascending") : "none"}>
      <button
        type="button"
        className="hover:text-foreground inline-flex items-center gap-1"
        onClick={() => onToggle(column)}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-40")} />
      </button>
    </TableHead>
  );
}

export default function CallsPage() {
  const { state, actions, filterParams, listParams, hasActiveFilters } = useCallFilters();
  const calls = useCalls(listParams);
  const summary = useCallSummary(filterParams);
  const exportCalls = useExportCalls();
  const [selected, setSelected] = useState<ApiGlobalCall | null>(null);

  // A page past the end makes DRF answer 404: fall back to page 1.
  useEffect(() => {
    if (calls.isError && state.page > 1) actions.setPage(1);
  }, [calls.isError, state.page, actions]);

  const rows = calls.data?.results ?? [];
  const count = calls.data?.count ?? 0;
  const from = count === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(state.page * PAGE_SIZE, count);

  return (
    <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
                <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                Every call your team has logged, newest first.
                </p>
            </div>
            <Button
                variant="outline"
                onClick={() => exportCalls.mutate(filterParams)}
                disabled={exportCalls.isPending}
            >
                {exportCalls.isPending ? <Loader2 className="animate-spin" /> : <Download />}
                Export CSV
            </Button>
        </div>

      <CallFilters state={state} actions={actions} />

      <CallSummary query={summary} />

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className={cn("overflow-x-auto", calls.isPlaceholderData && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead column="call_timestamp" label="When" sort={state.sort} onToggle={actions.toggleSort} />
                <TableHead>Direction</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Logged by</TableHead>
                <SortHead column="duration_seconds" label="Duration" sort={state.sort} onToggle={actions.toggleSort} />
                <TableHead>Outcome</TableHead>
                <TableHead>Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.isPending &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={COLUMNS}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}

              {calls.isError && (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-14 text-center">
                    <p className="text-destructive text-sm">Could not load calls.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => void calls.refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              )}

              {calls.isSuccess && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-14 text-center">
                    <PhoneCall className="text-muted-foreground mx-auto size-8 opacity-40" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      {hasActiveFilters ? "No calls match these filters." : "No calls yet."}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" className="mt-3" onClick={actions.clear}>
                        Clear filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}

              {rows.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelected(c);
                  }}
                >
                  <TableCell className="whitespace-nowrap">{formatDateTime(c.call_timestamp)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "capitalize",
                        c.direction === "outbound"
                          ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                          : "bg-violet-500/15 text-violet-700 dark:text-violet-300",
                      )}
                    >
                      {c.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link to={`/leads/${c.lead}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                      {c.lead_name}
                    </Link>
                    <p className="text-muted-foreground font-mono text-xs">{c.lead_reference_number}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{c.phone_number || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.created_by_name || "—"}</TableCell>
                  <TableCell className="tabular-nums">{c.duration_formatted}</TableCell>
                  <TableCell className="capitalize">{c.outcome ? c.outcome.replace(/_/g, " ") : "—"}</TableCell>
                  <TableCell>
                    {c.recording_url ? (
                      <a
                        href={c.recording_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Listen
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

        {calls.isSuccess && count > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
            <p className="text-muted-foreground text-sm">
              Showing {from}–{to} of {count}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={state.page <= 1}
                onClick={() => actions.setPage(state.page - 1)}
              >
                <ChevronLeft /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!calls.data?.next}
                onClick={() => actions.setPage(state.page + 1)}
              >
                Next <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
      <CallDetailSheet call={selected} onClose={() => setSelected(null)} />
    </div>
  );
}