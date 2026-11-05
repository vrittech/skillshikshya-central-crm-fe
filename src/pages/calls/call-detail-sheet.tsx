import type { RefObject } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCallTime, recordingLink } from "@/lib/calls-filters";
import type { GlobalCall } from "@/types/calls";

export function CallDetailSheet({
  call,
  onClose,
  returnFocus,
}: {
  call: GlobalCall | null;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const recording = recordingLink(call?.recording_url ?? null);
  const fields = call
    ? [
        ["Date & time (NPT)", formatCallTime(call.call_timestamp, true)],
        ["Direction", call.direction === "inbound" ? "Inbound" : "Outbound"],
        ["Phone", call.phone_number],
        ["Caller", call.caller],
        ["Logged by", call.created_by_name],
        ["Duration", call.duration_formatted],
        ["Outcome", call.outcome],
        ["Notes", call.notes],
        ["Next action", call.next_action],
        ["Next follow-up (NPT)", formatCallTime(call.next_followup_at, true)],
      ]
    : [];

  return (
    <Sheet open={!!call} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus({ preventScroll: true });
        }}
      >
        <SheetHeader>
          <SheetTitle>Call details</SheetTitle>
          <SheetDescription>
            Notes and next steps for this conversation.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {call && (
            <dl className="space-y-5 text-sm">
              <div className="rounded-xl border bg-muted/30 p-4">
                <dt className="text-muted-foreground text-xs">Lead</dt>
                <dd className="mt-1">
                  <Link
                    to={`/leads/${call.lead}`}
                    className="font-semibold hover:underline"
                  >
                    {call.lead_name || "—"}
                  </Link>
                  <p className="text-muted-foreground mt-1 font-mono text-xs">
                    {call.lead_reference_number || "—"}
                  </p>
                </dd>
              </div>
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words">
                    {value || "—"}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-muted-foreground text-xs">Recording</dt>
                <dd className="mt-1">
                  {recording ? (
                    <a
                      href={recording}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand inline-flex items-center gap-1 hover:underline"
                    >
                      Open recording <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
