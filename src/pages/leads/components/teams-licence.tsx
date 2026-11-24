import { useEffect, useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth";
import { useFreeLicence, useGiveLicence } from "@/hooks/use-teams";
import { formatDate } from "@/lib/leads-format";
import type { ApiEnrollment } from "@/types/leads-api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GiveLicenceDialog({
  enrollment,
  name,
  open,
  onClose,
}: {
  enrollment: number;
  name?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [account, setAccount] = useState("");
  const give = useGiveLicence();

  useEffect(() => {
    if (open) setAccount("");
  }, [open]);

  const valid = EMAIL.test(account.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Give Teams licence</DialogTitle>
          {name && <DialogDescription>{name}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="teams-account" required>
            Teams account
          </Label>
          <Input
            id="teams-account"
            type="email"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            variant="brand"
            disabled={!valid || give.isPending}
            onClick={() =>
              give.mutate({ enrollment, account: account.trim() }, { onSuccess: onClose })
            }
          >
            {give.isPending ? "Saving…" : "Give"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FreeLicenceDialog({
  licence,
  onClose,
}: {
  licence: { id: number; account: string } | null;
  onClose: () => void;
}) {
  const free = useFreeLicence();
  return (
    <ReasonDialog
      open={licence != null}
      onClose={onClose}
      title="Free Teams licence"
      description={licence?.account}
      confirmLabel="Free"
      destructive
      pending={free.isPending}
      onConfirm={(reason) =>
        licence && free.mutate({ id: licence.id, reason }, { onSuccess: onClose })
      }
    />
  );
}

/** The student's Teams licence on the enrollment card, with Give or Free. */
export function TeamsLicenceLine({
  enrollment,
  canManage,
}: {
  enrollment: ApiEnrollment;
  canManage: boolean;
}) {
  const { hasPerm } = useAuth();
  const [giving, setGiving] = useState(false);
  const [freeing, setFreeing] = useState(false);
  const licence = enrollment.teams_licence ?? null;
  const canGive =
    canManage && hasPerm("lead.add_teamslicence") && enrollment.seat_state === "seated";
  const canFree = canManage && hasPerm("lead.change_teamslicence");

  if (!licence && !canGive) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
      <p>
        <span className="text-muted-foreground">Teams </span>
        {licence ? (
          <>
            <span className="font-medium">{licence.account}</span>
            <span className="text-muted-foreground"> · {formatDate(licence.assigned_at)}</span>
            {licence.paused_at && (
              <Badge variant="warning" className="ml-2">
                Paused
              </Badge>
            )}
          </>
        ) : (
          "—"
        )}
      </p>
      {licence
        ? canFree && (
            <Button size="sm" variant="ghost" onClick={() => setFreeing(true)}>
              Free
            </Button>
          )
        : canGive && (
            <Button size="sm" variant="ghost" onClick={() => setGiving(true)}>
              Give licence
            </Button>
          )}
      <GiveLicenceDialog
        enrollment={enrollment.id}
        name={enrollment.student_name ?? enrollment.lead_name}
        open={giving}
        onClose={() => setGiving(false)}
      />
      <FreeLicenceDialog licence={freeing ? licence : null} onClose={() => setFreeing(false)} />
    </div>
  );
}
