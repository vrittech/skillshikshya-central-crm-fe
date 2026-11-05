import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useCalls, useCallSummary, useExportCalls } from "@/hooks/use-calls";
import { apiErrorMessage } from "@/lib/api";
import {
  CALL_PAGE_SIZE,
  formatCallTime,
  readCallFilters,
  recordingLink,
} from "@/lib/calls-filters";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import type { GlobalCall } from "@/types/calls";
import { CallDetailSheet } from "./call-detail-sheet";
import { CallFilters } from "./call-filters";
import { CallActivity, CallSummaryCards } from "./call-summary";

export default function CallsPage() {
  const { user } = useAuth();
  const isStaff = !!(user?.is_staff || user?.is_superuser);
  const [params, setParams] = useSearchParams();
  const serialized = params.toString();
  const debounced = useDebouncedValue(serialized, 250);
  const { filters, ordering, page, dateError } = readCallFilters(
    new URLSearchParams(debounced),
    isStaff,
  );
  const current = readCallFilters(params, isStaff);
  const changing = serialized !== debounced;
  const enabled = !dateError && !current.dateError;
  const calls = useCalls(
    { ...filters, ordering, page, page_size: CALL_PAGE_SIZE },
    enabled,
  );
  const summary = useCallSummary(filters, enabled);
  const exportCalls = useExportCalls();
  const [selected, setSelected] = useState<GlobalCall | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const loading =
    changing ||
    calls.isPending ||
    summary.isPending ||
    calls.isPlaceholderData ||
    summary.isPlaceholderData;
  const hasFilters = Object.keys(filters).length > 0;
  const count = calls.data?.count ?? 0;
  const lastPage = Math.max(1, Math.ceil(count / CALL_PAGE_SIZE));
  const error = calls.error || summary.error;

  function update(changes: Record<string, string>, resetPage = true) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (resetPage) next.delete("page");
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: Object.hasOwn(changes, "search") },
    );
  }

  function sort(column: "call_timestamp" | "duration_seconds") {
    update({ ordering: current.ordering === column ? `-${column}` : column });
  }

  function sortIcon(column: string) {
    if (current.ordering === column) return <ArrowUp className="size-3.5" />;
    if (current.ordering === `-${column}`)
      return <ArrowDown className="size-3.5" />;
    return <ArrowDown className="size-3.5 opacity-25" />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Calls
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every conversation, in one place.
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-1"
          disabled={exportCalls.isPending || changing || !enabled}
          onClick={() => exportCalls.mutate({ ...filters, ordering })}
        >
          {exportCalls.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {exportCalls.isPending ? "Preparing CSV…" : "Export CSV"}
        </Button>
      </div>

      <CallFilters
        params={params}
        update={update}
        clear={() => setParams({})}
        isStaff={isStaff}
        dateError={current.dateError}
      />

      {enabled && error && !changing ? (
        <div
          role="alert"
          className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5"
        >
          <div>
            <p className="text-sm font-semibold">Could not load calls</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {apiErrorMessage(error, "Check your connection and try again.")}
            </p>
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Button
                variant="outline"
                onClick={() => update({ page: "1" }, false)}
              >
                First page
              </Button>
            )}
            <Button
              variant="outline"
              disabled={calls.isFetching || summary.isFetching}
              onClick={() => {
                void calls.refetch();
                void summary.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        enabled && (
          <>
            <CallSummaryCards
              data={loading ? undefined : summary.data}
              loading={loading}
            />
            <CallActivity
              data={loading ? undefined : summary.data}
              loading={loading}
            />

            <section
              className="bg-card min-w-0 overflow-hidden rounded-xl border"
              aria-busy={loading}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-4 sm:px-5">
                <h2 className="text-sm font-semibold">Call log</h2>
                <p className="text-muted-foreground text-xs">
                  All times in Nepal (UTC+05:45)
                </p>
              </div>
              <Table className="min-w-[1040px]">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      aria-sort={
                        current.ordering === "call_timestamp"
                          ? "ascending"
                          : current.ordering === "-call_timestamp"
                            ? "descending"
                            : "none"
                      }
                    >
                      <button
                        className="inline-flex cursor-pointer items-center gap-2 py-2"
                        onClick={() => sort("call_timestamp")}
                      >
                        When {sortIcon("call_timestamp")}
                      </button>
                    </TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Logged by</TableHead>
                    <TableHead
                      aria-sort={
                        current.ordering === "duration_seconds"
                          ? "ascending"
                          : current.ordering === "-duration_seconds"
                            ? "descending"
                            : "none"
                      }
                    >
                      <button
                        className="inline-flex cursor-pointer items-center gap-2 py-2"
                        onClick={() => sort("duration_seconds")}
                      >
                        Duration {sortIcon("duration_seconds")}
                      </button>
                    </TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Recording</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }, (_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={8}>
                            <Skeleton className="my-2 h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    : calls.data?.results.map((call) => {
                        const recording = recordingLink(call.recording_url);
                        const open = (element: HTMLElement) => {
                          returnFocus.current = element;
                          setSelected(call);
                        };
                        return (
                          <TableRow
                            key={call.id}
                            className="cursor-pointer"
                            tabIndex={0}
                            aria-label={`Call with ${call.lead_name}, ${formatCallTime(call.call_timestamp)}`}
                            onClick={(event) => open(event.currentTarget)}
                            onKeyDown={(event) => {
                              if (
                                event.target === event.currentTarget &&
                                (event.key === "Enter" || event.key === " ")
                              ) {
                                event.preventDefault();
                                open(event.currentTarget);
                              }
                            }}
                          >
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatCallTime(call.call_timestamp)}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1.5 text-xs">
                                {call.direction === "inbound" ? (
                                  <ArrowDownLeft className="text-emerald-600 dark:text-emerald-400 size-3.5" />
                                ) : (
                                  <ArrowUpRight className="text-muted-foreground size-3.5" />
                                )}
                                <span className="capitalize">
                                  {call.direction}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell>
                              <Link
                                to={`/leads/${call.lead}`}
                                onClick={(event) => event.stopPropagation()}
                                className="block max-w-52 truncate font-medium hover:underline"
                                title={call.lead_name}
                              >
                                {call.lead_name || "—"}
                              </Link>
                              <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                                {call.lead_reference_number || "—"}
                              </p>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs tabular-nums">
                              {call.phone_number || "—"}
                            </TableCell>
                            <TableCell className="max-w-40 truncate text-xs">
                              {call.created_by_name || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs tabular-nums">
                              {call.duration_formatted}
                            </TableCell>
                            <TableCell>
                              {call.outcome ? (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "max-w-44 truncate font-normal",
                                    call.duration_seconds === 0 &&
                                      "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {call.outcome.replace(/_/g, " ")}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {recording ? (
                                <a
                                  href={recording}
                                  onClick={(event) => event.stopPropagation()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand inline-flex items-center gap-1 text-xs hover:underline"
                                >
                                  Listen <ExternalLink className="size-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
              {!loading && count === 0 && (
                <div className="px-5 py-14 text-center">
                  <Phone className="text-muted-foreground mx-auto size-7 opacity-50" />
                  <p className="mt-3 text-sm font-medium">
                    {hasFilters
                      ? "No calls match these filters"
                      : "No calls yet"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {hasFilters
                      ? "Try a different search or a wider date range."
                      : "Log a call from a lead’s page to see it here."}
                  </p>
                  {hasFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setParams({})}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs sm:px-5">
                <p
                  className="text-muted-foreground tabular-nums"
                  aria-live="polite"
                >
                  {loading
                    ? "Loading calls…"
                    : `Showing ${count ? (page - 1) * CALL_PAGE_SIZE + 1 : 0}–${Math.min(page * CALL_PAGE_SIZE, count)} of ${count.toLocaleString()}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    aria-label="Previous page"
                    disabled={loading || page <= 1}
                    onClick={() => update({ page: String(page - 1) }, false)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-muted-foreground tabular-nums">
                    {page} / {lastPage}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    aria-label="Next page"
                    disabled={loading || page >= lastPage}
                    onClick={() => update({ page: String(page + 1) }, false)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </section>
          </>
        )
      )}
      <CallDetailSheet
        call={selected}
        onClose={() => setSelected(null)}
        returnFocus={returnFocus}
      />
    </div>
  );
}
