import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  Download,
  Phone,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCallSummary, useGlobalCalls } from "@/hooks/use-calls";
import { useBranches } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api";
import { callsService, type GlobalCallParams } from "@/services/calls.service";
import { CallDetails } from "./CallDetails";
import { Stat } from "./StartCards";
import type { ApiGlobalCall } from "@/types/leads-api";
import {
  apiDate,
  dateOnly,
  dateRange,
  formatDate,
  formatDuration,
} from "./Date";

const PAGE_SIZE = 20;

const CallsPage = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<ApiGlobalCall | null>(null);
  const [exporting, setExporting] = useState(false);
  const isStaff = !!user?.is_staff || !!user?.is_superuser;
  const search = params.get("search") ?? "";
  const direction = params.get("direction") as GlobalCallParams["direction"];
  const callerId = Number(params.get("created_by")) || undefined;
  const branchId = Number(params.get("branch_id")) || undefined;
  const preset = params.get("range") ?? "all";
  const range = dateRange(
    preset,
    params.get("from") ?? "",
    params.get("to") ?? "",
  );
  const page = Math.max(1, Number(params.get("page")) || 1);
  const ordering = params.get("ordering") ?? "-call_timestamp";
  const queryParams: GlobalCallParams = {
    page,
    page_size: PAGE_SIZE,
    ordering,
    search: search || undefined,
    direction,
    created_by: callerId,
    branch_id: isStaff ? branchId : undefined,
    call_timestamp__gte: apiDate(range.from),
    call_timestamp__lte: apiDate(range.to, true),
  };
  const list = useGlobalCalls(queryParams);
  const summary = useCallSummary({
    ...queryParams,
    page: undefined,
    page_size: undefined,
  });
  const users = useUsers(1, 100, "", undefined);
  const branches = useBranches(1, 100, "", isStaff);
  const rows = list.data?.results ?? [];
  const totalPages = Math.ceil((list.data?.count ?? 0) / PAGE_SIZE);
  const update = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setParams(next);
  };
  const clear = () =>
    setParams(new URLSearchParams({ range: "all", page: "1" }));
  const sort = (field: string) =>
    update("ordering", ordering === field ? `-${field}` : field);
  const sorting = (field: string) =>
    ordering.replace("-", "") === field ? (
      ordering.startsWith("-") ? (
        <ArrowDown className="inline size-3" />
      ) : (
        <ArrowUp className="inline size-3" />
      )
    ) : null;
  const maxDay = Math.max(
    1,
    ...(summary.data?.calls_per_day ?? []).map((d) => d.count),
  );
  const hasFilters =
    !!search || !!direction || !!callerId || !!branchId || preset !== "all";
  const presets = useMemo(
    () => [
      { value: "all", label: "All time" },
      { value: "today", label: "Today" },
      { value: "7d", label: "Last 7 days" },
      { value: "month", label: "This month" },
      { value: "custom", label: "Custom" },
    ],
    [],
  );

  async function exportCsv() {
    setExporting(true);
    try {
      const result = await callsService.exportCsv({
        ...queryParams,
        page: undefined,
        page_size: undefined,
      });
      const url = URL.createObjectURL(result.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `calls-${dateOnly(new Date())}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not export calls"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Calls
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Team activity across every lead in your view.
          </p>
        </div>
        <Button
          variant="brand"
          onClick={() => void exportCsv()}
          disabled={exporting}
        >
          <Download />
          {exporting ? "Preparing…" : "Export CSV"}
        </Button>
      </div>

      {/* top cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton className="h-28 rounded-xl" key={i} />
          ))
        ) : (
          <>
            <Stat
              label="Total calls"
              value={String(summary.data?.total_calls ?? 0)}
              detail={`${summary.data?.inbound_calls ?? 0} inbound · ${summary.data?.outbound_calls ?? 0} outbound`}
            />
            <Stat
              label="Talk time"
              value={formatDuration(summary.data?.total_seconds)}
            />
            <Stat
              label="Average duration"
              value={formatDuration(summary.data?.average_seconds)}
            />
            <Stat
              label="Connect rate"
              value={`${summary.data?.connect_rate ?? 0}%`}
              detail="Calls over 0 seconds"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Calls per day chart */}
        <Card className="gap-4 rounded-xl py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="text-brand size-4" />
              Calls per day
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {(summary.data?.calls_per_day ?? []).length ? (
              <div className="flex h-32 items-end gap-1.5">
                {summary.data?.calls_per_day.map((day) => (
                  <div
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    key={day.date}
                  >
                    <span className="text-muted-foreground text-[10px]">
                      {day.count}
                    </span>
                    <div
                      className="bg-brand w-full rounded-t"
                      style={{
                        height: `${Math.max(8, (day.count / maxDay) * 100)}%`,
                      }}
                    />
                    <span className="text-muted-foreground text-[9px]">
                      {day.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No calls in this range.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top callers */}
        <Card className="gap-4 rounded-xl py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm">Top callers</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {(summary.data?.top_callers ?? []).length ? (
              <div className="space-y-3">
                {summary.data?.top_callers.map((caller) => (
                  <div
                    className="flex items-center justify-between gap-3 text-sm"
                    key={caller.caller}
                  >
                    <span className="truncate">{caller.caller}</span>
                    <span className="font-semibold tabular-nums">
                      {caller.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No callers to show.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* table header */}
      <div className="flex flex-wrap items-end gap-2">
        {/* search */}
        <div className="relative min-w-[14rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            className="pl-9"
            placeholder="Search lead, phone, caller or notes"
            value={search}
            onChange={(e) => update("search", e.target.value)}
          />
        </div>
        {/* direction filter */}
        <div className="w-36">
          <Label className="sr-only">Direction</Label>
          <Select
            value={direction ?? "all"}
            onValueChange={(v) =>
              update("direction", v === "all" ? undefined : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directions</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* callers filter*/}
        <div className="w-40">
          <Label className="sr-only">Logged by</Label>
          <Select
            value={callerId ? String(callerId) : "all"}
            onValueChange={(v) =>
              update("created_by", v === "all" ? undefined : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Logged by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All callers</SelectItem>
              {(users.data?.results ?? []).map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* date filter */}
        <div className="w-40">
          <Label className="sr-only">Date range</Label>
          <Select value={preset} onValueChange={(v) => update("range", v)}>
            <SelectTrigger>
              <CalendarDays className="mr-1 size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem value={p.value} key={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {preset === "custom" && (
          <>
            <div className="w-36">
              <Label className="sr-only">From date</Label>
              <Input
                type="date"
                aria-label="From date"
                value={params.get("from") ?? ""}
                onChange={(e) => update("from", e.target.value)}
              />
            </div>
            <div className="w-36">
              <Label className="sr-only">To date</Label>
              <Input
                type="date"
                aria-label="To date"
                value={params.get("to") ?? ""}
                onChange={(e) => update("to", e.target.value)}
              />
            </div>
          </>
        )}
        {isStaff && (
          <div className="w-40">
            <Select
              value={branchId ? String(branchId) : "all"}
              onValueChange={(v) =>
                update("branch_id", v === "all" ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {(branches.data?.results ?? []).map((b) => (
                  <SelectItem value={String(b.id)} key={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {hasFilters && (
          <Button variant="ghost" onClick={clear}>
            <X />
            Clear filters
          </Button>
        )}
      </div>

      {/* error table */}
      {list.isError ? (
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center">
            <p className="text-destructive text-sm">Could not load calls.</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => void list.refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        // table
        <Card className="overflow-hidden rounded-xl py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => sort("call_timestamp")}>
                      When {sorting("call_timestamp")}
                    </button>
                  </TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Logged by</TableHead>
                  <TableHead>
                    <button onClick={() => sort("duration_seconds")}>
                      Duration {sorting("duration_seconds")}
                    </button>
                  </TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Recording</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length ? (
                  rows.map((call) => (
                    <TableRow
                      className="cursor-pointer"
                      key={call.id}
                      onClick={() => setSelected(call)}
                    >
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                        {formatDate(call.call_timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {call.direction}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          className="font-semibold hover:underline"
                          to={`/leads/${call.lead}`}
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
                      <TableCell>
                        {call.created_by_name || call.caller || "—"}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {formatDuration(call.duration_seconds)}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {call.outcome || "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {call.recording_url ? (
                          <a
                            className="text-brand text-xs hover:underline"
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-16 text-center"
                    >
                      <Phone className="mx-auto size-8 opacity-40" />
                      <p className="mt-2 text-sm">
                        {hasFilters
                          ? "No calls match these filters."
                          : "No calls yet."}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {list.data?.count
                ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, list.data.count)} of ${list.data.count}`
                : "Showing 0 calls"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => update("page", String(page - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => update("page", String(page + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* call details */}
      <CallDetails call={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default CallsPage;
