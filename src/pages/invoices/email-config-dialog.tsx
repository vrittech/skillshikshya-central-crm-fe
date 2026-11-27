import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useInvoiceEmailConfig, useUpdateInvoiceEmailConfig } from "@/hooks/use-invoices";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin-only editor for `/api/invoices/email-config/` — the CC list applied to
 * every invoice email. The endpoint is a PUT singleton, so the whole config is sent.
 */
export function InvoiceEmailConfigDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useInvoiceEmailConfig(open);
  const save = useUpdateInvoiceEmailConfig();

  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [prefix, setPrefix] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open || !data) return;
    setCcEmails(data.cc_emails ?? []);
    setPrefix(data.subject_prefix ?? "");
    setIsActive(data.is_active);
    setDraft("");
  }, [open, data]);

  function addEmail() {
    const value = draft.trim().toLowerCase();
    if (!value) return;
    if (!EMAIL_RE.test(value)) {
      toast.error(`"${value}" is not a valid email address.`);
      return;
    }
    if (ccEmails.includes(value)) {
      setDraft("");
      return;
    }
    setCcEmails((list) => [...list, value]);
    setDraft("");
  }

  function submit() {
    if (!prefix.trim()) {
      toast.error("Subject prefix is required.");
      return;
    }
    // A half-typed address in the box is almost always meant to be included.
    const pending = draft.trim().toLowerCase();
    if (pending && !EMAIL_RE.test(pending)) {
      toast.error(`"${pending}" is not a valid email address.`);
      return;
    }
    const cc = pending && !ccEmails.includes(pending) ? [...ccEmails, pending] : ccEmails;
    save.mutate(
      { cc_emails: cc, subject_prefix: prefix, is_active: isActive },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invoice email settings</DialogTitle>
          <DialogDescription>
            These addresses are CC'd on every invoice and receipt sent to a student.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>CC addresses</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="accounts@skillshikshya.com"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addEmail}>
                  <Plus />
                </Button>
              </div>
              {ccEmails.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ccEmails.map((email) => (
                    <span
                      key={email}
                      className="bg-muted flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-xs"
                    >
                      {email}
                      <button
                        type="button"
                        className="hover:bg-background cursor-pointer rounded-full p-0.5"
                        onClick={() => setCcEmails((list) => list.filter((e) => e !== email))}
                        aria-label={`Remove ${email}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  No CCs — invoices go to the student only.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label required>Subject prefix</Label>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Skill Shikshya"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Send CCs</p>
                <p className="text-muted-foreground text-xs">
                  When off, invoice emails go to the student only.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="brand" onClick={submit} disabled={isLoading || save.isPending}>
            {save.isPending ? "Saving…" : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
