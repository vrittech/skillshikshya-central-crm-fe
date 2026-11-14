import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CALL_OUTCOMES } from "@/data/lead-lookups";
import { formatMMSS } from "@/lib/call-duration";
import { formatDateTime } from "@/lib/leads-format";
import type { ApiGlobalCall } from "@/types/calls";

const FULL_FMT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeStyle: "medium",
  timeZone: "Asia/Kathmandu",
});

/** Side panel with every field of one call. Empty fields show "—" so the layout never shifts. */
export function CallDetailSheet({ call, onClose }: { call: ApiGlobalCall | null; onClose: () => void }) {
  const outcome = CALL_OUTCOMES.find((o) => o.value === call?.outcome)?.label ?? call?.outcome;
  const rows: { label: string; value: React.ReactNode }[] = call
    ? [
        { label: "Date & time", value: `${FULL_FMT.format(new Date(call.call_timestamp))} (NPT)`},
        { label: "Direction", value: <span className="capitalize">{call.direction}</span>},
        { label: "Lead", value: <Link to={`/leads/${call.lead}`} className="text-brand font-medium hover:underline">
            {call.lead_name} · {call.lead_reference_number}
          </Link>,
        },
        { label: "Phone", value: call.phone_number},
        { label: "Caller", value: call.caller},
        { label: "Logged by", value: call.created_by_name},
        { label: "Duration", value: formatMMSS(call.duration_seconds)},
        { label: "Outcome", value: outcome},
        { label: "Notes", value: call.notes && <span className="whitespace-pre-wrap">{call.notes}</span>},
        { label: "Next action", value: call.next_action},
        { label: "Next follow-up", value: call.next_followup_at && formatDateTime(call.next_followup_at)},
        { label: "Recording", value: call.recording_url && (
            <a href={call.recording_url} target="_blank" rel="noreferrer" className="text-brand inline-flex items-center gap-1 hover:underline">
              Open recording <ExternalLink className="size-3.5" />
            </a>
          ),
        },
      ]
    : [];

  return (
    <Sheet open={call != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Call details</SheetTitle>
          <SheetDescription>{call ? `${call.lead_name} · ${formatMMSS(call.duration_seconds)}` : ""}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
            {rows.map(({ label, value }) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
