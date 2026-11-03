import { Link } from "react-router-dom";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/leads-format";
import type { CallRow } from "@/types/calls";

function formatCallDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NP", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kathmandu",
    timeZoneName: "short",
  }).format(date);
}

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function DetailField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${className}`}>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{display(value)}</dd>
    </div>
  );
}

export function CallDetailSheet({
  call,
  onClose,
}: {
  call: CallRow | null;
  onClose: () => void;
}) {
  const isOpen = call !== null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Call details</SheetTitle>
          <SheetDescription>
            {call ? `Call #${call.id}` : "Details for the selected call."}
          </SheetDescription>
        </SheetHeader>
        {call && (
          <SheetBody>
            <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField
                label="Date and time (Nepal)"
                value={formatCallDateTime(call.call_timestamp)}
                className="sm:col-span-2"
              />
              <DetailField label="Direction" value={call.direction} />
              <div className="min-w-0 rounded-xl border p-3">
                <dt className="text-muted-foreground text-xs font-medium">Lead</dt>
                <dd className="mt-1 min-w-0 break-words text-sm">
                  <Link
                    to={`/leads/${call.lead}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {display(call.lead_name)}
                  </Link>
                  <span className="text-muted-foreground block font-mono text-xs">
                    {display(call.lead_reference_number)}
                  </span>
                </dd>
              </div>
              <DetailField label="Phone" value={call.phone_number} />
              <DetailField label="Caller" value={call.caller.trim() || null} />
              <DetailField label="Logged by" value={call.created_by_name} />
              <DetailField label="Duration" value={call.duration_formatted} />
              <DetailField label="Outcome" value={call.outcome} />
              <DetailField label="Notes" value={call.notes} className="sm:col-span-2" />
              <DetailField label="Next action" value={call.next_action} className="sm:col-span-2" />
              <DetailField
                label="Next follow-up"
                value={call.next_followup_at ? formatDateTime(call.next_followup_at) : null}
                className="sm:col-span-2"
              />
              <div className="min-w-0 rounded-xl border p-3 sm:col-span-2">
                <dt className="text-muted-foreground text-xs font-medium">Recording</dt>
                <dd className="mt-1 break-all text-sm">
                  {call.recording_url ? (
                    <a
                      href={call.recording_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      {call.recording_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
