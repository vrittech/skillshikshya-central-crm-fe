import { Link } from "react-router-dom";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCallDuration } from "@/lib/call-duration";
import { callDateTime, recordingUrl } from "@/lib/calls-filters";
import type { GlobalCall } from "@/types/calls";

export function CallDetailSheet({
  call,
  onClose,
  restoreFocus,
}: {
  call: GlobalCall | null;
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const recording = call && recordingUrl(call.recording_url);
  return (
    <Sheet open={call != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <SheetHeader>
          <SheetTitle>Call details</SheetTitle>
          <SheetDescription>Full call record. All times are in Nepal time.</SheetDescription>
        </SheetHeader>
        {call && (
          <SheetBody>
            <dl className="space-y-4 text-sm">
              {[
                ["Date & time (NPT)", callDateTime(call.call_timestamp)],
                ["Direction", call.direction],
                [
                  "Lead",
                  <Link key="lead" className="text-brand underline" to={`/leads/${call.lead}`}>
                    {call.lead_name}
                  </Link>,
                ],
                ["Reference", call.lead_reference_number],
                ["Phone", call.phone_number],
                ["Caller", call.caller],
                ["Logged by", call.created_by_name],
                ["Duration", formatCallDuration(call.duration_seconds ?? 0)],
                ["Outcome", call.outcome],
                ["Notes", call.notes],
                ["Next action", call.next_action],
                ["Next follow-up (NPT)", callDateTime(call.next_followup_at)],
                [
                  "Recording",
                  recording ? (
                    <a
                      key="recording"
                      className="text-brand underline"
                      href={recording}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open recording
                    </a>
                  ) : null,
                ],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-muted-foreground mb-1 text-xs">{label}</dt>
                  <dd className="whitespace-pre-wrap break-words">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
