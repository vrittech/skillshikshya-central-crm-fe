import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth";
import {
  useFreeLicence,
  useGiveLicence,
  useSendTeamsDetails,
  useTeamsAccounts,
} from "@/hooks/use-teams";
import { formatDate } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { ApiEnrollment, ApiTeamsState } from "@/types/leads-api";

const STATE_STYLE: Record<ApiTeamsState, string> = {
  ready: "bg-secondary text-secondary-foreground",
  in_use: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  safe_to_remove: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  action_required: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  retired: "text-muted-foreground border-border",
};

/** The account's state, with the reason when there is one. */
export function TeamsStateBadge({
  state,
  label,
  reason,
}: {
  state: ApiTeamsState;
  label: string;
  reason?: string;
}) {
  const showReason = reason && state !== "retired";
  return (
    <Badge variant="outline" className={cn("border-transparent", STATE_STYLE[state])}>
      {label}
      {showReason ? ` · ${reason}` : ""}
    </Badge>
  );
}

function PasswordField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} required>
        Temporary password
      </Label>
      <Input
        id={id}
        className="font-mono"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function GiveLicenceDialog({
  enrollment,
  branch,
  name,
  open,
  onClose,
}: {
  enrollment: number;
  branch?: number | null;
  name?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [send, setSend] = useState(true);
  const give = useGiveLicence();
  const ready = useTeamsAccounts(
    { state: "ready", give_at: branch ?? undefined },
    open,
  );
  const accounts = ready.data ?? [];

  useEffect(() => {
    if (open) {
      setAccount("");
      setPassword("");
      setSend(true);
    }
  }, [open]);

  const valid = account !== "" && (!send || password.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Give Teams licence</DialogTitle>
          {name && <DialogDescription>{name}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="teams-account" required>
              Teams account
            </Label>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger id="teams-account" className="w-full">
                <SelectValue
                  placeholder={
                    ready.isLoading
                      ? "Loading…"
                      : accounts.length
                        ? "Pick a ready account"
                        : "No ready accounts"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    <span className="font-mono">{a.email}</span>
                    {a.branch_name && (
                      <span className="text-muted-foreground ml-2 text-xs">{a.branch_name}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={send} onCheckedChange={(v) => setSend(v === true)} />
            Email sign-in details to the student
          </label>
          {send && <PasswordField id="teams-password" value={password} onChange={setPassword} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            variant="brand"
            disabled={!valid || give.isPending}
            onClick={() =>
              give.mutate(
                {
                  enrollment,
                  teams_account: Number(account),
                  send_details: send,
                  password: send ? password : undefined,
                },
                { onSuccess: onClose },
              )
            }
          >
            {give.isPending ? "Saving…" : "Give"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SendTeamsDetailsDialog({
  licence,
  onClose,
}: {
  licence: { id: number; account: string } | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const send = useSendTeamsDetails();

  useEffect(() => {
    if (licence) setPassword("");
  }, [licence]);

  return (
    <Dialog open={licence != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send sign-in details</DialogTitle>
          {licence && <DialogDescription className="font-mono">{licence.account}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">
          <PasswordField id="teams-resend-password" value={password} onChange={setPassword} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            variant="brand"
            disabled={!password.trim() || send.isPending}
            onClick={() =>
              licence && send.mutate({ id: licence.id, password }, { onSuccess: onClose })
            }
          >
            {send.isPending ? "Sending…" : "Send"}
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
      title="Take back Teams licence"
      description={licence?.account}
      confirmLabel="Take back"
      destructive
      pending={free.isPending}
      onConfirm={(reason) =>
        licence && free.mutate({ id: licence.id, reason }, { onSuccess: onClose })
      }
    />
  );
}

/** The student's Teams licence on the enrollment card: its state, Give, Send details, Take back. */
export function TeamsLicenceLine({
  enrollment,
  canManage,
}: {
  enrollment: ApiEnrollment;
  canManage: boolean;
}) {
  const { hasPerm } = useAuth();
  const [giving, setGiving] = useState(false);
  const [sending, setSending] = useState(false);
  const [freeing, setFreeing] = useState(false);
  const licence = enrollment.teams_licence ?? null;
  const canGive =
    canManage && hasPerm("lead.add_teamslicence") && enrollment.seat_state === "seated";
  const canSend = canManage && hasPerm("lead.add_teamslicence");
  const canFree = canManage && hasPerm("lead.change_teamslicence");

  if (!licence && !canGive) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Teams</span>
          {licence ? (
            <>
              <span className="font-mono font-medium">{licence.account}</span>
              <TeamsStateBadge
                state={licence.state}
                label={licence.state_label}
                reason={licence.reason}
              />
            </>
          ) : (
            "—"
          )}
        </p>
        {licence && (
          <p className="text-muted-foreground text-xs">
            Given {formatDate(licence.assigned_at)}
            {licence.details_sent_at
              ? ` · Details sent ${formatDate(licence.details_sent_at)}`
              : " · Details not sent"}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {licence ? (
          <>
            {canSend && (
              <Button size="sm" variant="ghost" onClick={() => setSending(true)}>
                <Mail />
                Send details
              </Button>
            )}
            {canFree && (
              <Button size="sm" variant="ghost" onClick={() => setFreeing(true)}>
                Take back
              </Button>
            )}
          </>
        ) : (
          canGive && (
            <Button size="sm" variant="ghost" onClick={() => setGiving(true)}>
              Give licence
            </Button>
          )
        )}
      </div>
      <GiveLicenceDialog
        enrollment={enrollment.id}
        branch={enrollment.branch}
        name={enrollment.student_name ?? enrollment.lead_name}
        open={giving}
        onClose={() => setGiving(false)}
      />
      <SendTeamsDetailsDialog
        licence={sending ? licence : null}
        onClose={() => setSending(false)}
      />
      <FreeLicenceDialog licence={freeing ? licence : null} onClose={() => setFreeing(false)} />
    </div>
  );
}
