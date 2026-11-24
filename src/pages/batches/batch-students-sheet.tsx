import { Link } from "react-router-dom";
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
import { useBatchStudents } from "@/hooks/use-batches";
import { formatDate } from "@/lib/leads-format";
import type { BatchStudentRow, CourseBatch } from "@/types";

/** How the student came to sit here: joined, moved in from A, or resumed. */
function HowBadge({ row }: { row: BatchStudentRow }) {
  if (row.how === "move") {
    return <Badge variant="warning">Moved from {row.from_batch_name ?? "another batch"}</Badge>;
  }
  if (row.how === "resume") return <Badge variant="outline">Resumed</Badge>;
  return <Badge variant="secondary">Joined</Badge>;
}

function StudentRow({ row, paused = false }: { row: BatchStudentRow; paused?: boolean }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <Link to={`/leads/${row.lead}`} className="font-medium hover:underline">
          {row.name}
        </Link>
        <p className="text-muted-foreground text-xs">
          {row.student_id ? <span className="font-mono">{row.student_id}</span> : "Not a student yet"}
          {row.phone ? ` · ${row.phone}` : ""}
        </p>
        {row.moved_in && row.money_batch_name && (
          <p className="text-muted-foreground mt-0.5 text-xs">
            Fees count on {row.money_batch_name}, not this batch.
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        {paused ? <Badge variant="outline">Paused</Badge> : <HowBadge row={row} />}
        <span className="text-muted-foreground text-xs">
          {paused ? "Since" : "From"} {formatDate(row.since ?? undefined)}
        </span>
      </div>
    </li>
  );
}

/** Who sits in a batch now, who moved in from another batch, and who is paused out of it. */
export function BatchStudentsSheet({
  batch,
  onClose,
}: {
  batch: CourseBatch | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useBatchStudents(batch?.id ?? null);
  const seated = data?.seated ?? [];
  const paused = data?.paused ?? [];
  const movedIn = seated.filter((r) => r.moved_in).length;

  return (
    <Sheet open={batch != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{batch?.name ?? "Batch"}</SheetTitle>
          <SheetDescription>
            <span className="font-mono">{batch?.coursebatch_id}</span>
            {batch?.course_name ? ` · ${batch.course_name}` : ""}
            {batch
              ? batch.capacity == null
                ? ` · ${batch.seats_taken ?? 0} seated, no seat limit`
                : ` · ${batch.seats_taken ?? 0} of ${batch.capacity} seats taken`
              : ""}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold">Sitting now ({seated.length})</h3>
                {movedIn > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {movedIn} moved in from another batch. Their fees count on the batch they
                    first joined, so this batch's revenue leaves them out.
                  </p>
                )}
                {seated.length ? (
                  <ul className="divide-border divide-y">
                    {seated.map((r) => (
                      <StudentRow key={r.enrollment} row={r} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground py-3 text-sm">No one sits in this batch.</p>
                )}
              </section>
              {paused.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold">Paused from this batch ({paused.length})</h3>
                  <ul className="divide-border divide-y">
                    {paused.map((r) => (
                      <StudentRow key={r.enrollment} row={r} paused />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
