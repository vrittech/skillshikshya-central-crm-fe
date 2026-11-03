import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import type { ApiGlobalCall } from "@/types/leads-api";
import { formatDate, formatDuration } from "./Date.tsx";

export const CallDetails = ({
  call,
  onClose,
}: {
  call: ApiGlobalCall | null;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  return (
    <Sheet open={call != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Call details</SheetTitle>
          <SheetDescription>
            {call ? formatDate(call.call_timestamp) : ""}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {call && (
            <div className="space-y-5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Lead</p>
                  <button
                    className="text-brand mt-1 font-semibold hover:underline"
                    onClick={() => {
                      navigate(`/leads/${call.lead}`);
                      onClose();
                    }}
                  >
                    {call.lead_name}
                  </button>
                  <p className="text-muted-foreground font-mono text-xs">
                    {call.lead_reference_number}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {call.direction}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Phone", call.phone_number],
                  ["Caller", call.caller],
                  ["Logged by", call.created_by_name],
                  ["Duration", formatDuration(call.duration_seconds)],
                  ["Outcome", call.outcome],
                  ["Next action", call.next_action],
                  [
                    "Next follow-up",
                    call.next_followup_at
                      ? formatDate(call.next_followup_at)
                      : null,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="mt-1 break-words">{value || "—"}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Notes</p>
                <p className="mt-1 whitespace-pre-wrap">{call.notes || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Recording</p>
                {call.recording_url ? (
                  <a
                    className="text-brand mt-1 inline-block hover:underline"
                    href={call.recording_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Listen to recording
                  </a>
                ) : (
                  <p className="mt-1">—</p>
                )}
              </div>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
