import {
  Bell,
  CalendarClock,
  FileText,
  GraduationCap,
  Layers,
  Mail,
  Mic,
  MonitorSmartphone,
  PhoneCall,
  StickyNote,
  UserRound,
  Wallet,
  Waypoints,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeadTimeline } from "@/hooks/use-voice-notes";
import { changeText } from "@/lib/history-format";
import { formatDateTime, formatDuration, formatNPR } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { ApiTimelineItem, ApiTimelineKind } from "@/types/leads-api";
import { VoiceNotePlayer } from "./voice-notes";

const KINDS: { value: ApiTimelineKind; label: string }[] = [
  { value: "enquiry", label: "Enquiries" },
  { value: "call", label: "Calls" },
  { value: "note", label: "Notes" },
  { value: "follow_up", label: "Follow-ups" },
  { value: "voice_note", label: "Voice notes" },
  { value: "enrollment", label: "Enrollments" },
  { value: "batch", label: "Batches" },
  { value: "money", label: "Money" },
  { value: "teams", label: "Teams" },
  { value: "reminder", label: "Reminders" },
  { value: "email", label: "Emails" },
  { value: "document", label: "Documents" },
  { value: "lead", label: "Lead" },
];

const ICONS: Record<ApiTimelineKind, React.ComponentType<{ className?: string }>> = {
  lead: UserRound,
  enquiry: Waypoints,
  call: PhoneCall,
  note: StickyNote,
  follow_up: CalendarClock,
  voice_note: Mic,
  enrollment: GraduationCap,
  batch: Layers,
  money: Wallet,
  teams: MonitorSmartphone,
  reminder: Bell,
  document: FileText,
  email: Mail,
};

const TONES: Partial<Record<ApiTimelineKind, string>> = {
  enquiry: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  call: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  follow_up: "bg-brand-fixed-dim/25 text-brand-container",
  voice_note: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  enrollment: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  batch: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  money: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  teams: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  email: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
};

function hasChanges(i: ApiTimelineItem) {
  return Object.keys(i.before ?? {}).length > 0 || Object.keys(i.after ?? {}).length > 0;
}

function Row({ leadId, item: i, last }: { leadId: number; item: ApiTimelineItem; last: boolean }) {
  const Icon = ICONS[i.kind] ?? StickyNote;
  const tone = TONES[i.kind] ?? "bg-muted text-muted-foreground";
  const due = i.kind === "follow_up" ? (i.after?.due as string | undefined) : undefined;
  const facts = [
    i.amount != null && formatNPR(Number(i.amount)),
    i.kind === "call" && i.duration_seconds ? formatDuration(i.duration_seconds) : null,
    due && `Due ${formatDateTime(due)}`,
  ].filter(Boolean);

  return (
    <li className="relative flex gap-3 pb-5">
      {!last && <span className="bg-border absolute top-9 left-[15px] h-full w-px" />}
      <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-medium">
            {i.title}
            {i.course && (
              <span className="text-muted-foreground font-normal">
                {" · "}
                {i.enrollment != null ? (
                  <Link to={`/enrollments/${i.enrollment}`} className="hover:text-foreground hover:underline">
                    {i.course}
                  </Link>
                ) : (
                  i.course
                )}
              </span>
            )}
          </p>
          <time className="text-muted-foreground shrink-0 text-xs">{formatDateTime(i.at)}</time>
        </div>
        {facts.length > 0 && <p className="text-sm">{facts.join(" · ")}</p>}
        {i.detail && <p className="text-muted-foreground text-sm">{i.detail}</p>}
        {i.kind !== "follow_up" && hasChanges(i) && (
          <p className="text-muted-foreground text-xs">{changeText(i.before ?? {}, i.after ?? {})}</p>
        )}
        {i.voice_note != null && (
          <VoiceNotePlayer leadId={leadId} id={i.voice_note} seconds={i.duration_seconds} />
        )}
        {i.by && <p className="text-muted-foreground text-xs">By {i.by}</p>}
      </div>
    </li>
  );
}

/** Everything about the lead in one list, newest first, with one kind at a time if picked. */
export function LeadTimeline({ leadId }: { leadId: number }) {
  const { data, isLoading } = useLeadTimeline(leadId);
  const [kind, setKind] = useState<ApiTimelineKind | "all">("all");
  const items = data ?? [];
  const present = KINDS.filter((k) => items.some((i) => i.kind === k.value));
  const shown = kind === "all" ? items : items.filter((i) => i.kind === kind);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <div className="space-y-5">
      {present.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {[{ value: "all" as const, label: "All" }, ...present].map((k) => (
            <button
              key={k.value}
              type="button"
              aria-pressed={kind === k.value}
              onClick={() => setKind(k.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                kind === k.value
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">No history.</p>
      ) : (
        <ol className="relative">
          {shown.map((i, n) => (
            <Row key={i.id} leadId={leadId} item={i} last={n === shown.length - 1} />
          ))}
        </ol>
      )}
    </div>
  );
}
