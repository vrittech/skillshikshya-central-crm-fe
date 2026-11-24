import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatchPending, useBatchStudents } from "@/hooks/use-batches";
import { formatDate, formatNPR } from "@/lib/leads-format";
import type { BatchStudentRow } from "@/types";
import type { ApiEnrollmentListRow } from "@/types/leads-api";

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
        <Link to={`/enrollments/${row.enrollment}`} className="font-medium hover:underline">
          {row.name}
        </Link>
        <p className="text-muted-foreground text-xs">
          {row.student_id ? <span className="font-mono">{row.student_id}</span> : "—"}
          {row.phone ? ` · ${row.phone}` : ""}
          {row.moved_in && row.money_batch_name ? ` · Fees on ${row.money_batch_name}` : ""}
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

function PendingRow({ row }: { row: ApiEnrollmentListRow }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <Link to={`/enrollments/${row.id}`} className="font-medium hover:underline">
          {row.lead_name}
        </Link>
        <p className="text-muted-foreground text-xs">
          {formatNPR(Number(row.agreed_amount))} · {formatDate(row.enrollment_date ?? undefined)}
        </p>
      </div>
      <Badge variant="warning">Pending</Badge>
    </li>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">
        {title} ({count})
      </h3>
      {children}
    </section>
  );
}

/** The students in a batch, the ones paused from it, and pending enrollments waiting for a seat. */
export function BatchStudentsPanel({ batchId }: { batchId: number }) {
  const { data, isLoading } = useBatchStudents(batchId);
  const pendingQ = useBatchPending(batchId);
  const seated = data?.seated ?? [];
  const paused = data?.paused ?? [];
  const pending = pendingQ.data?.results ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Students" count={seated.length}>
        {seated.length ? (
          <ul className="divide-border divide-y">
            {seated.map((r) => (
              <StudentRow key={r.enrollment} row={r} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground py-3 text-sm">No students.</p>
        )}
      </Section>
      {pending.length > 0 && (
        <Section title="Pending" count={pending.length}>
          <ul className="divide-border divide-y">
            {pending.map((r) => (
              <PendingRow key={r.id} row={r} />
            ))}
          </ul>
        </Section>
      )}
      {paused.length > 0 && (
        <Section title="Paused" count={paused.length}>
          <ul className="divide-border divide-y">
            {paused.map((r) => (
              <StudentRow key={r.enrollment} row={r} paused />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
