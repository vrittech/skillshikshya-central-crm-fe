import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatchCloseCheck, useCloseBatch } from "@/hooks/use-batches";
import { formatDate, formatNPR } from "@/lib/leads-format";
import type { BatchCloseCheck, CourseBatch } from "@/types";

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

function Checklist({ check }: { check: BatchCloseCheck }) {
  const { completing, pending, attendance, teams, owing } = check;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Section
        title="Students"
        done
        state={completing.length ? `${completing.length} to complete` : "None"}
      >
        <People
          rows={completing.map((s) => ({
            key: s.enrollment,
            enrollment: s.enrollment,
            name: s.name,
            note: s.status_display,
          }))}
        />
      </Section>

      {pending.length > 0 && (
        <Section title="Pending" done={false} state={`${pending.length} open`}>
          <People
            rows={pending.map((s) => ({
              key: s.enrollment,
              enrollment: s.enrollment,
              name: s.name,
              note: s.status_display,
            }))}
          />
        </Section>
      )}

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
            {attendance.days} {attendance.days === 1 ? "day" : "days"} · Last{" "}
            {formatDate(attendance.last_day ?? undefined)}
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

    </div>
  );
}

/** Close a batch: the checklist and a reason. Open items need Close anyway. */
export function BatchCloseDialog({
  batch,
  open,
  onClose,
}: {
  batch: CourseBatch;
  open: boolean;
  onClose: () => void;
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
          <Checklist check={check.data} />
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
