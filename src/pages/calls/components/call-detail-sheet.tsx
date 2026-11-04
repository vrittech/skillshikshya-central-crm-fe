import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CallItem } from "@/types/calls";

interface CallDetailSheetProps {
  call: CallItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CallDetailSheet({ call, open, onOpenChange }: CallDetailSheetProps) {
  if (!call) return null;

  const renderField = (label: string, value: React.ReactNode) => (
    <div className="py-3 border-b last:border-0 flex flex-col sm:flex-row sm:items-start justify-between text-sm gap-1 sm:gap-4">
      <span className="text-xs text-muted-foreground font-medium shrink-0 sm:w-32">
        {label}
      </span>
      <span className="font-medium sm:text-right min-w-0 break-words text-foreground">
        {value ?? "—"}
      </span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6">
        <SheetHeader className="pb-2 border-b">
          <SheetTitle className="text-lg font-semibold">Call Details</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {renderField(
            "Date & Time",
            call.call_timestamp
              ? new Date(call.call_timestamp).toLocaleString("en-NP")
              : null
          )}
          {renderField("Direction", call.direction)}
          {renderField(
            "Lead",
            call.lead_name
              ? `${call.lead_name} (${call.lead_reference_number ?? ""})`
              : null
          )}
          {renderField("Phone Number", call.phone_number)}
          {renderField("Caller", call.caller)}
          {renderField(
            "Logged By",
            call.created_by_name ?? (call.created_by ? `User #${call.created_by}` : null)
          )}
          {renderField(
            "Duration",
            call.duration_formatted ?? (call.duration_seconds ? `${call.duration_seconds}s` : null)
          )}
          {renderField("Outcome", call.outcome)}
          {renderField("Notes", call.notes)}
          {renderField("Next Action", call.next_action)}
          {renderField("Next Follow-up", call.next_followup_at)}
          {renderField(
            "Recording",
            call.recording_url ? (
              <a
                href={call.recording_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand underline text-xs font-medium"
              >
                Play Recording
              </a>
            ) : null
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}