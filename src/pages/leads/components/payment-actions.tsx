import { Ban, Check } from "lucide-react";
import { useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import { usePaymentAction } from "@/hooks/use-leads";
import { formatNPR } from "@/lib/leads-format";

/**
 * Row buttons for one payment: Confirm (pending -> successful) and Void (needs a reason).
 * Payments are never edited: a wrong one is voided and the right one recorded again.
 */
export function PaymentActions({
  leadId,
  enrollmentId,
  paymentId,
  status,
  amount,
}: {
  leadId: number;
  enrollmentId: number;
  paymentId: number;
  status: string;
  amount: number;
}) {
  const [voidOpen, setVoidOpen] = useState(false);
  const mutation = usePaymentAction();
  const ids = { leadId, enrollmentId, id: paymentId };
  const canVoid = status === "pending" || status === "successful";

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
        description={`${formatNPR(amount)} will stop counting as paid and its receipt will be cancelled. If the amount was wrong, record the correct payment after this.`}
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
