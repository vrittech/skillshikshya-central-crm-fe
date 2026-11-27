import { CalendarClock, GraduationCap, Hourglass, Sparkles, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeadSummary } from "@/services/leads.service";

interface Counts {
  newLeads: number;
  newThisWeek: number;
  newLastWeek: number;
  dueToday: number;
  hotDue: number;
  overdue: number;
  enrolled: number;
  enrolledLastMonth: number;
}

/** The server counts every lead the user can see, not just this page. */
function liveCounts(s: LeadSummary): Counts {
  return {
    newLeads: s.new_this_week,
    newThisWeek: s.new_this_week,
    newLastWeek: s.new_last_week,
    dueToday: s.followups_today,
    hotDue: 0,
    overdue: s.followups_overdue,
    enrolled: s.enrolled_this_month,
    enrolledLastMonth: s.enrolled_last_month,
  };
}

function change(now: number, before: number, period: string) {
  if (before === 0) return now > 0 ? `new this ${period}` : "no change";
  return `${now >= before ? "+" : ""}${Math.round(((now - before) / before) * 100)}% vs last ${period}`;
}

export function LeadSummaryCards({
  summary,
  pendingActive,
  onPendingClick,
}: {
  /** The counts from GET /api/leads/summary/; undefined while loading. */
  summary?: LeadSummary;
  /** The list below shows only those leads. */
  pendingActive: boolean;
  onPendingClick: () => void;
}) {
  // Counts are unknown until the summary loads: the cards show "—".
  const counts = summary ? liveCounts(summary) : null;
  const pendingEnrollment = summary?.pending_enrollment;
  const shown = (pick: (c: Counts) => number) => (counts ? pick(counts) : "—");
  const newLeadsDelta = counts ? change(counts.newThisWeek, counts.newLastWeek, "week") : "";
  const enrolledDelta = counts ? change(counts.enrolled, counts.enrolledLastMonth, "month") : "";
  const hotDue = counts?.hotDue ?? 0;
  const overdue = counts?.overdue ?? 0;

  const cards = [
    {
      label: "New leads",
      value: shown((c) => c.newLeads),
      icon: Sparkles,
      tone: "text-sky-600 dark:text-sky-400",
      delta: newLeadsDelta,
      deltaTone: "up" as const,
    },
    {
      label: "Follow-ups due today",
      value: shown((c) => c.dueToday),
      icon: CalendarClock,
      tone: "text-brand",
      delta: !counts ? "" : hotDue > 0 ? `${hotDue} high priority` : "on track",
      deltaTone: hotDue > 0 ? ("warn" as const) : ("up" as const),
    },
    {
      label: "Overdue follow-ups",
      value: shown((c) => c.overdue),
      icon: TriangleAlert,
      tone: "text-destructive",
      delta: !counts ? "" : overdue > 0 ? "needs attention" : "all clear",
      deltaTone: overdue > 0 ? ("warn" as const) : ("up" as const),
    },
    {
      label: "Enrolled this month",
      value: shown((c) => c.enrolled),
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
            {c.delta && (
              <span
                className={cn(
                  "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold",
                  deltaClass[c.deltaTone],
                )}
              >
                {c.delta}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
