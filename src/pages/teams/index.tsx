import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";
import { useTeamsLicences, useTeamsSummary } from "@/hooks/use-teams";
import { formatDate } from "@/lib/leads-format";
import type { ApiTeamsLicence } from "@/types/leads-api";
import { FreeLicenceDialog } from "../leads/components/teams-licence";

const PAGE_SIZE = 20;

function Kpi({ label, value, loading }: { label: string; value: string | number; loading: boolean }) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader>
        <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="font-headline text-2xl font-semibold tabular-nums">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Student({ row }: { row: ApiTeamsLicence }) {
  return (
    <>
      <Link to={`/leads/${row.lead}`} className="font-semibold hover:underline">
        {row.name}
      </Link>
      <p className="text-muted-foreground text-xs">
        <Link to={`/enrollments/${row.enrollment}`} className="hover:underline">
          {row.course_name}
        </Link>
        {row.batch_name ? ` · ${row.batch_name}` : ""}
      </p>
    </>
  );
}

export default function TeamsPage() {
  const { source } = useDataSource();
  const isApi = source === "api";
  const { hasPerm } = useAuth();
  const canFree = hasPerm("lead.change_teamslicence");
  const [tab, setTab] = useState<"open" | "freed">("open");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [freeing, setFreeing] = useState<ApiTeamsLicence | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const summary = useTeamsSummary(isApi);
  const { data, isLoading } = useTeamsLicences(
    {
      page,
      page_size: PAGE_SIZE,
      search: debounced || undefined,
      open: tab === "open",
    },
    isApi,
  );
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const s = summary.data;
  const cols = tab === "open" ? 4 : 5;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
          Institute
        </p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
          Teams licences
        </h1>
      </div>

      {!isApi ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed py-16 text-center text-sm">
          Switch to Live data to see Teams licences.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label="Total" value={s?.total ?? "—"} loading={summary.isLoading} />
            <Kpi label="In use" value={s?.in_use ?? 0} loading={summary.isLoading} />
            <Kpi label="Free" value={s?.free ?? "—"} loading={summary.isLoading} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as "open" | "freed");
                setPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="open">In use</TabsTrigger>
                <TabsTrigger value="freed">Freed</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative max-w-sm min-w-[16rem]">
              <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
              <Input
                placeholder="Search name or account…"
                className="rounded-full pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-card overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Teams account</TableHead>
                  <TableHead>Given</TableHead>
                  {tab === "open" ? (
                    <TableHead className="w-24 pr-6" />
                  ) : (
                    <>
                      <TableHead>Freed</TableHead>
                      <TableHead className="pr-6">Reason</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={cols} className="pl-6">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={cols} className="text-muted-foreground py-10 text-center">
                      No licences.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="pl-6">
                        <Student row={r} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.account}</TableCell>
                      <TableCell>
                        <p>{formatDate(r.assigned_at)}</p>
                        <p className="text-muted-foreground text-xs">{r.assigned_by_name}</p>
                      </TableCell>
                      {tab === "open" ? (
                        <TableCell className="pr-6 text-right">
                          {canFree && (
                            <Button size="sm" variant="ghost" onClick={() => setFreeing(r)}>
                              Free
                            </Button>
                          )}
                        </TableCell>
                      ) : (
                        <>
                          <TableCell>
                            <p>{formatDate(r.released_at ?? undefined)}</p>
                            <p className="text-muted-foreground text-xs">{r.released_by_name}</p>
                          </TableCell>
                          <TableCell className="pr-6 text-sm">{r.release_reason}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            {count > PAGE_SIZE && (
              <div className="bg-muted/50 flex items-center justify-between border-t px-6 py-3">
                <span className="text-muted-foreground text-sm">
                  Showing {rows.length} of {count}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <FreeLicenceDialog licence={freeing} onClose={() => setFreeing(null)} />
    </div>
  );
}
