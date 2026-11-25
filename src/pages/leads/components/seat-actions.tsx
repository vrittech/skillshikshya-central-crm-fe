import { ArrowRightLeft, LogIn, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourseBatches } from "@/hooks/use-batches";
import { useSeatAction } from "@/hooks/use-leads";
import { formatDate } from "@/lib/leads-format";
import { batchOption, canSit, localToday, placementTitle, takesNoOne } from "@/lib/seats";
import type { ApiEnrollment, ApiSeatAction } from "@/types/leads-api";

/** Change batch and Pause for a seated student, Resume for a paused one, Add to batch otherwise. */
export function SeatMenuItems({
  enrollment,
  onAction,
}: {
  enrollment: ApiEnrollment;
  onAction: (action: ApiSeatAction) => void;
}) {
  if (!canSit(enrollment)) return null;
  if (enrollment.seat_state === "seated") {
    return (
      <>
        <DropdownMenuItem onSelect={() => onAction("move")}>
          <ArrowRightLeft className="size-4" /> Change batch
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("pause")}>
          <Pause className="size-4" /> Pause
        </DropdownMenuItem>
      </>
    );
  }
  if (enrollment.seat_state === "paused") {
    return (
      <DropdownMenuItem onSelect={() => onAction("resume")}>
        <Play className="size-4" /> Resume
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem onSelect={() => onAction("join")}>
      <LogIn className="size-4" /> Add to batch
    </DropdownMenuItem>
  );
}

function copy(action: ApiSeatAction, e: ApiEnrollment) {
  const current = e.current_batch_name ? `Current batch: ${e.current_batch_name}` : undefined;
  switch (action) {
    case "join":
      return { title: "Add to batch", description: undefined, confirm: "Add to batch" };
    case "move":
      return { title: "Change batch", description: current, confirm: "Change batch" };
    case "pause":
      return { title: "Pause enrollment", description: current, confirm: "Pause" };
    case "resume":
      return { title: "Resume enrollment", description: undefined, confirm: "Resume" };
  }
}

/** Asks for the batch (join, move, resume), the day and the reason, then runs the action. */
export function SeatDialog({
  leadId,
  enrollment,
  action,
  onClose,
}: {
  leadId?: number;
  enrollment: ApiEnrollment;
  action: ApiSeatAction | null;
  onClose: () => void;
}) {
  const open = action != null;
  const needsBatch = action != null && action !== "pause";
  const [batch, setBatch] = useState("");
  const [day, setDay] = useState(localToday());
  const seat = useSeatAction(leadId);
  // Only upcoming and running batches of this course take students.
  const batchesQ = useCourseBatches(
    {
      course: enrollment.course,
      status: ["upcoming", "running"],
      is_active: true,
      page_size: 100,
    },
    open && needsBatch,
  );
  const options = (batchesQ.data?.results ?? []).filter(
    (b) => action !== "move" || b.id !== enrollment.current_batch,
  );
  const pausedFrom = enrollment.placements?.[0]?.from_batch ?? null;

  useEffect(() => {
    if (!open) return;
    setBatch(action === "resume" && pausedFrom != null ? String(pausedFrom) : "");
    setDay(localToday());
  }, [open, action, pausedFrom]);

  if (action == null) return null;
  const text = copy(action, enrollment);

  return (
    <ReasonDialog
      open={open}
      onClose={onClose}
      title={text.title}
      description={text.description}
      confirmLabel={text.confirm}
      pending={seat.isPending}
      confirmDisabled={(needsBatch && !batch) || !day}
      onConfirm={(reason) =>
        seat.mutate(
          {
            id: enrollment.id,
            action,
            body: { reason, started_on: day, ...(needsBatch ? { batch: Number(batch) } : {}) },
          },
          { onSuccess: onClose },
        )
      }
    >
      {needsBatch && (
        <div className="grid min-w-0 gap-2">
          <Label required>Batch</Label>
          <Select value={batch || undefined} onValueChange={setBatch} disabled={batchesQ.isLoading}>
            <SelectTrigger className="min-w-0 [&>span]:text-ellipsis">
              <SelectValue placeholder={batchesQ.isLoading ? "Loading batches…" : "Select batch"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((b) => (
                <SelectItem key={b.id} value={String(b.id)} disabled={takesNoOne(b)}>
                  {batchOption(b)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!batchesQ.isLoading && options.length === 0 && (
            <p className="text-muted-foreground text-xs">No batches available.</p>
          )}
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="seat-day" required>
          Date
        </Label>
        <Input id="seat-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
    </ReasonDialog>
  );
}

/** Every seat change of the enrollment, newest first. */
export function SeatHistoryList({ enrollment }: { enrollment: ApiEnrollment }) {
  const rows = enrollment.placements ?? [];
  if (!rows.length) {
    return <p className="text-muted-foreground py-3 text-sm">No batch history.</p>;
  }
  return (
    <ul className="divide-border divide-y">
      {rows.map((p) => (
        <li key={p.id} className="py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{placementTitle(p)}</p>
            <p className="text-muted-foreground text-xs">
              {formatDate(p.started_on)}
              {p.created_by_name ? ` · by ${p.created_by_name}` : ""}
            </p>
          </div>
          <p className="mt-0.5 text-sm">“{p.reason}”</p>
        </li>
      ))}
    </ul>
  );
}
