import { useEffect, useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddAdjustment } from "@/hooks/use-leads";
import { formatNPR } from "@/lib/leads-format";
import type { ApiAdjustmentKind, ApiEnrollment } from "@/types/leads-api";

const KINDS: { value: ApiAdjustmentKind; label: string }[] = [
  { value: "extra_charge", label: "Extra charge" },
  { value: "discount", label: "Discount" },
  { value: "write_off", label: "Write-off" },
  { value: "refund", label: "Refund" },
];

/**
 * Add a money entry to an enrollment. The agreed price never changes after
 * saving: every later change is an entry with a reason, shown in History.
 */
export function AdjustmentDialog({
  open,
  onClose,
  leadId,
  enrollment,
}: {
  open: boolean;
  onClose: () => void;
  leadId?: number;
  enrollment: ApiEnrollment;
}) {
  const [kind, setKind] = useState<ApiAdjustmentKind>("discount");
  const [amount, setAmount] = useState("");
  const add = useAddAdjustment(leadId, enrollment.id);

  useEffect(() => {
    if (!open) return;
    setKind("discount");
    setAmount("");
  }, [open]);

  const owes = Number(enrollment.remaining_amount);

  return (
    <ReasonDialog
      open={open}
      onClose={onClose}
      title="Add money entry"
      description={owes < 0 ? `Credit: ${formatNPR(-owes)}` : `Remaining: ${formatNPR(owes)}`}
      confirmLabel="Add entry"
      pending={add.isPending}
      confirmDisabled={!(Number(amount) > 0)}
      onConfirm={(reason) => add.mutate({ kind, amount, reason }, { onSuccess: () => onClose() })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label required>Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as ApiAdjustmentKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label required>Amount</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>
    </ReasonDialog>
  );
}
