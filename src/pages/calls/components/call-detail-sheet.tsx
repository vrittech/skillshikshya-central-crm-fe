import { ExternalLink, Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallDetail } from "@/hooks/use-calls";

interface Props {
  callId: number | null;
  onClose: () => void;
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium break-words">{value || "—"}</p>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

export function CallDetailSheet({ callId, onClose }: Props) {
  const { data: call, isLoading, isError } = useCallDetail(callId);

  return (
    <Sheet
      open={callId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Call details</SheetTitle>
          <SheetDescription>
            View the complete information recorded for this call.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {isError && (
            <p className="text-destructive py-8 text-center text-sm">
              Unable to load call details. Please try again.
            </p>
          )}

          {!isLoading && !isError && call && (
            <div className="space-y-6">
              <div className="bg-surface-container-low rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-headline text-lg font-semibold">
                      {call.lead_name || "Unknown lead"}
                    </p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {call.lead_reference_number || "—"}
                    </p>
                  </div>

                  <Badge
                    variant={call.direction === "inbound" ? "secondary" : "brand"}
                    className="shrink-0 capitalize"
                  >
                    {call.direction}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm">
                  {call.direction === "inbound" ? (
                    <PhoneIncoming className="size-4" />
                  ) : (
                    <PhoneOutgoing className="size-4" />
                  )}
                  <span>{call.phone_number || "No phone number"}</span>
                </div>
              </div>

              <section className="space-y-3">
                <h3 className="font-headline text-sm font-semibold">
                  Call information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Call date"
                    value={formatDateTime(call.call_timestamp)}
                  />
                  <Field
                    label="Duration"
                    value={formatDuration(call.duration_seconds)}
                  />
                  <Field label="Caller" value={call.caller} />
                  <Field label="Outcome" value={call.outcome} />
                  <Field
                    label="Recorded by"
                    value={call.created_by_name}
                  />
                  <Field
                    label="Created at"
                    value={formatDateTime(call.created_at)}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-headline text-sm font-semibold">
                  Notes
                </h3>
                <div className="bg-surface-container-low rounded-xl border p-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {call.notes || "No notes were recorded."}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-headline text-sm font-semibold">
                  Follow-up information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Next follow-up"
                    value={formatDateTime(call.next_followup_at)}
                  />
                  <Field
                    label="Next action"
                    value={call.next_action}
                  />
                </div>
              </section>

              {call.recording_url && (
                <section className="space-y-3">
                  <h3 className="font-headline text-sm font-semibold">
                    Recording
                  </h3>

                  <a
                    href={call.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-2 text-sm underline underline-offset-4"
                  >
                    <Phone className="size-4" />
                    Listen to recording
                    <ExternalLink className="size-3" />
                  </a>
                </section>
              )}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}