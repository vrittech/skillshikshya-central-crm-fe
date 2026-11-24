import { useEffect, useState } from "react";
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
import { useCreateBatch, useUpdateBatch } from "@/hooks/use-batches";
import type { Batch, BatchPayload } from "@/types";

const EMPTY: BatchPayload = { name: "", description: "", is_active: true };

/** Create/edit a time slot (Morning, Day, Evening…). */
export function BatchDialog({
  open,
  onClose,
  batch,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  batch: Batch | null; // null = create
  onCreated?: (batch: Batch) => void;
}) {
  const [form, setForm] = useState<BatchPayload>(EMPTY);
  const create = useCreateBatch();
  const update = useUpdateBatch();
  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(
      batch
        ? { name: batch.name, description: batch.description ?? "", is_active: batch.is_active }
        : EMPTY,
    );
  }, [open, batch]);

  const set = <K extends keyof BatchPayload>(k: K, v: BatchPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) return;
    const payload: BatchPayload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      is_active: form.is_active,
    };
    if (batch) {
      update.mutate({ id: batch.id, payload }, { onSuccess: () => onClose() });
    } else {
      create.mutate(payload, {
        onSuccess: (b) => {
          onCreated?.(b);
          onClose();
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{batch ? `Edit ${batch.name}` : "New time slot"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="batch-name" required>Name</Label>
            <Input
              id="batch-name"
              required
              placeholder="Morning"
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="batch-description">Time</Label>
            <Input
              id="batch-description"
              placeholder="6:00 AM – 8:00 AM"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="batch-active"
              checked={form.is_active ?? true}
              onCheckedChange={(c) => set("is_active", c)}
            />
            <Label htmlFor="batch-active">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? "Saving…" : batch ? "Save changes" : "Create time slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
