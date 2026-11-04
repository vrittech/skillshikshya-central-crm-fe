import { ArrowDown, ArrowUp, PhoneCall } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
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
import { formatMmSs } from "@/lib/duration";
import { formatDateTime } from "@/lib/leads-format";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CallsSummaryCards } from "@/components/calls-summary";
import { useCalls, useCallsSummary } from "@/hooks/use-calls";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { callsService } from "@/services/calls.service";
import { useAuth } from "@/context/auth";
import { useUsers } from "@/hooks/use-users";
import { useBranches } from "@/hooks/use-branches";

const PAGE_SIZE = 20;

export default function CallsPage() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get("page") ?? 1);
  const ordering = sp.get("ordering") ?? "-call_timestamp";

  // Every change goes through the URL. Changing a filter resets to page 1.
  function setParam(changes: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(sp);
    Object.entries(changes).forEach(([k, v]) =>
      v ? next.set(k, v) : next.delete(k),
    );
    if (resetPage) next.delete("page");
    setSp(next);
  }

  function toggleSort(field: string) {
    setParam({ ordering: ordering === field ? `-${field}` : field });
  }

  const filters = {
    search: sp.get("search") || undefined,
    direction: sp.get("direction") || undefined,
    created_by: sp.get("created_by") ? Number(sp.get("created_by")) : undefined,
    from_date: sp.get("from_date") || undefined,
    to_date: sp.get("to_date") || undefined,
    branch_id: sp.get("branch_id") ? Number(sp.get("branch_id")) : undefined,
  };
  const hasFilters = Object.values(filters).some((v) => v !== undefined);
  // search box: update the URL 400 ms after typing stops
  const [searchText, setSearchText] = useState(sp.get("search") ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("search") ?? "") !== searchText.trim())
        setParam({ search: searchText.trim() || null });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // date presets use Nepal calendar days
  const nptDay = (offset = 0) => {
    const d = new Date(Date.now() + 5.75 * 3600_000 - offset * 86400_000);
    return d.toISOString().slice(0, 10);
  };
  const preset = sp.get("preset") ?? "";
  function applyPreset(p: string) {
    if (p === "today")
      setParam({ preset: p, from_date: nptDay(), to_date: nptDay() });
    else if (p === "7d")
      setParam({ preset: p, from_date: nptDay(6), to_date: nptDay() });
    else if (p === "month")
      setParam({
        preset: p,
        from_date: nptDay().slice(0, 8) + "01",
        to_date: nptDay(),
      });
    else setParam({ preset: "custom" });
  }
  function clearAll() {
    setSearchText("");
    setSp(new URLSearchParams());
  }
  const { data, isLoading, isError, refetch } = useCalls({
    ...filters,
    page,
    page_size: PAGE_SIZE,
    ordering,
  });
  const summaryQ = useCallsSummary(filters);
  const { user } = useAuth();
  const isStaff = !!(user?.is_staff || user?.is_superuser);
  const usersQ = useUsers(1, 100);
  const branchesQ = useBranches(1, 100, "", isStaff);
  const [exporting, setExporting] = useState(false);
  async function exportCsv() {
    setExporting(true);
    try {
      const blob = await callsService.exportCsv({ ...filters, ordering });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calls-${new Date(Date.now() + 5.75 * 3600_000).toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export calls");
    } finally {
      setExporting(false);
    }
  }
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);

  function SortIcon({ field }: { field: string }) {
    if (ordering === field) return <ArrowUp className="ml-1 inline size-3" />;
    if (ordering === `-${field}`)
      return <ArrowDown className="ml-1 inline size-3" />;
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
          CRM Workspace
        </p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
          Calls
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-[13rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search lead, phone, caller, notes"
            className="rounded-full pl-9"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select
          value={sp.get("direction") ?? "all"}
          onValueChange={(v) => setParam({ direction: v === "all" ? null : v })}
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
        <Select
          value={sp.get("created_by") ?? "all"}
          onValueChange={(v) =>
            setParam({ created_by: v === "all" ? null : v })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All callers</SelectItem>
            {(usersQ.data?.results ?? []).map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isStaff && (
          <Select
            value={sp.get("branch_id") ?? "all"}
            onValueChange={(v) =>
              setParam({ branch_id: v === "all" ? null : v })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {(branchesQ.data?.results ?? []).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={preset || "all"}
          onValueChange={(v) =>
            v === "all"
              ? setParam({ preset: null, from_date: null, to_date: null })
              : applyPreset(v)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any date</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {preset === "custom" && (
          <>
            <Input
              type="date"
              className="w-40"
              value={sp.get("from_date") ?? ""}
              onChange={(e) => setParam({ from_date: e.target.value || null })}
            />
            <Input
              type="date"
              className="w-40"
              value={sp.get("to_date") ?? ""}
              onChange={(e) => setParam({ to_date: e.target.value || null })}
            />
          </>
        )}
        {(hasFilters || preset) && (
          <Button variant="ghost" onClick={clearAll}>
            <X /> Clear filters
          </Button>
        )}

        <Button
          variant="outline"
          className="ml-auto"
          onClick={exportCsv}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}{" "}
          Export CSV
        </Button>
      </div>
      <CallsSummaryCards data={summaryQ.data} loading={summaryQ.isLoading} />
      <div className="bg-card overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => toggleSort("call_timestamp")}
                >
                  When <SortIcon field="call_timestamp" />
                </TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Logged by</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => toggleSort("duration_seconds")}
                >
                  Duration <SortIcon field="duration_seconds" />
                </TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {isError && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <p className="text-destructive text-sm">
                      Could not load calls.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => refetch()}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <PhoneCall className="text-muted-foreground mx-auto size-8 opacity-40" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      {hasFilters
                        ? "No calls match these filters."
                        : "No calls yet."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(c.call_timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
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
                  <TableCell>{c.phone_number}</TableCell>
                  <TableCell>{c.created_by_name || "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatMmSs(c.duration_seconds)}
                  </TableCell>
                  <TableCell className="capitalize">
                    {c.outcome || "—"}
                  </TableCell>
                  <TableCell>
                    {c.recording_url ? (
                      <a
                        href={c.recording_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
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
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Showing {from}–{to} of {count}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setParam({ page: String(page - 1) }, false)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={to >= count}
            onClick={() => setParam({ page: String(page + 1) }, false)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
