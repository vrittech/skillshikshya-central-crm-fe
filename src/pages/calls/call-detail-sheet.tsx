import { PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CALL_OUTCOMES, labelOf } from "@/data/lead-lookups";
import { formatDateTime, formatDuration, formatMmSs, formatPhone } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { GlobalCall } from "@/types/calls";
import type { CallOutcome } from "@/types/leads";

const FULL_DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeStyle: "medium",
  timeZone: "Asia/Kathmandu",
});

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className={cn("text-sm", !children && "text-muted-foreground")}>{children || "—"}</div>
    </div>
  );
}

/** Full details of one call, opened from a Calls table row. */
export function CallDetailSheet({ call, onClose }: { call: GlobalCall | null; onClose: () => void }) {
  return (
    <Sheet open={call != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        {call && (
          <>
            <SheetHeader>
              <SheetTitle>Call with {call.lead_name}</SheetTitle>
              <SheetDescription>{formatDateTime(call.call_timestamp)}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date & time" className="col-span-2">
                  {FULL_DATETIME_FMT.format(new Date(call.call_timestamp))} NPT
                </Field>
                <Field label="Direction">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize",
                      call.direction === "inbound"
                        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {call.direction === "inbound" ? <PhoneIncoming /> : <PhoneOutgoing />}
                    {call.direction}
                  </Badge>
                </Field>
                <Field label="Duration">
                  {formatMmSs(call.duration_seconds)}
                  {call.duration_seconds > 0 && (
                    <span className="text-muted-foreground"> ({formatDuration(call.duration_seconds)})</span>
                  )}
                </Field>
                <Field label="Lead" className="col-span-2">
                  <Link to={`/leads/${call.lead}`} className="font-semibold hover:underline">
                    {call.lead_name}
                  </Link>
                  <span className="text-muted-foreground ml-2 font-mono text-xs">
                    {call.lead_reference_number}
                  </span>
                </Field>
                <Field label="Phone">{formatPhone(call.phone_number)}</Field>
                <Field label="Caller">{call.caller}</Field>
                <Field label="Logged by">{call.created_by_name}</Field>
                <Field label="Outcome">
                  {call.outcome && labelOf(CALL_OUTCOMES, call.outcome as CallOutcome)}
                </Field>
                <Field label="Notes" className="col-span-2">
                  {call.notes && <p className="whitespace-pre-wrap">{call.notes}</p>}
                </Field>
                <Field label="Next action" className="col-span-2">
                  {call.next_action}
                </Field>
                <Field label="Next follow-up" className="col-span-2">
                  {call.next_followup_at && formatDateTime(call.next_followup_at)}
                </Field>
                <Field label="Recording" className="col-span-2">
                  {call.recording_url && (
                    <a
                      href={call.recording_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand font-medium break-all hover:underline"
                    >
                      Open recording
                    </a>
                  )}
                </Field>
              </div>
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
