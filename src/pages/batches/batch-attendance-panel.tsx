import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatchAttendance, useMarkBatchAttendance } from "@/hooks/use-batches";
import { formatDate } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { AttendanceMark, BatchRegister, BatchRegisterRow, CourseBatch } from "@/types";

function Totals({ row }: { row: BatchRegisterRow }) {
  if (!row.total) return <span className="text-muted-foreground text-xs">No marks</span>;
  const pct = Math.round((row.present / row.total) * 100);
  return (
    <span className="text-muted-foreground text-xs">
      Present {row.present} · Absent {row.absent} · {pct}%
    </span>
  );
}

function MarkButtons({
  value,
  disabled,
  onChange,
}: {
  value: AttendanceMark | undefined;
  disabled: boolean;
  onChange: (mark: AttendanceMark) => void;
}) {
  return (
    <div className="flex gap-1">
      {(["present", "absent"] as const).map((mark) => (
        <Button
          key={mark}
          size="sm"
          variant={value === mark ? (mark === "present" ? "brand" : "destructive") : "outline"}
          disabled={disabled}
          aria-pressed={value === mark}
          onClick={() => onChange(mark)}
        >
          {mark === "present" ? "Present" : "Absent"}
        </Button>
      ))}
    </div>
  );
}

/** One day's register. Keyed by the loaded data, so the marks start from what is saved. */
function Register({
  batch,
  register,
  canMark,
  canChange,
  onDate,
}: {
  batch: CourseBatch;
  register: BatchRegister;
  canMark: boolean;
  canChange: boolean;
  onDate: (date: string) => void;
}) {
  const saved = Object.fromEntries(
    register.students.flatMap((r) => (r.student && r.status ? [[r.student, r.status]] : [])),
  ) as Record<number, AttendanceMark>;
  const [marks, setMarks] = useState<Record<number, AttendanceMark>>(saved);
  const save = useMarkBatchAttendance();

  const editable = canMark && !register.closed;
  const locked = (r: BatchRegisterRow) =>
    !editable || r.student == null || (saved[r.student] != null && !canChange);
  const changed = register.students.flatMap((r) =>
    r.student && marks[r.student] && marks[r.student] !== saved[r.student]
      ? [{ student: r.student, status: marks[r.student] }]
      : [],
  );

  const allPresent = () =>
    setMarks((m) => {
      const next = { ...m };
      for (const r of register.students) {
        if (r.student && !locked(r)) next[r.student] = "present";
      }
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="register-date" required>Date</Label>
            <Input
              id="register-date"
              type="date"
              className="w-44"
              value={register.date}
              min={batch.start_date ?? undefined}
              max={register.today}
              onChange={(e) => e.target.value && onDate(e.target.value)}
            />
          </div>
          <p className="text-muted-foreground pb-2 text-xs">
            {register.days.length
              ? `${register.days.length} ${register.days.length === 1 ? "day" : "days"} · Last ${formatDate(register.days[0])}`
              : "No attendance yet"}
          </p>
        </div>
        {register.closed ? (
          <Badge variant="secondary">Closed</Badge>
        ) : (
          editable && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={allPresent} disabled={!register.students.length}>
                All present
              </Button>
              <Button
                variant="brand"
                disabled={!changed.length || save.isPending}
                onClick={() => save.mutate({ id: batch.id, date: register.date, marks: changed })}
              >
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          )
        )}
      </div>

      {register.students.length ? (
        <ul className="divide-border divide-y">
          {register.students.map((r) => (
            <li
              key={r.enrollment}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 py-3",
                r.student && marks[r.student] !== saved[r.student] && "bg-muted/40 -mx-2 px-2",
              )}
            >
              <div className="min-w-0">
                <Link to={`/enrollments/${r.enrollment}`} className="font-medium hover:underline">
                  {r.name}
                </Link>
                <p className="flex flex-wrap items-center gap-x-2 text-xs">
                  {r.student_id && (
                    <span className="text-muted-foreground font-mono">{r.student_id}</span>
                  )}
                  <Totals row={r} />
                </p>
              </div>
              {r.student == null ? (
                <Badge variant="outline">No student record</Badge>
              ) : (
                <MarkButtons
                  value={marks[r.student]}
                  disabled={locked(r)}
                  onChange={(mark) => setMarks((m) => ({ ...m, [r.student as number]: mark }))}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground py-6 text-center text-sm">No students in this batch.</p>
      )}
    </div>
  );
}

/** The batch's attendance: pick a day, mark everyone, see each student's totals. */
export function BatchAttendancePanel({
  batch,
  canMark,
  canChange,
}: {
  batch: CourseBatch;
  canMark: boolean;
  canChange: boolean;
}) {
  const [date, setDate] = useState<string | null>(null);
  const { data, isLoading, dataUpdatedAt } = useBatchAttendance(batch.id, date);

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  return (
    <Register
      key={`${data.date}-${dataUpdatedAt}`}
      batch={batch}
      register={data}
      canMark={canMark}
      canChange={canChange}
      onDate={setDate}
    />
  );
}
