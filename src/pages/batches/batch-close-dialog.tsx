import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatchCloseCheck, useCloseBatch, useCompleteBatchStudents } from "@/hooks/use-batches";
import { formatDate, formatNPR } from "@/lib/leads-format";
import type { BatchCloseCheck, CourseBatch } from "@/types";

const STUDYING = ["confirmed", "active"];

function Section({
  title,
  done,
  info = false,
  state,
  action,
  children,
}: {
  title: string;
  done: boolean;
  /** Shown for information; never blocks the close. */
  info?: boolean;
  state: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="border-b pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{title}</h4>
          <Badge variant={done ? "secondary" : info ? "outline" : "warning"}>{state}</Badge>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function People({ rows }: { rows: { key: string | number; enrollment: number; name: string; note: string }[] }) {
  if (!rows.length) return null;
  return (
    <ul className="mt-1.5 max-h-28 space-y-1 overflow-y-auto text-xs">
      {rows.map((r) => (
        <li key={r.key} className="flex justify-between gap-3">
          <Link to={`/enrollments/${r.enrollment}`} className="truncate hover:underline">
            {r.name}
          </Link>
          <span className="text-muted-foreground shrink-0">{r.note}</span>
        </li>
      ))}
    </ul>
  );
}

/** Mounted only while open, so everyone studying starts picked. */
function CompleteStudentsDialog({
  batch,
  check,
  onClose,
}: {
  batch: CourseBatch;
  check: BatchCloseCheck;
  onClose: () => void;
}) {
  const studying = check.students.filter((s) => STUDYING.includes(s.status));
  const [picked, setPicked] = useState(() => studying.map((s) => s.enrollment));
  const complete = useCompleteBatchStudents();

  return (
    <ReasonDialog
      open
      onClose={onClose}
      title="Mark completed"
      description={batch.name}
      confirmLabel="Mark completed"
      pending={complete.isPending}
      confirmDisabled={!picked.length}
      onConfirm={(reason) =>
        complete.mutate({ id: batch.id, reason, enrollments: picked }, { onSuccess: onClose })
      }
    >
      <ul className="max-h-48 space-y-2 overflow-y-auto">
        {studying.map((s) => (
          <li key={s.enrollment} className="flex items-center gap-2">
            <Checkbox
              id={`complete-${s.enrollment}`}
              checked={picked.includes(s.enrollment)}
              onCheckedChange={(on) =>
                setPicked((p) =>
                  on ? [...p, s.enrollment] : p.filter((id) => id !== s.enrollment),
                )
              }
            />
            <Label htmlFor={`complete-${s.enrollment}`} className="font-normal">
              {s.name}
            </Label>
            <span className="text-muted-foreground ml-auto text-xs">{s.status_display}</span>
          </li>
        ))}
      </ul>
    </ReasonDialog>
  );
}

function Checklist({
  batch,
  check,
  canComplete,
}: {
  batch: CourseBatch;
  check: BatchCloseCheck;
  canComplete: boolean;
}) {
  const [completing, setCompleting] = useState(false);
  const { students, attendance, teams, owing } = check;
  const studying = students.filter((s) => STUDYING.includes(s.status)).length;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Section
        title="Students"
        done={!students.length}
        state={students.length ? `${students.length} open` : "Done"}
        action={
          canComplete && studying > 0 ? (
            <Button size="sm" variant="outline" onClick={() => setCompleting(true)}>
              Mark completed
            </Button>
          ) : undefined
        }
      >
        <People
          rows={students.map((s) => ({
            key: s.enrollment,
            enrollment: s.enrollment,
            name: s.name,
            note: s.status_display,
          }))}
        />
      </Section>

      <Section
        title="Attendance"
        done={attendance.ready}
        state={
          attendance.none_taken
            ? "Not taken"
            : attendance.missing.length
              ? `${attendance.missing.length} missing`
              : "Done"
        }
      >
        {attendance.days > 0 && (
          <p className="text-muted-foreground mt-1 text-xs">
            {attendance.days} days · Last {formatDate(attendance.last_day ?? undefined)}
          </p>
        )}
        <People
          rows={attendance.missing.map((m) => ({
            key: m.enrollment,
            enrollment: m.enrollment,
            name: m.name,
            note: `${m.missing} ${m.missing === 1 ? "day" : "days"} missing`,
          }))}
        />
      </Section>

      <Section
        title="Teams licences"
        done={!teams.length}
        state={teams.length ? `${teams.length} still out` : "Done"}
        action={
          teams.length ? (
            <Button size="sm" variant="ghost" asChild>
              <Link to="/teams">Open Teams</Link>
            </Button>
          ) : undefined
        }
      >
        <People
          rows={teams.map((t) => ({
            key: t.licence,
            enrollment: t.enrollment,
            name: t.name,
            note: t.account,
          }))}
        />
      </Section>

      <Section
        title="Who owes"
        done={!owing.count}
        info
        state={
          owing.count
            ? `${formatNPR(Number(owing.total))} · ${owing.count} ${owing.count === 1 ? "student" : "students"}`
            : "Nothing owed"
        }
      >
        <People
          rows={owing.people.map((p) => ({
            key: p.enrollment,
            enrollment: p.enrollment,
            name: p.name,
            note: formatNPR(Number(p.owed)),
          }))}
        />
      </Section>

      {completing && (
        <CompleteStudentsDialog batch={batch} check={check} onClose={() => setCompleting(false)} />
      )}
    </div>
  );
}

/** Close a batch: the checklist, Mark completed, and a reason. Open items need Close anyway. */
export function BatchCloseDialog({
  batch,
  open,
  onClose,
  canComplete,
}: {
  batch: CourseBatch;
  open: boolean;
  onClose: () => void;
  canComplete: boolean;
}) {
  const check = useBatchCloseCheck(batch.id, open);
  const close = useCloseBatch();
  const [closeAnyway, setCloseAnyway] = useState(false);
  const ready = check.data?.ready ?? false;

  useEffect(() => {
    if (open) setCloseAnyway(false);
  }, [open]);

  return (
    <ReasonDialog
      open={open}
      onClose={onClose}
      title="Close batch"
      description={batch.name}
      confirmLabel="Close batch"
      destructive
      pending={close.isPending}
      confirmDisabled={!check.data || check.isFetching || (!ready && !closeAnyway)}
      onConfirm={(reason) =>
        close.mutate(
          { id: batch.id, reason, closeAnyway: !ready && closeAnyway },
          { onSuccess: onClose, onError: () => void check.refetch() },
        )
      }
    >
      {check.data ? (
        <>
          <Checklist batch={batch} check={check.data} canComplete={canComplete} />
          {!ready && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="close-anyway"
                checked={closeAnyway}
                onCheckedChange={(on) => setCloseAnyway(on === true)}
              />
              <Label htmlFor="close-anyway" className="font-normal">
                Close anyway
              </Label>
            </div>
          )}
        </>
      ) : (
        <Skeleton className="h-48 w-full rounded-lg" />
      )}
    </ReasonDialog>
  );
}
