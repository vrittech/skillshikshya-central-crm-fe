import { ChevronLeft, ChevronRight, Download, Phone, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HBarList, MiniBars } from "@/components/charts";
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
import { useCallSummary, useCalls } from "@/hooks/use-calls";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { formatDateTime, formatDateToNepalIso } from "@/lib/leads-format";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallListParams, CallSummaryParams } from "@/types/calls";
import { useBranches } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/context/auth";

const PAGE_SIZE = 20;

function readPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function readOrdering(value: string | null): string {
  if (
    value === "call_timestamp" ||
    value === "-call_timestamp" ||
    value === "duration_seconds" ||
    value === "-duration_seconds"
  ) {
    return value;
  }

  return "-call_timestamp";
}

function localDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateBoundary(value: string | null, endOfDay: boolean): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month! - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, 0);
  return formatDateToNepalIso(date);
}

function presetDateRange(preset: string): { from: string; to: string } | null {
  const today = new Date();

  if (preset === "today") {
    const day = localDateInput(today);
    return { from: day, to: day };
  }

  if (preset === "last_7_days") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: localDateInput(from), to: localDateInput(today) };
  }

  if (preset === "this_month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: localDateInput(first), to: localDateInput(last) };
  }

  return null;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function CallsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const { user } = useAuth();
  const isStaff = Boolean(user?.is_staff || user?.is_superuser);
  const usersQuery = useUsers(1, 100);
  const branchesQuery = useBranches(1, 100, "", isStaff);
  const page = readPage(searchParams.get("page"));
  const ordering = readOrdering(searchParams.get("ordering"));
  const searchText = searchParams.get("search") ?? "";
  const debouncedSearch = useDebouncedValue(searchText);
  const directionValue = searchParams.get("direction");
  const direction =
    directionValue === "inbound" || directionValue === "outbound"
      ? directionValue
      : undefined;
  const createdByValue = searchParams.get("created_by");
  const createdBy = createdByValue ? Number(createdByValue) : undefined;
  const branchValue = searchParams.get("branch_id");
  const branchId = branchValue ? Number(branchValue) : undefined;

  const params: CallListParams = {
    page,
    page_size: PAGE_SIZE,
    ordering,
    search: debouncedSearch.trim() || undefined,
    direction,
    created_by: Number.isInteger(createdBy) && createdBy! > 0 ? createdBy : undefined,
    call_timestamp__gte: dateBoundary(searchParams.get("date_from"), false),
    call_timestamp__lte: dateBoundary(searchParams.get("date_to"), true),
    branch_id: isStaff && Number.isInteger(branchId) && branchId! > 0 ? branchId : undefined,
  };

  const summaryParams: CallSummaryParams = {
    search: params.search,
    direction: params.direction,
    created_by: params.created_by,
    call_timestamp__gte: params.call_timestamp__gte,
    call_timestamp__lte: params.call_timestamp__lte,
    branch_id: params.branch_id,
  };

  const hasActiveFilters = Boolean(
    searchText.trim() ||
      direction ||
      (createdBy != null && Number.isInteger(createdBy) && createdBy > 0) ||
      (isStaff && branchId != null && Number.isInteger(branchId) && branchId > 0) ||
      searchParams.get("date_from") ||
      searchParams.get("date_to") ||
      (searchParams.get("date_preset") &&
        searchParams.get("date_preset") !== "all"),
  );

  const callsQuery = useCalls(params);
  const summaryQuery = useCallSummary(summaryParams);
  const data = callsQuery.data;
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(start + rows.length - 1, count);
  const totalPages = Math.ceil(count / PAGE_SIZE);

  function changePage(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPage === 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(nextPage));
    }
    setSearchParams(nextParams);
  }

  function changeOrdering(field: "call_timestamp" | "duration_seconds") {
    const nextParams = new URLSearchParams(searchParams);
    const ascendingValue = field;
    const descendingValue = `-${field}`;
    const nextOrdering = ordering === ascendingValue ? descendingValue : ascendingValue;

    nextParams.set("ordering", nextOrdering);
    nextParams.delete("page");
    setSearchParams(nextParams);
  }

  function updateFilter(name: string, value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (value === "all" || value === "") {
      nextParams.delete(name);
    } else {
      nextParams.set(name, value);
    }

    nextParams.delete("page");
    setSearchParams(nextParams);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await callsService.exportCsv(summaryParams);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not export calls."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Calls
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Call activity across your team.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

            {summaryQuery.isError ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border px-4 py-8 text-center">
          <p className="text-sm font-medium">Could not load call summary.</p>
          <Button
            variant="outline"
            onClick={() => void summaryQuery.refetch()}
            disabled={summaryQuery.isFetching}
          >
            {summaryQuery.isFetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total calls</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading || !summaryQuery.data ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <>
                    <p className="font-headline text-2xl font-semibold tabular-nums">
                      {summaryQuery.data.total_calls}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {summaryQuery.data.inbound} inbound · {summaryQuery.data.outbound} outbound
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Talk time</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading || !summaryQuery.data ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <p className="font-headline text-2xl font-semibold tabular-nums">
                    {summaryQuery.data.total_formatted}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average duration</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading || !summaryQuery.data ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <p className="font-headline text-2xl font-semibold tabular-nums">
                    {formatDuration(summaryQuery.data.avg_seconds)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connect rate</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading || !summaryQuery.data ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <p className="font-headline text-2xl font-semibold tabular-nums">
                    {(summaryQuery.data.connect_rate * 100).toFixed(1)}%
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calls per day</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading || !summaryQuery.data ? (
                  <Skeleton className="h-24 w-full" />
                ) : summaryQuery.data.by_day.length > 0 ? (
                  <MiniBars
                    values={summaryQuery.data.by_day.map((day) => day.calls)}
                  />
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No calls in this range.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 callers</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading || !summaryQuery.data ? (
                  <Skeleton className="h-24 w-full" />
                ) : summaryQuery.data.by_user.length > 0 ? (
                  <HBarList
                    data={summaryQuery.data.by_user
                      .slice(0, 10)
                      .map((caller) => ({
                        label: caller.name,
                        value: caller.calls,
                      }))}
                  />
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No calls in this range.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[13rem] max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            className="rounded-full pl-9"
            placeholder="Search lead, phone, caller, or notes"
            value={searchText}
            onChange={(event) => updateFilter("search", event.target.value)}
          />
        </div>

        <Select
          value={direction ?? "all"}
          onValueChange={(value) => updateFilter("direction", value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={createdBy ? String(createdBy) : "all"}
          onValueChange={(value) => updateFilter("created_by", value)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All callers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All callers</SelectItem>
            {(usersQuery.data?.results ?? []).map((caller) => (
              <SelectItem key={caller.id} value={String(caller.id)}>
                {caller.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isStaff && (
          <Select
            value={branchId ? String(branchId) : "all"}
            onValueChange={(value) => updateFilter("branch_id", value)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {(branchesQuery.data?.results ?? []).map((branch) => (
                <SelectItem key={branch.id} value={String(branch.id)}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={searchParams.get("date_preset") ?? "all"}
          onValueChange={(preset) => {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("page");

            if (preset === "all") {
              nextParams.delete("date_preset");
              nextParams.delete("date_from");
              nextParams.delete("date_to");
            } else if (preset === "custom") {
              nextParams.set("date_preset", "custom");
              nextParams.delete("date_from");
              nextParams.delete("date_to");
            } else {
              const range = presetDateRange(preset);
              if (range) {
                nextParams.set("date_preset", preset);
                nextParams.set("date_from", range.from);
                nextParams.set("date_to", range.to);
              }
            }

            setSearchParams(nextParams);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any date</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="last_7_days">Last 7 days</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        {searchParams.get("date_preset") === "custom" && (
          <>
            <Input
              className="w-40"
              type="date"
              aria-label="Calls from date"
              value={searchParams.get("date_from") ?? ""}
              onChange={(event) => updateFilter("date_from", event.target.value)}
            />
            <Input
              className="w-40"
              type="date"
              aria-label="Calls to date"
              value={searchParams.get("date_to") ?? ""}
              onChange={(event) => updateFilter("date_to", event.target.value)}
            />
          </>
        )}

        <Button
          variant="outline"
          onClick={() => setSearchParams(new URLSearchParams())}
        >
          Clear filters
        </Button>
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border">
        {callsQuery.isError ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <p className="text-sm font-medium">Could not load calls.</p>
            <Button
              variant="outline"
              onClick={() => void callsQuery.refetch()}
              disabled={callsQuery.isFetching}
            >
              {callsQuery.isFetching ? "Retrying…" : "Retry"}
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      aria-sort={
                        ordering.includes("call_timestamp")
                          ? ordering.startsWith("-")
                            ? "descending"
                            : "ascending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => changeOrdering("call_timestamp")}
                      >
                        When
                        {ordering.includes("call_timestamp") &&
                          (ordering.startsWith("-") ? "↓" : "↑")}
                      </button>
                    </TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Logged by</TableHead>
                    <TableHead
                      aria-sort={
                        ordering.includes("duration_seconds")
                          ? ordering.startsWith("-")
                            ? "descending"
                            : "ascending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => changeOrdering("duration_seconds")}
                      >
                        Duration
                        {ordering.includes("duration_seconds") &&
                          (ordering.startsWith("-") ? "↓" : "↑")}
                      </button>
                    </TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Recording</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callsQuery.isLoading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!callsQuery.isLoading && count === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-14 text-center">
                        <Phone className="text-muted-foreground mx-auto size-8 opacity-40" />
                        <p className="mt-2 text-sm font-medium">
                          {hasActiveFilters
                            ? "No calls match these filters."
                            : "No calls yet."}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {hasActiveFilters
                            ? "Try changing or clearing your filters."
                            : "Calls logged on leads will appear here."}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}

                  {!callsQuery.isLoading &&
                    rows.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(call.call_timestamp)}
                        </TableCell>
                        <TableCell className="capitalize">{call.direction}</TableCell>
                        <TableCell>
                          <Link
                            className="text-brand font-medium hover:underline"
                            to={`/leads/${call.lead}`}
                          >
                            {call.lead_name}
                          </Link>
                          <span className="text-muted-foreground mt-0.5 block font-mono text-xs">
                            {call.lead_reference_number}
                          </span>
                        </TableCell>
                        <TableCell>{call.phone_number || "—"}</TableCell>
                        <TableCell>{call.created_by_name || "—"}</TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {call.duration_formatted}
                        </TableCell>
                        <TableCell>{call.outcome || "—"}</TableCell>
                        <TableCell>
                          {call.recording_url ? (
                            <a
                              className="text-brand hover:underline"
                              href={call.recording_url}
                              target="_blank"
                              rel="noreferrer"
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

            {!callsQuery.isLoading && count > 0 && (
              <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <span className="text-muted-foreground text-sm">
                  Showing {start}–{end} of {count}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => changePage(page - 1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next page"
                    disabled={page >= totalPages}
                    onClick={() => changePage(page + 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}