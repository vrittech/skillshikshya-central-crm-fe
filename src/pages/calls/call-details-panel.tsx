import { Link } from "react-router-dom";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCallDurationMmSs, formatCallTimestampNpt } from "@/lib/calls-page";
import type { GlobalCall } from "@/types/leads-api";

function displayValue(value: string | null | undefined): string {
  return value?.trim() || "—";
}

function CallDetail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b pb-3 last:border-b-0">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  );
}

export function CallDetailsContent({ call }: { call: GlobalCall }) {
  const followupValue = call.next_followup_at;
  const parsedFollowup = followupValue
    ? new Date(followupValue)
    : null;
  const followup =
    parsedFollowup && followupValue && !Number.isNaN(parsedFollowup.getTime())
      ? formatCallTimestampNpt(followupValue)
      : "—";

  return (
    <dl className="grid gap-4">
      <CallDetail label="Date and time (NPT)">
        {formatCallTimestampNpt(call.call_timestamp)}
      </CallDetail>
      <CallDetail label="Direction">
        {call.direction === "inbound"
          ? "Inbound"
          : call.direction === "outbound"
            ? "Outbound"
            : "—"}
      </CallDetail>
      <CallDetail label="Lead">
        {call.lead_name ? (
          <Link
            to={`/leads/${call.lead}`}
            className="text-brand font-medium hover:underline"
          >
            {call.lead_name}
          </Link>
        ) : (
          "—"
        )}
      </CallDetail>
      <CallDetail label="Lead reference">
        {displayValue(call.lead_reference_number)}
      </CallDetail>
      <CallDetail label="Phone number">{displayValue(call.phone_number)}</CallDetail>
      <CallDetail label="Caller">{displayValue(call.caller)}</CallDetail>
      <CallDetail label="Logged by">{displayValue(call.created_by_name)}</CallDetail>
      <CallDetail label="Duration">
        {formatCallDurationMmSs(call.duration_seconds)}
      </CallDetail>
      <CallDetail label="Outcome">{displayValue(call.outcome)}</CallDetail>
      <CallDetail label="Notes">{displayValue(call.notes)}</CallDetail>
      <CallDetail label="Next action">{displayValue(call.next_action)}</CallDetail>
      <CallDetail label="Next follow-up">{followup}</CallDetail>
      <CallDetail label="Recording">
        {call.recording_url ? (
          <a
            href={call.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand inline-flex min-h-10 items-center font-medium hover:underline"
          >
            Open recording
          </a>
        ) : (
          "—"
        )}
      </CallDetail>
    </dl>
  );
}

export function CallDetailsPanel({
  call,
  open,
  onOpenChange,
}: {
  call: GlobalCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-label="Call details"
        className="w-full max-w-full sm:max-w-lg"
      >
        {call && (
          <>
            <SheetHeader className="pr-14">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="truncate">
                    {call.lead_name || "Call details"}
                  </SheetTitle>
                  <SheetDescription className="mt-1">
                    {call.lead_reference_number || "Call record"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <SheetBody className="overscroll-contain">
              <CallDetailsContent call={call} />
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
