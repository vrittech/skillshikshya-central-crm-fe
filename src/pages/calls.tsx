import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { HBarList, MiniBars } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";
import { useCalls, useCallsSummary } from "@/hooks/use-calls";
import { callsService } from "@/services/calls.service";
import type { CallsParams } from "@/types/calls";

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }

  return `${minutes}m ${secs}s`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Kpi({
  label,
  value,
  description,
  loading,
  icon,
}: {
  label: string;
  value: string | number;
  description?: string;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
          {label}
        </CardDescription>
        <span className="text-brand">{icon}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <p className="font-headline text-2xl font-semibold">{value}</p>
            {description && (
              <p className="text-muted-foreground mt-1 text-xs">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CallsPage() {
  const { user } = useAuth();
  const isStaff = !!(user?.is_staff || user?.is_superuser);

  const [urlParams, setUrlParams] = useSearchParams();

  const initialDirection = urlParams.get("direction");
  const initialPage = Number(urlParams.get("page"));

  const [search, setSearch] = useState(
    () => urlParams.get("search") ?? "",
  );

  const [direction, setDirection] = useState(
    initialDirection === "inbound" || initialDirection === "outbound"
      ? initialDirection
      : "all",
  );

const [createdBy, setCreatedBy] = useState(
  () => urlParams.get("created_by") ?? "all",
);

const [branchId, setBranchId] = useState(
  () => urlParams.get("branch_id") ?? "all",
);

const [startDate, setStartDate] = useState(
  () => urlParams.get("start_date") ?? "",
);

const [endDate, setEndDate] = useState(
  () => urlParams.get("end_date") ?? "",
);

const [ordering, setOrdering] = useState(
  () => urlParams.get("ordering") ?? "-call_timestamp",
);

const [page, setPage] = useState(
  () =>
    Number.isInteger(initialPage) && initialPage > 0
      ? initialPage
      : 1,
);

  useEffect(() => {
  setUrlParams(
    (current) => {
      const next = new URLSearchParams(current);

      const updateParam = (key: string, value: string) => {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      };

      updateParam("search", search.trim());
      updateParam("direction", direction === "all" ? "" : direction);
      updateParam("created_by", createdBy === "all" ? "" : createdBy);
      updateParam(
        "branch_id",
        isStaff && branchId !== "all" ? branchId : "",
      );
      updateParam("start_date", startDate);
      updateParam("end_date", endDate);
      updateParam(
        "ordering",
        ordering === "-call_timestamp" ? "" : ordering,
      );
      updateParam("page", page === 1 ? "" : String(page));

      return next;
    },
    { replace: true },
  );
}, [
  search,
  direction,
  createdBy,
  branchId,
  startDate,
  endDate,
  ordering,
  page,
  isStaff,
  setUrlParams,
]);

  const branches = useBranches(1, 100, "", isStaff);
  const users = useUsers(1, 100);

  const params = useMemo<CallsParams>(
    () => ({
      page,
      page_size: 20,
      search: search.trim() || undefined,
      direction:
        direction === "all"
          ? undefined
          : (direction as "inbound" | "outbound"),
      created_by: createdBy === "all" ? undefined : Number(createdBy),
      branch_id:
        isStaff && branchId !== "all" ? Number(branchId) : undefined,
      call_timestamp__gte: startDate
        ? `${startDate}T00:00:00+05:45`
        : undefined,
      call_timestamp__lte: endDate
        ? `${endDate}T23:59:59+05:45`
        : undefined,
      ordering,
    }),
    [
      page,
      search,
      direction,
      createdBy,
      branchId,
      startDate,
      endDate,
      ordering,
      isStaff,
    ],
  );

  const calls = useCalls(params);
  const summary = useCallsSummary(params);

  const totalPages = calls.data?.total_pages ?? 1;

  const dailyValues =
    summary.data?.daily_calls.map((item) => item.total_calls) ?? [];

  const averageCallsPerDay =
    dailyValues.length > 0
     ? (
        dailyValues.reduce((total, count) => total + count, 0) /
        dailyValues.length
      ).toFixed(1)
    : "0";  

  const topCallers =
    summary.data?.top_callers.map((item) => ({
      label: item.caller || "Unknown",
      value: item.total_calls,
    })) ?? [];

  async function handleExport() {
    try {
      const { page: _page, page_size: _pageSize, ...filters } = params;
      await callsService.export(filters);
      toast.success("Calls CSV exported successfully");
    } catch {
      toast.error("Could not export calls");
    }
  }

  function resetFilters() {
    setSearch("");
    setDirection("all");
    setCreatedBy("all");
    setBranchId("all");
    setStartDate("");
    setEndDate("");
    setOrdering("-call_timestamp");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            Communication analytics
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Calls
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor inbound and outbound calls, counselor activity, and call
            performance.
          </p>
        </div>

        <Button variant="outline" onClick={handleExport}>
          <Download /> Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          label="Total calls"
          value={summary.data?.total_calls ?? 0}
          description={`${summary.data?.inbound_calls ?? 0} inbound · ${summary.data?.outbound_calls ?? 0} outbound`}
          loading={summary.isLoading}
          icon={<Phone size={18} />}
        />

        <Kpi
          label="Inbound calls"
          value={summary.data?.inbound_calls ?? 0}
          loading={summary.isLoading}
          icon={<PhoneIncoming size={18} />}
        />

        <Kpi
          label="Outbound calls"
          value={summary.data?.outbound_calls ?? 0}
          loading={summary.isLoading}
          icon={<PhoneOutgoing size={18} />}
        />

        <Kpi
          label="Total talk time"
          value={formatDuration(summary.data?.total_talk_time ?? 0)}
          loading={summary.isLoading}
          icon={<Phone size={18} />}
        />

        <Kpi
          label="Average duration"
          value={formatDuration(summary.data?.average_duration ?? 0)}
          loading={summary.isLoading}
          icon={<Phone size={18} />}
        />

        <Kpi
          label="Connect rate"
          value={`${summary.data?.connect_rate ?? 0}%`}
          description={`${summary.data?.connected_calls ?? 0} connected calls`}
          loading={summary.isLoading}
          icon={<PhoneIncoming size={18} />}
        />

        <Kpi
          label="Calls per day"
          value={averageCallsPerDay}
          description="Average calls recorded per day"
          loading={summary.isLoading}
          icon={<Phone size={18} />}
        />
      </div>

      {/* Analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily calls</CardTitle>
            <CardDescription>
              Number of calls recorded per day
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : dailyValues.length > 0 ? (
              <>
                <MiniBars values={dailyValues} />
                <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                  <span>{summary.data?.daily_calls[0]?.date}</span>
                  <span>
                    {summary.data?.daily_calls.at(-1)?.date}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No daily call data available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 callers</CardTitle>
            <CardDescription>
              Users ranked by number of logged calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : topCallers.length > 0 ? (
              <HBarList data={topCallers} />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No caller data available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call history</CardTitle>
          <CardDescription>
            Search and filter recorded calls
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                className="pl-9"
                placeholder="Search calls..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select
              value={direction}
              onValueChange={(value) => {
                setDirection(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={createdBy}
              onValueChange={(value) => {
                setCreatedBy(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {users.data?.results.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isStaff && (
              <Select
                value={branchId}
                onValueChange={(value) => {
                  setBranchId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.data?.results.map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
              aria-label="Start date"
            />

            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
              aria-label="End date"
            />

            <Select
              value={ordering}
              onValueChange={(value) => {
                setOrdering(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort calls" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-call_timestamp">
                  Newest first
                </SelectItem>
                <SelectItem value="call_timestamp">
                  Oldest first
                </SelectItem>
                <SelectItem value="-duration_seconds">
                  Longest duration
                </SelectItem>
                <SelectItem value="duration_seconds">
                  Shortest duration
                </SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Logged by</TableHead>
                  <TableHead>Branch</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {calls.isLoading &&
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}

                {!calls.isLoading &&
                  (calls.data?.results.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-muted-foreground py-10 text-center"
                      >
                        No calls found. Try changing your filters.
                      </TableCell>
                    </TableRow>
                  )}

                {calls.data?.results.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <div className="font-medium">{call.lead_name}</div>
                      <div className="text-muted-foreground text-xs">
                        {call.lead_reference_number || "—"}
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(call.call_timestamp)}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          call.direction === "inbound" ? "secondary" : "brand"
                        }
                      >
                        {call.direction === "inbound" ? (
                          <ArrowDown className="mr-1 h-3 w-3" />
                        ) : (
                          <ArrowUp className="mr-1 h-3 w-3" />
                        )}
                        {call.direction}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div>{call.caller || "—"}</div>
                      <div className="text-muted-foreground text-xs">
                        {call.phone_number || ""}
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {formatDuration(call.duration_seconds)}
                    </TableCell>

                    <TableCell>{call.outcome || "—"}</TableCell>

                    <TableCell>{call.created_by_name || "—"}</TableCell>

                    <TableCell>
                       {branches.data?.results.find(
                         (branch) => branch.id === call.branch,
                       )?.name ?? (call.branch ? `Branch #${call.branch}` : "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              {calls.data?.count ?? 0} total calls · Page {page} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || calls.isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || calls.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
