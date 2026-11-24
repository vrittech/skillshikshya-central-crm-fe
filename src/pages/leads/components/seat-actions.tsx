import { ArrowRightLeft, LogIn, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
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
import { canSit, isFull, localToday, placementTitle, seatsLabel } from "@/lib/seats";
import type { ApiEnrollment, ApiSeatAction } from "@/types/leads-api";

/** Move and Pause for a seated student, Resume for a paused one, Join batch otherwise. */
export function SeatButtons({
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
        <Button size="sm" variant="outline" onClick={() => onAction("move")}>
          <ArrowRightLeft /> Move
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction("pause")}>
          <Pause /> Pause
        </Button>
      </>
    );
  }
  if (enrollment.seat_state === "paused") {
    return (
      <Button size="sm" variant="outline" onClick={() => onAction("resume")}>
        <Play /> Resume
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => onAction("join")}>
      <LogIn /> Join batch
    </Button>
  );
}

function copy(action: ApiSeatAction, e: ApiEnrollment) {
  const money = e.batch_name;
  switch (action) {
    case "join":
      return {
        title: "Join a batch",
        description: money
          ? `The student takes a seat in the batch. The fees stay on ${money}.`
          : "The student takes a seat in the batch. The fees count on this first batch.",
        confirm: "Join batch",
      };
    case "move":
      return {
        title: "Move to another batch",
        description: `The student's seat moves from ${e.current_batch_name ?? "their batch"}. The fees stay on ${money ?? "the first batch"}, and the new batch lists the student as moved in.`,
        confirm: "Move",
      };
    case "pause":
      return {
        title: "Pause",
        description: `The student leaves ${e.current_batch_name ?? "their batch"} for now and the seat is freed. Resume brings them back.`,
        confirm: "Pause",
      };
    case "resume":
      return {
        title: "Resume",
        description:
          "The student takes a seat again, in the batch they left or another batch of this course.",
        confirm: "Resume",
      };
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
        <div className="grid gap-2">
          <Label required>Batch</Label>
          <Select value={batch || undefined} onValueChange={setBatch} disabled={batchesQ.isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={batchesQ.isLoading ? "Loading batches…" : "Select batch"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((b) => (
                <SelectItem key={b.id} value={String(b.id)} disabled={isFull(b)}>
                  {b.coursebatch_id} — {b.name} · {seatsLabel(b)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!batchesQ.isLoading && options.length === 0 && (
            <p className="text-muted-foreground text-xs">
              No other upcoming or running batch of {enrollment.course_name ?? "this course"}. Add
              one on the Batches page.
            </p>
          )}
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="seat-day" required>
          From
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
    return <p className="text-muted-foreground py-3 text-sm">No seat changes yet.</p>;
  }
  return (
    <ul className="divide-border divide-y">
      {rows.map((p) => (
        <li key={p.id} className="py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{placementTitle(p)}</p>
            <p className="text-muted-foreground text-xs">
              From {formatDate(p.started_on)}
              {p.created_by_name ? ` · by ${p.created_by_name}` : ""}
            </p>
          </div>
          <p className="mt-0.5 text-sm">“{p.reason}”</p>
        </li>
      ))}
    </ul>
  );
}
