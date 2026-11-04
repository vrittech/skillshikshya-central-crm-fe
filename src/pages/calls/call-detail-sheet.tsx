import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { CallDirection, CallRow } from "@/types/calls";

const DIRECTION_TONE: Record<CallDirection, string> = {
  inbound: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  outbound: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const FULL_DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeStyle: "medium",
  timeZone: "Asia/Kathmandu",
});

function fullDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${FULL_DATE_TIME.format(d)} NPT`;
}

/** The Log Call dialog used to store the user's id in `caller`; show that user's name instead. */
function callerLabel(c: CallRow) {
  if (c.caller && /^\d+$/.test(c.caller) && Number(c.caller) === c.created_by) {
    return c.created_by_name ?? c.caller;
  }
  return c.caller;
}

/** A recording is only a link when it is a real http(s) address, never javascript: or similar. */
export function RecordingLink({ url, label = "Listen" }: { url: string | null; label?: string }) {
  if (!url) return <span className="text-muted-foreground">—</span>;
  if (!/^https?:\/\//i.test(url)) return <span className="break-all">{url}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-brand underline"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  );
}

function Field({ label, children, wide }: { label: string; children?: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm break-words">{children || "—"}</div>
    </div>
  );
}

export function CallDetailSheet({ call, onClose }: { call: CallRow | null; onClose: () => void }) {
  return (
    <Sheet open={call != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg">
        {call && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 pr-8">
                Call details
                <Badge variant="secondary" className={cn("capitalize", DIRECTION_TONE[call.direction])}>
                  {call.direction}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                <span className="font-mono">{call.lead_reference_number}</span> · {call.lead_name}
              </SheetDescription>
            </SheetHeader>

            <SheetBody>
              <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
                <Field label="Date and time" wide>
                  {fullDateTime(call.call_timestamp)}
                </Field>
                <Field label="Direction">
                  <span className="capitalize">{call.direction}</span>
                </Field>
                <Field label="Duration">
                  {call.duration_seconds != null
                    ? `${call.duration_formatted} (${call.duration_seconds} sec)`
                    : null}
                </Field>
                <Field label="Lead">
                  <Link to={`/leads/${call.lead}`} className="font-medium hover:underline">
                    {call.lead_name}
                  </Link>
                </Field>
                <Field label="Phone">{call.phone_number}</Field>
                <Field label="Caller">{callerLabel(call)}</Field>
                <Field label="Logged by">{call.created_by_name}</Field>
                <Field label="Outcome">
                  {call.outcome ? <span className="capitalize">{call.outcome}</span> : null}
                </Field>
                <Field label="Recording">
                  <RecordingLink url={call.recording_url} label="Open recording" />
                </Field>
              </div>

              <div className="mt-3 grid gap-3 rounded-xl border p-3">
                <Field label="Notes">
                  {call.notes ? <span className="whitespace-pre-wrap">{call.notes}</span> : null}
                </Field>
                <Field label="Next action">{call.next_action}</Field>
                <Field label="Next follow-up">{fullDateTime(call.next_followup_at)}</Field>
              </div>
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}