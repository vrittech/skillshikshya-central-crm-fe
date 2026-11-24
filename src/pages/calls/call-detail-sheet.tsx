import type { ReactNode } from "react";
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
import { formatDateTime } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { ApiGlobalCall } from "@/types/calls";

/** Every field renders, with "—" when empty, so the layout never shifts between calls. */
function Field({ label, children, className }: { label: string; children?: ReactNode; className?: string }) {
  const empty = children == null || children === "" || children === false;
  return (
    <div className={className}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm break-words">{empty ? "—" : children}</div>
    </div>
  );
}

const dateTime = (iso: string | null) => (iso ? formatDateTime(iso) : null);

export function CallDetailSheet({ call, onClose }: { call: ApiGlobalCall | null; onClose: () => void }) {
  return (
    <Sheet open={call != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg">
        {call && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                Call details
                <Badge
                  variant="secondary"
                  className={cn(
                    "capitalize",
                    call.direction === "outbound"
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                      : "bg-violet-500/15 text-violet-700 dark:text-violet-300",
                  )}
                >
                  {call.direction}
                </Badge>
              </SheetTitle>
              <SheetDescription>{dateTime(call.call_timestamp)}</SheetDescription>
            </SheetHeader>

            <SheetBody>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                <Field label="Date & time">{dateTime(call.call_timestamp)}</Field>
                <Field label="Direction" className="capitalize">{call.direction}</Field>

                <Field label="Lead">
                  <Link to={`/leads/${call.lead}`} className="text-brand font-semibold hover:underline">
                    {call.lead_name}
                  </Link>
                  <span className="text-muted-foreground block font-mono text-xs">
                    {call.lead_reference_number}
                  </span>
                </Field>
                <Field label="Phone">{call.phone_number}</Field>

                <Field label="Caller">{call.caller != null ? String(call.caller) : null}</Field>
                <Field label="Logged by">{call.created_by_name}</Field>

                <Field label="Duration">{call.duration_formatted}</Field>
                <Field label="Outcome" className="capitalize">
                  {call.outcome ? call.outcome.replace(/_/g, " ") : null}
                </Field>

                <Field label="Notes" className="col-span-2">
                  {call.notes ? <span className="whitespace-pre-wrap">{call.notes}</span> : null}
                </Field>
                <Field label="Next action" className="col-span-2">{call.next_action}</Field>
                <Field label="Next follow-up">{dateTime(call.next_followup_at)}</Field>
                <Field label="Recording">
                  {call.recording_url ? (
                    <a
                      href={call.recording_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      Listen
                    </a>
                  ) : null}
                </Field>
              </div>
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}