import { Plus, X } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useEnrollmentReminders, useSetDueDates } from "@/hooks/use-leads";
import {
  addMonths,
  currentParts,
  daysText,
  partsAreValid,
  splitEvenly,
  sumParts,
} from "@/lib/due-dates";
import { formatDate, formatDateTime, formatNPR } from "@/lib/leads-format";
import { localToday } from "@/lib/seats";
import { cn } from "@/lib/utils";
import type {
  ApiDuePart,
  ApiDueRow,
  ApiDueStatus,
  ApiEnrollment,
  ApiReminderLog,
} from "@/types/leads-api";

/* ------------------------------------------------------------ the list */

const STATUS_TEXT: Record<ApiDueStatus, string> = {
  paid: "Paid",
  part_paid: "Part paid",
  due: "Due",
  late: "Late",
};

const STATUS_TONE: Record<ApiDueStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  part_paid: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  due: "bg-muted text-muted-foreground",
  late: "bg-destructive/10 text-destructive",
};

function DueStatusPill({ row }: { row: ApiDueRow }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_TONE[row.status],
      )}
    >
      {STATUS_TEXT[row.status]}
      {row.status === "late" ? ` · ${daysText(row.days_late)}` : ""}
    </span>
  );
}

/** Due dates of an enrollment, oldest first, with what is paid on each. */
export function DueDatesList({ rows }: { rows: ApiDueRow[] }) {
  if (!rows.length) return <p className="text-muted-foreground py-3 text-sm">No due dates.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground text-left text-xs">
          <th className="py-1.5 font-medium">Due date</th>
          <th className="py-1.5 text-right font-medium">Amount</th>
          <th className="py-1.5 text-right font-medium">Paid</th>
          <th className="py-1.5 text-right font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-border divide-y">
        {rows.map((r, i) => (
          <tr key={`${r.kind}-${r.due_on}-${i}`}>
            <td className="py-2">
              {r.due_on ? formatDate(r.due_on) : "—"}
              {r.kind === "extra_charge" && (
                <span className="text-muted-foreground ml-1.5 text-xs">Extra charge</span>
              )}
            </td>
            <td className="py-2 text-right tabular-nums">{formatNPR(Number(r.amount))}</td>
            <td className="py-2 text-right tabular-nums">{formatNPR(Number(r.paid))}</td>
            <td className="py-2 text-right">
              <DueStatusPill row={r} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------ reminders */

const REMINDER_TONE: Record<ApiReminderLog["status"], string> = {
  sent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  sending: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

/** Payment reminders sent for an enrollment, newest first. */
export function ReminderList({ leadId, enrollmentId }: { leadId?: number; enrollmentId: number }) {
  const { reminders, isLoading } = useEnrollmentReminders(leadId, enrollmentId);
  if (isLoading) return <Skeleton className="h-12 w-full rounded-xl" />;
  if (!reminders.length) return <p className="text-muted-foreground py-3 text-sm">No reminders.</p>;
  return (
    <ul className="divide-border divide-y">
      {reminders.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {r.step_display} · {formatDate(r.due_on)} · {formatNPR(Number(r.amount))}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(r.created_at)} · {r.channel_display}
              {r.sent_to ? ` · ${r.sent_to}` : ""}
              {r.error ? ` · ${r.error}` : ""}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              REMINDER_TONE[r.status],
            )}
          >
            {r.status_display}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ the editor */

const COUNTS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Rows of due date + amount. "Parts" splits the total evenly, monthly from the first date. */
export function DuePartsEditor({
  total,
  parts,
  onChange,
}: {
  total: number;
  parts: ApiDuePart[];
  onChange: (parts: ApiDuePart[]) => void;
}) {
  const sum = sumParts(parts);
  const counts = COUNTS.includes(parts.length) ? COUNTS : [...COUNTS, parts.length];
  const setPart = (i: number, patch: Partial<ApiDuePart>) =>
    onChange(parts.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label required>Due dates</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Parts</span>
          <Select
            value={String(parts.length)}
            onValueChange={(v) =>
              onChange(splitEvenly(total, Number(v), parts[0]?.due_on || localToday()))
            }
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {counts.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {parts.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="date"
            aria-label={`Due date ${i + 1}`}
            value={p.due_on}
            onChange={(e) => setPart(i, { due_on: e.target.value })}
          />
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            aria-label={`Amount ${i + 1}`}
            value={p.amount}
            onChange={(e) => setPart(i, { amount: e.target.value })}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Remove due date ${i + 1}`}
            disabled={parts.length === 1}
            onClick={() => onChange(parts.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="-ml-2"
          onClick={() => {
            const last = parts[parts.length - 1];
            onChange([
              ...parts,
              {
                due_on: last?.due_on ? addMonths(last.due_on, 1) : localToday(),
                amount: String(Math.max(Math.round((total - sum) * 100) / 100, 0) || ""),
              },
            ]);
          }}
        >
          <Plus /> Add due date
        </Button>
        <span
          className={cn(
            "text-xs tabular-nums",
            sum === total ? "text-muted-foreground" : "text-destructive",
          )}
        >
          Total {formatNPR(sum)} / {formatNPR(total)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ change dialog */

export function ChangeDueDatesDialog({
  leadId,
  enrollment,
  open,
  onClose,
}: {
  leadId?: number;
  enrollment: ApiEnrollment;
  open: boolean;
  onClose: () => void;
}) {
  const total = Number(enrollment.agreed_amount);
  const [parts, setParts] = useState<ApiDuePart[]>([]);
  const setDueDates = useSetDueDates(leadId);
  // The current parts as text, so a refetch with the same plan doesn't reset the form.
  const initial = JSON.stringify(currentParts(enrollment));

  useEffect(() => {
    if (!open) return;
    const current = JSON.parse(initial) as ApiDuePart[];
    setParts(current.length ? current : splitEvenly(total, 1, localToday()));
  }, [open, initial, total]);

  return (
    <ReasonDialog
      open={open}
      onClose={onClose}
      title="Change due dates"
      description={`Agreed amount: ${formatNPR(total)}`}
      confirmLabel="Save"
      pending={setDueDates.isPending}
      confirmDisabled={!partsAreValid(parts, total)}
      onConfirm={(reason) =>
        setDueDates.mutate({ id: enrollment.id, dueDates: parts, reason }, { onSuccess: onClose })
      }
    >
      <DuePartsEditor total={total} parts={parts} onChange={setParts} />
    </ReasonDialog>
  );
}
