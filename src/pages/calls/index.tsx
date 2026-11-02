import { ArrowDown, ArrowUp, Download, LoaderCircle, Phone, Search } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HBarList } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { useCalls, useCallsSummary, useExportCalls } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { durationLabel, formatCallDuration } from "@/lib/call-duration";
import { callDateTime, presetDates, recordingUrl } from "@/lib/calls-filters";
import { apiErrorMessage } from "@/lib/api";
import type { CallsParams, GlobalCall } from "@/types/calls";
import { CallDetailSheet } from "./call-detail-sheet";

const PAGE_SIZE = 20;
const filterKeys = ["search", "direction", "created_by", "from_date", "to_date"] as const;

function UserPicker({
  value,
  label,
  branchId,
  onChange,
}: {
  value: string;
  label: string;
  branchId?: number;
  onChange: (value: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const users = useUsers(page, 20, search, branchId);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="max-w-full truncate">
          {value ? label || `User #${value}` : "All users"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <Input
          aria-label="Search users"
          placeholder="Search users…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            onChange("", "");
            setOpen(false);
          }}
        >
          All users
        </Button>
        <div className="max-h-60 overflow-y-auto">
          {users.isFetching ? (
            <p className="p-2 text-sm">Loading users…</p>
          ) : users.isError ? (
            <Button variant="ghost" onClick={() => void users.refetch()}>
              Retry loading users
            </Button>
          ) : (
            users.data?.results.map((user) => (
              <Button
                key={user.id}
                variant={value === String(user.id) ? "secondary" : "ghost"}
                className="w-full justify-start truncate"
                onClick={() => {
                  onChange(String(user.id), user.name);
                  setOpen(false);
                }}
              >
                {user.name}
              </Button>
            ))
          )}
          {!users.isFetching && !users.isError && !users.data?.results.length && (
            <p className="p-2 text-sm">No users found.</p>
          )}
        </div>
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || users.isFetching}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!users.data?.next || users.isFetching}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function CallsPage() {
  const { user } = useAuth();
  const staff = !!(user?.is_staff || user?.is_superuser);
  const [url, setUrl] = useSearchParams();
  const [selected, setSelected] = useState<GlobalCall | null>(null);
  const selectedRow = useRef<HTMLTableRowElement | null>(null);
  const [branchSearch, setBranchSearch] = useState("");
  const branches = useBranches(1, 100, branchSearch, staff);
  const filters: CallsParams = {};
  filterKeys.forEach((key) => {
    if (url.get(key)) filters[key] = url.get(key)!;
  });
  if (staff && url.get("branch_id")) filters.branch_id = url.get("branch_id")!;
  const requestedOrdering = url.get("ordering") || "-call_timestamp";
  const ordering = [
    "call_timestamp",
    "-call_timestamp",
    "duration_seconds",
    "-duration_seconds",
  ].includes(requestedOrdering)
    ? requestedOrdering
    : "-call_timestamp";
  const requestedPage = Number(url.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const invalidDates = !!(
    filters.from_date &&
    filters.to_date &&
    filters.from_date > filters.to_date
  );
  const calls = useCalls({ ...filters, ordering, page, page_size: PAGE_SIZE });
  const summary = useCallsSummary(filters);
  const exporting = useExportCalls();
  const stats = summary.data;
  const total = calls.data?.count ?? 0;
  const hasFilters = Object.keys(filters).length > 0;

  function update(changes: Record<string, string>, resetPage = true) {
    setUrl((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) =>
        value ? next.set(key, value) : next.delete(key),
      );
      if (resetPage) next.delete("page");
      return next;
    });
  }

  function sort(field: string) {
    update({ ordering: ordering === field ? `-${field}` : field });
  }

  function sortIcon(field: string) {
    if (ordering === field) return <ArrowUp className="size-3" />;
    if (ordering === `-${field}`) return <ArrowDown className="size-3" />;
    return null;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Team calling activity across your leads. All dates and times are NPT.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={exporting.isPending || invalidDates || calls.isLoading || calls.isError}
          onClick={() => exporting.mutate({ ...filters, ordering })}
        >
          {exporting.isPending ? <LoaderCircle className="animate-spin" /> : <Download />}{" "}
          {exporting.isPending ? "Preparing CSV…" : "Export CSV"}
        </Button>
      </div>

      <section
        aria-label="Call filters"
        className="bg-card flex min-w-0 flex-wrap items-end gap-3 rounded-2xl border p-4"
      >
        <div className="min-w-0 flex-[1_1_16rem] space-y-1.5">
          <Label htmlFor="calls-search">Search calls</Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <Input
              id="calls-search"
              placeholder="Lead, phone, caller or notes"
              className="pl-9"
              value={url.get("search") || ""}
              onChange={(e) => update({ search: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Direction</Label>
          <Select
            value={filters.direction || "all"}
            onValueChange={(v) => update({ direction: v === "all" ? "" : v })}
          >
            <SelectTrigger aria-label="Direction" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directions</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label className="block">Logged by</Label>
          <UserPicker
            value={filters.created_by || ""}
            label={url.get("user_name") || ""}
            branchId={staff ? Number(filters.branch_id) || undefined : user?.branch || undefined}
            onChange={(id, name) => update({ created_by: id, user_name: name })}
          />
        </div>
        {staff && (
          <div className="min-w-0 space-y-1.5">
            <Label>Branch</Label>
            <Select
              value={filters.branch_id || "all"}
              onValueChange={(v) =>
                update({ branch_id: v === "all" ? "" : v, created_by: "", user_name: "" })
              }
            >
              <SelectTrigger aria-label="Branch" className="w-40">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    aria-label="Search branches"
                    placeholder="Search branches…"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <SelectItem value="all">All branches</SelectItem>
                {branches.data?.results.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Date range</Label>
          <Select
            value={url.get("range") || "all"}
            onValueChange={(v) => update({ range: v === "all" ? "" : v, ...presetDates(v) })}
          >
            <SelectTrigger aria-label="Date range" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(url.get("range") === "custom" || filters.from_date || filters.to_date) && (
          <>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="calls-from">From (NPT)</Label>
              <Input
                id="calls-from"
                type="date"
                className="w-40 max-w-full"
                value={filters.from_date || ""}
                max={filters.to_date}
                onChange={(e) => update({ from_date: e.target.value, range: "custom" })}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="calls-to">To (NPT)</Label>
              <Input
                id="calls-to"
                type="date"
                className="w-40 max-w-full"
                value={filters.to_date || ""}
                min={filters.from_date}
                onChange={(e) => update({ to_date: e.target.value, range: "custom" })}
              />
            </div>
          </>
        )}
        <Button variant="ghost" onClick={() => setUrl({})}>
          Clear filters
        </Button>
        {invalidDates && (
          <p role="alert" className="text-destructive w-full text-sm">
            The end date must be on or after the start date.
          </p>
        )}
      </section>

      {summary.isError ? (
        <div role="alert" className="bg-card rounded-2xl border p-4 text-sm">
          {apiErrorMessage(summary.error, "Could not load call activity.")}{" "}
          <Button variant="outline" size="sm" onClick={() => void summary.refetch()}>
            Retry summary
          </Button>
        </div>
      ) : (
        <>
          <section
            aria-label="Call activity"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            aria-busy={summary.isFetching}
          >
            {[
              [
                "Total calls",
                stats?.total_calls,
                `${stats?.inbound_calls ?? 0} inbound · ${stats?.outbound_calls ?? 0} outbound`,
              ],
              ["Talk time", durationLabel(stats?.talk_time_seconds ?? 0), "Across matching calls"],
              [
                "Average duration",
                formatCallDuration(stats?.average_duration_seconds ?? 0),
                "Per call, including unconnected calls",
              ],
              [
                "Connect rate",
                `${stats?.connect_rate ?? 0}%`,
                `${stats?.connected_calls ?? 0} calls lasted more than 0 seconds`,
              ],
            ].map(([label, value, hint]) => (
              <div key={String(label)} className="bg-card min-w-0 rounded-2xl border p-4">
                <p className="text-muted-foreground text-sm">{label}</p>
                {summary.isLoading ? (
                  <Skeleton className="my-2 h-8 w-24" />
                ) : (
                  <p className="font-headline my-2 break-words text-2xl font-semibold tabular-nums">
                    {value ?? 0}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">{hint}</p>
              </div>
            ))}
          </section>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <section className="bg-card min-w-0 rounded-2xl border p-4">
              <h2 className="font-headline mb-3 font-semibold">
                Calls per day <span className="text-muted-foreground text-xs">NPT</span>
              </h2>
              {summary.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !stats?.calls_per_day.length ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No call activity in this period.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  <HBarList
                    data={stats.calls_per_day.map((day) => ({ label: day.date, value: day.count }))}
                  />
                </div>
              )}
            </section>
            <section className="bg-card min-w-0 rounded-2xl border p-4">
              <h2 className="font-headline mb-3 font-semibold">Top 10 callers</h2>
              {summary.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !stats?.top_callers.length ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No callers in this period.
                </p>
              ) : (
                <ol className="max-h-60 space-y-2 overflow-y-auto text-sm">
                  {stats.top_callers.map((caller, index) => (
                    <li
                      key={caller.created_by ?? "unknown"}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0 truncate">
                        <span className="text-muted-foreground mr-3">{index + 1}.</span>
                        {caller.created_by__name || "Unknown user"}
                      </span>
                      <span className="font-semibold tabular-nums">{caller.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}

      <section aria-label="Call log" className="bg-card min-w-0 overflow-hidden rounded-2xl border">
        {calls.isError ? (
          <div role="alert" className="space-y-3 p-6">
            <p>{apiErrorMessage(calls.error, "Could not load calls.")}</p>
            <Button variant="outline" onClick={() => void calls.refetch()}>
              Retry
            </Button>
            {page > 1 && (
              <Button variant="ghost" onClick={() => update({ page: "1" }, false)}>
                Back to page 1
              </Button>
            )}
          </div>
        ) : (
          <>
            <div
              className="max-w-full overflow-x-auto"
              tabIndex={0}
              aria-label="Scrollable call table"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      aria-sort={
                        ordering === "call_timestamp"
                          ? "ascending"
                          : ordering === "-call_timestamp"
                            ? "descending"
                            : "none"
                      }
                    >
                      <button
                        className="flex cursor-pointer items-center gap-1"
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
                        ordering === "duration_seconds"
                          ? "ascending"
                          : ordering === "-duration_seconds"
                            ? "descending"
                            : "none"
                      }
                    >
                      <button
                        className="flex cursor-pointer items-center gap-1"
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
                  {calls.isLoading ? (
                    Array.from({ length: 5 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !total ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-14 text-center">
                        <Phone className="text-muted-foreground mx-auto size-8 opacity-40" />
                        <p className="mt-2 font-medium">
                          {hasFilters ? "No calls match these filters" : "No calls yet"}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {hasFilters
                            ? "Try changing or clearing your filters."
                            : "Log a call from a lead to see it here."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    calls.data?.results.map((call) => {
                      const recording = recordingUrl(call.recording_url);
                      return (
                        <TableRow
                          key={call.id}
                          tabIndex={0}
                          aria-label={`Call with ${call.lead_name}`}
                          className="cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                          onClick={(e) => {
                            selectedRow.current = e.currentTarget;
                            setSelected(call);
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.target === e.currentTarget &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              selectedRow.current = e.currentTarget;
                              setSelected(call);
                            }
                          }}
                        >
                          <TableCell className="whitespace-nowrap">
                            {callDateTime(call.call_timestamp)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {call.direction}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/leads/${call.lead}`}
                              className="text-brand whitespace-nowrap font-semibold hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {call.lead_name}
                            </Link>
                            <p className="text-muted-foreground font-mono text-xs">
                              {call.lead_reference_number}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {call.phone_number || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {call.created_by_name || "—"}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatCallDuration(call.duration_seconds ?? 0)}
                          </TableCell>
                          <TableCell>{call.outcome || "—"}</TableCell>
                          <TableCell>
                            {recording ? (
                              <a
                                className="text-brand underline"
                                href={recording}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Listen
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm"
              aria-live="polite"
            >
              <p className="text-muted-foreground">
                Showing {total ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)}{" "}
                of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || calls.isLoading}
                  onClick={() => update({ page: String(page - 1) }, false)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!calls.data?.next || calls.isLoading}
                  onClick={() => update({ page: String(page + 1) }, false)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      <CallDetailSheet
        call={selected}
        onClose={() => setSelected(null)}
        restoreFocus={() => selectedRow.current?.focus({ preventScroll: true })}
      />
    </div>
  );
}
