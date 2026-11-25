import { CalendarClock, GraduationCap, Hourglass, Sparkles, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeadListItem } from "@/types/leads";
import { isDueToday, isOverdue, TODAY } from "@/lib/leads-format";

function countEnrolledInMonth(leads: LeadListItem[], year: number, month: number): number {
  return leads.filter((l) => {
    if (l.status !== "enrolled") return false;
    const d = new Date(l.createdAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;
}

function leadsCreatedInWindow(leads: LeadListItem[], startMs: number, endMs: number): number {
  return leads.filter((l) => {
    const t = new Date(l.createdAt).getTime();
    return t >= startMs && t < endMs;
  }).length;
}

export function LeadSummaryCards({
  leads,
  pendingEnrollment,
  pendingActive,
  onPendingClick,
}: {
  leads: LeadListItem[];
  /** Leads whose enrollment is pending, not yet confirmed; undefined while unknown. */
  pendingEnrollment?: number;
  /** The list below shows only those leads. */
  pendingActive: boolean;
  onPendingClick: () => void;
}) {
  const newLeads = leads.filter((l) => l.status === "new").length;
  const dueToday = leads.filter((l) => isDueToday(l.nextFollowUpAt)).length;
  const overdue = leads.filter(
    (l) => l.nextFollowUpAt && isOverdue(l.nextFollowUpAt) && l.status !== "enrolled",
  ).length;
  const enrolled = countEnrolledInMonth(leads, TODAY.getFullYear(), TODAY.getMonth());

  const hotDue = leads.filter((l) => isDueToday(l.nextFollowUpAt) && l.priority === "hot").length;

  // "New leads" delta: week-over-week change.
  const now = TODAY.getTime();
  const week = 7 * 24 * 60 * 60 * 1000;
  const thisWeekNew = leadsCreatedInWindow(leads, now - week, now);
  const prevWeekNew = leadsCreatedInWindow(leads, now - 2 * week, now - week);
  const newLeadsDelta =
    prevWeekNew === 0
      ? thisWeekNew > 0
        ? "new this week"
        : "no change"
      : `${thisWeekNew >= prevWeekNew ? "+" : ""}${Math.round(
          ((thisWeekNew - prevWeekNew) / prevWeekNew) * 100,
        )}% vs last week`;

  // "Enrolled this month" delta: change vs last month.
  const lastMonthEnrolled = countEnrolledInMonth(
    leads,
    TODAY.getMonth() === 0 ? TODAY.getFullYear() - 1 : TODAY.getFullYear(),
    TODAY.getMonth() === 0 ? 11 : TODAY.getMonth() - 1,
  );
  const enrolledDelta =
    lastMonthEnrolled === 0
      ? enrolled > 0
        ? "new this month"
        : "no change"
      : `${enrolled >= lastMonthEnrolled ? "+" : ""}${Math.round(
          ((enrolled - lastMonthEnrolled) / lastMonthEnrolled) * 100,
        )}% vs last month`;

  const cards = [
    {
      label: "New leads",
      value: newLeads,
      icon: Sparkles,
      tone: "text-sky-600 dark:text-sky-400",
      delta: newLeadsDelta,
      deltaTone: "up" as const,
    },
    {
      label: "Follow-ups due today",
      value: dueToday,
      icon: CalendarClock,
      tone: "text-brand",
      delta: hotDue > 0 ? `${hotDue} high priority` : "on track",
      deltaTone: hotDue > 0 ? ("warn" as const) : ("up" as const),
    },
    {
      label: "Overdue follow-ups",
      value: overdue,
      icon: TriangleAlert,
      tone: "text-destructive",
      delta: overdue > 0 ? "needs attention" : "all clear",
      deltaTone: overdue > 0 ? ("warn" as const) : ("up" as const),
    },
    {
      label: "Enrolled this month",
      value: enrolled,
      icon: GraduationCap,
      tone: "text-emerald-600 dark:text-emerald-400",
      delta: enrolledDelta,
      deltaTone: "up" as const,
    },
  ];

  const deltaClass = {
    up: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <button
        type="button"
        aria-pressed={pendingActive}
        onClick={onPendingClick}
        className="focus-visible:ring-brand/50 rounded-xl text-left outline-none focus-visible:ring-[3px]"
      >
        <Card
          className={cn(
            "hover:border-brand/60 h-full gap-2 py-5 transition-colors",
            pendingActive && "border-brand ring-brand/30 ring-2",
          )}
        >
          <CardHeader className="flex-row items-center justify-between">
            <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
              Enrollment pending
            </CardDescription>
            <Hourglass className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-headline text-2xl font-semibold">{pendingEnrollment ?? "—"}</p>
            <span
              className={cn(
                "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold",
                pendingActive ? "bg-brand text-brand-foreground" : deltaClass.warn,
              )}
            >
              {pendingActive ? "Showing list" : "View list"}
            </span>
          </CardContent>
        </Card>
      </button>
      {cards.map((c) => (
        <Card key={c.label} className="gap-2 py-5">
          <CardHeader className="flex-row items-center justify-between">
            <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
              {c.label}
            </CardDescription>
            <c.icon className={cn("size-4", c.tone)} />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-headline text-2xl font-semibold">{c.value}</p>
            <span
              className={cn(
                "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold",
                deltaClass[c.deltaTone],
              )}
            >
              {c.delta}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
