import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { useCreateBranch, useUpdateBranch } from "@/hooks/use-branches";
import type { ApiBranch, ApiBranchPayload } from "@/types/leads-api";

const EMPTY: ApiBranchPayload = { name: "", code: "", address: "", phone: "", email: "", is_active: true };

/**
 * Create/edit a branch. Shared between the Branches admin page and inline
 * "create branch" flows (e.g. the lead form's branch dropdown) so the fields
 * stay consistent everywhere. Pass `onCreated` to capture the new branch
 * (used by inline callers to auto-select it).
 */
export function BranchDialog({
  open,
  onClose,
  branch,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  branch: ApiBranch | null;
  onCreated?: (branch: ApiBranch) => void;
}) {
  const [form, setForm] = useState<ApiBranchPayload>(EMPTY);
  const create = useCreateBranch();
  const update = useUpdateBranch();

  useEffect(() => {
    if (!open) return;
    setForm(
      branch
        ? {
            name: branch.name,
            code: branch.code,
            address: branch.address ?? "",
            phone: branch.phone ?? "",
            email: branch.email ?? "",
            is_active: branch.is_active,
          }
        : EMPTY,
    );
  }, [open, branch]);

  const set = <K extends keyof ApiBranchPayload>(k: K, v: ApiBranchPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    if (!form.name?.trim() || !form.code?.trim()) {
      toast.error("Name and code are required.");
      return;
    }
    if (branch) {
      update.mutate({ id: branch.id, payload: form }, { onSuccess: () => onClose() });
    } else {
      create.mutate(form, {
        onSuccess: (b) => {
          onCreated?.(b);
          onClose();
        },
      });
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? "Edit branch" : "New branch"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label required>Name</Label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label required>Code</Label>
            <Input value={form.code ?? ""} onChange={(e) => set("code", e.target.value)} placeholder="KTM" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Address</Label>
            <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active ?? true} onCheckedChange={(c) => set("is_active", c)} />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="brand" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : branch ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
