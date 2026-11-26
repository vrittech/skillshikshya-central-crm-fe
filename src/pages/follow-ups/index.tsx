import { CalendarClock, Check, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListPager } from "@/components/list-pager";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataSource } from "@/context/data-source";
import { type FollowUpRow, useCompleteFollowup, useFollowUps } from "@/hooks/use-followups";
import { useRole } from "@/context/role";
import { formatDateTime, formatPhone, initialsOf, relativeToToday } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import { ScheduleFollowUpDialog } from "./schedule-follow-up-dialog";

const BUCKETS = [
  { key: "overdue", label: "Overdue", tone: "text-destructive" },
  { key: "today", label: "Due today", tone: "text-amber-600 dark:text-amber-400" },
  { key: "upcoming", label: "Upcoming", tone: "text-brand" },
] as const;

function FollowUpItem({ row, canComplete }: { row: FollowUpRow; canComplete: boolean }) {
  const overdue = row.bucket === "overdue";
  const complete = useCompleteFollowup();
  const canAct = canComplete && row.leadApiId != null && row.followupId != null;
  return (
    <div className="hover:bg-accent/50 flex items-center gap-3 px-4 py-3 transition-colors">
      <Link to={`/leads/${row.leadId}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="bg-brand-fixed-dim/30 text-brand-container flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {initialsOf(row.leadName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            {row.leadName}
            {row.payment && <Badge variant="warning">Payment</Badge>}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {row.purpose ?? "Follow-up"}
            {row.phone && <> · {formatPhone(row.phone)}</>}
          </p>
        </div>
      </Link>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-medium", overdue && "text-destructive")}>
          {relativeToToday(row.dueAt)}
        </p>
        <p className="text-muted-foreground text-xs">{formatDateTime(row.dueAt)}</p>
      </div>
      {row.assignedToName && (
        <p className="text-muted-foreground hidden w-28 shrink-0 truncate text-right text-xs lg:block">
          {row.assignedToName}
        </p>
      )}
      {canAct && (
        <Button
          size="sm"
          variant="outline"
          disabled={complete.isPending}
          onClick={() =>
            complete.mutate({ leadApiId: row.leadApiId as number, followupId: row.followupId as number })
          }
        >
          <Check /> Complete
        </Button>
      )}
    </div>
  );
}

export default function FollowUpsPage() {
  const { isMock } = useDataSource();
  const { can } = useRole();
  const canComplete = can("followups.complete");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "overdue" | "today" | "upcoming">("all");
  const [kind, setKind] = useState<"all" | "payment" | "other">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { rows, count, counts, isLoading } = useFollowUps({
    page,
    pageSize,
    search,
    due: view === "all" ? undefined : view,
    kind: kind === "all" ? undefined : kind,
  });

  // This page's rows, grouped; the section counts are for every page.
  const grouped = {
    overdue: rows.filter((r) => r.bucket === "overdue"),
    today: rows.filter((r) => r.bucket === "today"),
    upcoming: rows.filter((r) => r.bucket === "upcoming"),
  };
  const sections = BUCKETS.filter((b) => view === "all" || b.key === view);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Scheduled touchpoints across all leads, soonest first.
          {isMock && " Previewing mock data."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={view}
            onValueChange={(v) => {
              setView(v as typeof view);
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
              <TabsTrigger value="overdue">Overdue ({counts.overdue})</TabsTrigger>
              <TabsTrigger value="today">Today ({counts.today})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({counts.upcoming})</TabsTrigger>
            </TabsList>
          </Tabs>
          {!isMock && (
            <Select
              value={kind}
              onValueChange={(v) => {
                setKind(v as typeof kind);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
          {!isMock && canComplete && (
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              <Plus /> Add Follow-up
            </Button>
          )}
        </div>
        <div className="relative max-w-sm min-w-[14rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search by lead, phone, purpose, or counselor"
            className="rounded-full pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed py-16 text-center">
          <CalendarClock className="mx-auto size-8 opacity-40" />
          <p className="mt-2 text-sm">
            {view === "all" ? "No follow-ups scheduled." : `No ${view} follow-ups.`}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map(({ key, label, tone }) => {
            const items = grouped[key];
            if (items.length === 0) return null;
            return (
              <section
                key={key}
                className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                  <h2 className={cn("text-sm font-semibold", tone)}>{label}</h2>
                  <span className="text-muted-foreground text-xs font-medium">{counts[key]}</span>
                </div>
                <div className="divide-border divide-y">
                  {items.map((row) => (
                    <FollowUpItem key={row.key} row={row} canComplete={canComplete} />
                  ))}
                </div>
              </section>
            );
          })}
          <ListPager
            page={page}
            pageSize={pageSize}
            count={count}
            noun="follow-ups"
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </div>
      )}

      <ScheduleFollowUpDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        allowLeadPick
      />
    </div>
  );
}
