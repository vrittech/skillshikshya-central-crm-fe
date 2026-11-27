import { Ban, Check, FileText } from "lucide-react";
import { useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import { usePaymentAction } from "@/hooks/use-leads";
import { formatNPR } from "@/lib/leads-format";

/**
 * Row buttons for one payment: Confirm (pending -> successful), Void (needs a
 * reason) and Create receipt (a successful payment whose receipt was cancelled).
 * Payments are never edited: a wrong one is voided and the right one recorded again.
 */
export function PaymentActions({
  leadId,
  enrollmentId,
  paymentId,
  status,
  amount,
  receiptNumber,
}: {
  leadId: number;
  enrollmentId: number;
  paymentId: number;
  status: string;
  amount: number;
  /** null: no active receipt. Left out: not known, so the button stays hidden. */
  receiptNumber?: string | null;
}) {
  const [voidOpen, setVoidOpen] = useState(false);
  const mutation = usePaymentAction();
  const ids = { leadId, enrollmentId, id: paymentId };
  const canVoid = status === "pending" || status === "successful";
  const needsReceipt = status === "successful" && receiptNumber === null;

  if (status !== "pending" && !canVoid) return null;

  return (
    <>
      {status === "pending" && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8"
          title="Confirm payment (money received)"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ ...ids, action: "confirm" })}
        >
          <Check />
        </Button>
      )}
      {needsReceipt && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8"
          title="Create receipt"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ ...ids, action: "receipt" })}
        >
          <FileText />
        </Button>
      )}
      {canVoid && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive size-8"
          title="Void payment"
          onClick={() => setVoidOpen(true)}
        >
          <Ban />
        </Button>
      )}
      <ReasonDialog
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        title="Void payment"
        description={`Amount: ${formatNPR(amount)}`}
        confirmLabel="Void payment"
        destructive
        pending={mutation.isPending}
        onConfirm={(reason) =>
          mutation.mutate({ ...ids, action: "void", reason }, { onSuccess: () => setVoidOpen(false) })
        }
      />
    </>
  );
}
