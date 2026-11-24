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

/** How the student came into this batch: joined, moved from A, or resumed. */
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
          {row.student_id ? <span className="font-mono">{row.student_id}</span> : "—"}
          {row.phone ? ` · ${row.phone}` : ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {paused ? <Badge variant="outline">Paused</Badge> : <HowBadge row={row} />}
        <span className="text-muted-foreground text-xs">
          {formatDate(row.since ?? undefined)}
        </span>
      </div>
    </li>
  );
}

/** The students in a batch, and the ones paused from it. */
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

  return (
    <Sheet open={batch != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{batch?.name ?? "Batch"}</SheetTitle>
          <SheetDescription>
            <span className="font-mono">{batch?.coursebatch_id}</span>
            {batch?.course_name ? ` · ${batch.course_name}` : ""}
            {batch
              ? ` · Seats ${batch.seats_taken ?? 0}${batch.capacity == null ? "" : ` / ${batch.capacity}`}`
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
                <h3 className="text-sm font-semibold">Students ({seated.length})</h3>
                {seated.length ? (
                  <ul className="divide-border divide-y">
                    {seated.map((r) => (
                      <StudentRow key={r.enrollment} row={r} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground py-3 text-sm">No students.</p>
                )}
              </section>
              {paused.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold">Paused ({paused.length})</h3>
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
