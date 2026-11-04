import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { CallRow } from "@/types/calls";

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm break-words whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

/** Call detail: read-only view of one row from the Calls list. */
export function CallDetailSheet({ call, onClose }: { call: CallRow | null; onClose: () => void }) {
  return (
    <Sheet open={call != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg">
        {call && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {call.lead_name || "—"}
                <Badge
                  variant="secondary"
                  className={cn(
                    "capitalize",
                    call.direction === "inbound"
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  )}
                >
                  {call.direction}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                <span className="font-mono">{call.lead_reference_number || "—"}</span>
              </SheetDescription>
            </SheetHeader>

            <SheetBody>
              <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
                <Field
                  label="Date & time"
                  value={call.call_timestamp ? formatDateTime(call.call_timestamp) : null}
                />
                <Field label="Direction" value={call.direction} />
                <Field label="Lead" value={call.lead_name} />
                <Field label="Phone" value={call.phone_number} />
                <Field label="Caller" value={call.caller} />
                <Field label="Logged by" value={call.created_by_name} />
                <Field label="Duration" value={call.duration_formatted} />
                <Field label="Outcome" value={call.outcome} />
                <Field label="Next action" value={call.next_action} />
                <Field
                  label="Next follow-up"
                  value={call.next_followup_at ? formatDateTime(call.next_followup_at) : null}
                />
                <Field label="Notes" value={call.notes} className="col-span-2" />
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Recording</p>
                  {call.recording_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => window.open(call.recording_url as string, "_blank")}
                    >
                      <ExternalLink /> Open recording
                    </Button>
                  ) : (
                    <p className="text-sm">—</p>
                  )}
                </div>
              </div>
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
