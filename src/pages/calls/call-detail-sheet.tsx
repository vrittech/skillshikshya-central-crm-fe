import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPhone } from "@/lib/leads-format";
import { formatNepalDateTimeFull } from "@/lib/nepal-time";
import { outcomeLabel } from "@/pages/calls/outcome";
import type { Call } from "@/types/calls";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm break-words whitespace-pre-wrap">{children || "—"}</div>
    </div>
  );
}

export function CallDetailSheet({ call, onClose }: { call: Call | null; onClose: () => void }) {
  return (
    <Sheet open={call != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {call && (
          <>
            <SheetHeader>
              <SheetTitle>Call with {call.lead_name}</SheetTitle>
              <SheetDescription>{formatNepalDateTimeFull(call.call_timestamp)} (NPT)</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <Field label="Direction">
                  <span className="capitalize">{call.direction}</span>
                </Field>
                <Field label="Duration">{call.duration_formatted}</Field>
                <Field label="Lead">
                  <Link to={`/leads/${call.lead}`} className="text-brand font-medium hover:underline">
                    {call.lead_name}
                  </Link>
                  <span className="text-muted-foreground block font-mono text-xs">
                    {call.lead_reference_number}
                  </span>
                </Field>
                <Field label="Phone">{formatPhone(call.phone_number)}</Field>
                <Field label="Caller">{call.caller}</Field>
                <Field label="Logged by">{call.created_by_name}</Field>
                <Field label="Outcome">{outcomeLabel(call.outcome)}</Field>
                <Field label="Next follow-up">
                  {call.next_followup_at && `${formatNepalDateTimeFull(call.next_followup_at)} (NPT)`}
                </Field>
              </div>
              <Field label="Notes">{call.notes}</Field>
              <Field label="Next action">{call.next_action}</Field>
              <Field label="Recording">
                {call.recording_url && (
                  <a
                    href={call.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    Open recording <ExternalLink className="size-3.5" />
                  </a>
                )}
              </Field>
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
