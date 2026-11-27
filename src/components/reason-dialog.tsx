import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Asks for a reason before a major change (cancel, reinstate, void, refund…).
 * The backend refuses a blank reason too; this dialog just says so early.
 * The reason ends up in the enrollment's history for the whole team to see.
 */
export function ReasonDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  destructive = false,
  pending = false,
  confirmDisabled = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  /** Extra check from the caller's own fields (e.g. an amount). */
  confirmDisabled?: boolean;
  onConfirm: (reason: string) => void;
  /** Extra fields shown above the reason. */
  children?: ReactNode;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const trimmed = reason.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {children}
          <div className="grid gap-2">
            <Label required>Reason</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            variant={destructive ? "destructive" : "brand"}
            disabled={!trimmed || pending || confirmDisabled}
            onClick={() => onConfirm(trimmed)}
          >
            {pending ? "Saving…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
