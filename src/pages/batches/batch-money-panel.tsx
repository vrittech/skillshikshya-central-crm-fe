import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  useAddBatchCost,
  useBatchMoney,
  useReopenBatch,
  useVoidBatchCost,
} from "@/hooks/use-batches";
import { COST_KINDS, FIGURE_ROWS, figureText } from "@/lib/batch-money";
import { formatDate, formatDateTime, formatNPR } from "@/lib/leads-format";
import { localToday } from "@/lib/seats";
import { BatchCloseDialog } from "./batch-close-dialog";
import { cn } from "@/lib/utils";
import type {
  BatchClosingChecklist,
  BatchCost,
  BatchCostKind,
  BatchFigures,
  BatchMoney,
  CourseBatch,
} from "@/types";

/* ------------------------------------------------------------ figures */

function Figures({ money }: { money: BatchMoney }) {
  const columns: { label: string; figures: BatchFigures }[] =
    money.at_close && money.after_close
      ? [
          { label: "At close", figures: money.at_close },
          { label: "After close", figures: money.after_close },
          { label: "Now", figures: money.figures },
        ]
      : [{ label: "Now", figures: money.figures }];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground text-xs">
          <th className="py-1.5 text-left font-medium" />
          {columns.map((c) => (
            <th key={c.label} className="py-1.5 text-right font-medium">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-border divide-y">
        {FIGURE_ROWS.map((row) => (
          <tr key={row.key} className={cn(row.key === "profit" && "font-semibold")}>
            <td className="py-2">{row.label}</td>
            {columns.map((c) => (
              <td
                key={c.label}
                className={cn(
                  "py-2 text-right tabular-nums",
                  row.key === "profit" && Number(c.figures.profit) < 0 && "text-destructive",
                )}
              >
                {figureText(c.figures, row.key)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------ costs */

function CostRow({ cost, onVoid }: { cost: BatchCost; onVoid?: () => void }) {
  const voided = cost.voided_at != null;
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", voided && "text-muted-foreground line-through")}>
          {cost.kind_display} · {formatNPR(Number(cost.amount))}
        </p>
        <p className="text-muted-foreground text-xs">
          {formatDate(cost.spent_on)} · {cost.created_by_name}
          {cost.note ? ` · ${cost.note}` : ""}
        </p>
        {voided && (
          <p className="text-muted-foreground text-xs">
            Voided by {cost.voided_by_name}: {cost.void_reason}
          </p>
        )}
      </div>
      {voided ? (
        <Badge variant="secondary">Voided</Badge>
      ) : (
        onVoid && (
          <Button size="sm" variant="ghost" onClick={onVoid}>
            Void
          </Button>
        )
      )}
    </li>
  );
}

function AddCostDialog({
  batchId,
  open,
  onClose,
}: {
  batchId: number;
  open: boolean;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<BatchCostKind>("trainer");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState(localToday());
  const [note, setNote] = useState("");
  const add = useAddBatchCost();

  useEffect(() => {
    if (!open) return;
    setKind("trainer");
    setAmount("");
    setSpentOn(localToday());
    setNote("");
  }, [open]);

  const valid = Number(amount) > 0 && !!spentOn;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add cost</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as BatchCostKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cost-amount" required>
                Amount
              </Label>
              <Input
                id="cost-amount"
                type="number"
                inputMode="decimal"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cost-date" required>
                Date
              </Label>
              <Input
                id="cost-date"
                type="date"
                value={spentOn}
                onChange={(e) => setSpentOn(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cost-note">Note</Label>
            <Input id="cost-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            variant="brand"
            disabled={!valid || add.isPending}
            onClick={() =>
              add.mutate(
                { id: batchId, payload: { kind, amount, spent_on: spentOn, note: note.trim() } },
                { onSuccess: onClose },
              )
            }
          >
            {add.isPending ? "Saving…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** What was still open when a batch was closed anyway. */
function openItems(c: BatchClosingChecklist) {
  const parts: string[] = [];
  if (c.students.length) parts.push(`Students ${c.students.length}`);
  if (c.attendance_none_taken) parts.push("Attendance not taken");
  else if (c.attendance_missing.length) parts.push(`Attendance ${c.attendance_missing.length}`);
  if (c.teams.length) parts.push(`Teams ${c.teams.length}`);
  return parts.join(" · ");
}

/* ------------------------------------------------------------ panel */

/** A batch's money: figures, costs, and closing or reopening it. */
export function BatchMoneyPanel({
  batch,
  canAddCost,
  canVoidCost,
  canClose,
  canComplete,
}: {
  batch: CourseBatch;
  canAddCost: boolean;
  canVoidCost: boolean;
  canClose: boolean;
  canComplete: boolean;
}) {
  const { data: money, isLoading } = useBatchMoney(batch.id);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<BatchCost | null>(null);
  const [closing, setClosing] = useState<"close" | "reopen" | null>(null);
  const voidCost = useVoidBatchCost();
  const reopen = useReopenBatch();
  const isClosed = money?.status === "closed";

  if (isLoading || !money) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <Figures money={money} />
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Costs</h3>
          {canAddCost && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus /> Add cost
            </Button>
          )}
        </div>
        {money.costs.length ? (
          <ul className="divide-border divide-y">
            {money.costs.map((c) => (
              <CostRow
                key={c.id}
                cost={c}
                onVoid={canVoidCost ? () => setVoiding(c) : undefined}
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground py-3 text-sm">No costs.</p>
        )}
      </section>

      {money.closings.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold">Close history</h3>
          <ul className="divide-border divide-y">
            {money.closings.map((c) => (
              <li key={c.id} className="py-2.5">
                <p className="text-sm font-medium">
                  {c.kind_display} · {formatDateTime(c.created_at)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {c.created_by_name} · {c.reason}
                </p>
                {c.checklist?.closed_anyway && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Closed anyway · {openItems(c.checklist)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {canClose && (
        <div className="flex justify-end border-t pt-4">
          {isClosed ? (
            <Button variant="outline" onClick={() => setClosing("reopen")}>
              Reopen batch
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setClosing("close")}>
              Close batch
            </Button>
          )}
        </div>
      )}

      <AddCostDialog batchId={batch.id} open={adding} onClose={() => setAdding(false)} />
      <ReasonDialog
        open={voiding != null}
        onClose={() => setVoiding(null)}
        title="Void cost"
        description={
          voiding ? `${voiding.kind_display} · ${formatNPR(Number(voiding.amount))}` : undefined
        }
        confirmLabel="Void"
        destructive
        pending={voidCost.isPending}
        onConfirm={(reason) =>
          voiding &&
          voidCost.mutate(
            { id: batch.id, costId: voiding.id, reason },
            { onSuccess: () => setVoiding(null) },
          )
        }
      />
      <BatchCloseDialog
        batch={batch}
        open={closing === "close"}
        onClose={() => setClosing(null)}
        canComplete={canComplete}
      />
      <ReasonDialog
        open={closing === "reopen"}
        onClose={() => setClosing(null)}
        title="Reopen batch"
        description={batch.name}
        confirmLabel="Reopen"
        pending={reopen.isPending}
        onConfirm={(reason) =>
          reopen.mutate({ id: batch.id, reason }, { onSuccess: () => setClosing(null) })
        }
      />
    </div>
  );
}
