import {
  ChevronLeft,
  ChevronRight,
  PhoneIncoming,
  PhoneOutgoing,
  PlayCircle,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DateRange } from "@/components/date-range";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
import { useBranchScope } from "@/context/branch-scope";
import { CALL_OUTCOMES, CALL_OUTCOME_TONE } from "@/data/lead-lookups";
import { useCalls, useCallsSummary } from "@/hooks/use-calls";
import { useUsers } from "@/hooks/use-users";
import { formatDateTime, formatDuration, formatPhone } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { ApiCall, CallsFilters } from "@/types/calls-api";

const PAGE_SIZE = 20;
const COLS = 8;

/** 90 → "1 min 30 sec", 8100 → "2 h 15 min". */
function talkTime(seconds: number | undefined) {
  if (!seconds) return "0 min";
  if (seconds < 3600) return formatDuration(seconds);
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function outcomeLabel(value: string) {
  return CALL_OUTCOMES.find((o) => o.value === value)?.label ?? value.replace(/_/g, " ");
}

function Kpi({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string | number | undefined;
  sub?: string;
  loading: boolean;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader>
        <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <p className="font-headline text-2xl font-semibold tabular-nums">{value ?? 0}</p>
            {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CallRow({ call }: { call: ApiCall }) {
  const outbound = call.direction === "outbound";
  const DirectionIcon = outbound ? PhoneOutgoing : PhoneIncoming;
  return (
    <TableRow>
      <TableCell className="pl-6 whitespace-nowrap">{formatDateTime(call.call_timestamp)}</TableCell>
      <TableCell>
        <Link to={`/leads/${call.lead}`} className="font-semibold hover:underline">
          {call.lead_name}
        </Link>
        <p className="text-muted-foreground text-xs">
          {call.lead_reference_number && (
            <span className="font-mono">{call.lead_reference_number}</span>
          )}
          {call.lead_reference_number && call.phone_number ? " · " : ""}
          {call.phone_number ? formatPhone(call.phone_number) : ""}
        </p>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <DirectionIcon
            className={cn("size-4", outbound ? "text-brand" : "text-emerald-600 dark:text-emerald-400")}
          />
          {outbound ? "Outbound" : "Inbound"}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          {formatDuration(call.duration_seconds)}
          {call.recording_url && (
            <a
              href={call.recording_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Recording"
              title="Recording"
              className="text-muted-foreground hover:text-foreground"
            >
              <PlayCircle className="size-4" />
            </a>
          )}
        </span>
      </TableCell>
      <TableCell>
        {call.outcome ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              CALL_OUTCOME_TONE[call.outcome] ?? "bg-muted text-muted-foreground",
            )}
          >
            {outcomeLabel(call.outcome)}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">{call.created_by_name ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground max-w-[16rem]">
        {call.notes ? (
          <span className="line-clamp-2" title={call.notes}>
            {call.notes}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[14rem] pr-6">
        {call.next_followup_at || call.next_action ? (
          <>
            {call.next_followup_at && (
              <p className="text-foreground whitespace-nowrap">{formatDateTime(call.next_followup_at)}</p>
            )}
            {call.next_action && (
              <p className="line-clamp-2 text-xs" title={call.next_action}>
                {call.next_action}
              </p>
            )}
          </>
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );
}

function Pager({
  page,
  count,
  shown,
  onPage,
}: {
  page: number;
  count: number;
  shown: number;
  onPage: (next: number) => void;
}) {
  if (count <= PAGE_SIZE) return null;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <div className="bg-muted/50 flex items-center justify-between border-t px-6 py-3">
      <span className="text-muted-foreground text-sm">
        Showing {shown} of {count} calls
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
        </Button>
        <span className="text-muted-foreground text-sm">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export default function CallsPage() {
  const branchId = useBranchScope().branchId ?? undefined;
  const users = useUsers(1, 100);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [direction, setDirection] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [by, setBy] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters: CallsFilters = useMemo(
    () => ({
      search: debounced || undefined,
      date_from: from || undefined,
      date_to: to || undefined,
      direction: direction === "all" ? undefined : (direction as CallsFilters["direction"]),
      outcome: outcome === "all" ? undefined : outcome,
      created_by: by === "all" ? undefined : Number(by),
      branch_id: branchId,
    }),
    [debounced, from, to, direction, outcome, by, branchId],
  );

  // Any filter change goes back to the first page.
  useEffect(() => setPage(1), [filters]);

  const list = useCalls({ ...filters, page, page_size: PAGE_SIZE });
  const summary = useCallsSummary(filters);
  const s = summary.data;
  const rows = list.data?.results ?? [];
  const count = list.data?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Calls"
          value={s?.calls}
          sub={s && `${s.outbound} outbound · ${s.inbound} inbound`}
          loading={summary.isLoading}
        />
        <Kpi label="Leads called" value={s?.leads} loading={summary.isLoading} />
        <Kpi label="Talk time" value={talkTime(s?.talk_seconds)} loading={summary.isLoading} />
        <Kpi
          label="Average call"
          value={s?.average_seconds ? formatDuration(s.average_seconds) : "—"}
          loading={summary.isLoading}
        />
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <Input
              placeholder="Search calls…"
              className="rounded-full pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directions</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
            </SelectContent>
          </Select>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              {CALL_OUTCOMES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(users.data?.results.length ?? 0) > 0 && (
            <Select value={by} onValueChange={setBy}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {users.data?.results.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">When</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="pr-6">Next follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={COLS} className="pl-6">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!list.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLS} className="text-muted-foreground py-10 text-center">
                    No calls.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <CallRow key={c.id} call={c} />
              ))}
            </TableBody>
          </Table>
        </div>
        <Pager page={page} count={count} shown={rows.length} onPage={setPage} />
      </div>
    </div>
  );
}
