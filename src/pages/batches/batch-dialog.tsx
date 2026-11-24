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
import { TimeSelect } from "@/components/time-select";
import { useCreateBatch, useUpdateBatch } from "@/hooks/use-batches";
import { durationText, fromMinutes, slotMinutes, toMinutes } from "@/lib/time-slots";
import type { Batch } from "@/types";

interface FormState {
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const EMPTY: FormState = { name: "", start_time: "", end_time: "", is_active: true };
/** Picking a start with no end yet (or an end that is now too early) sets the end an hour later. */
const DEFAULT_LENGTH = 60;
const LATEST = toMinutes("23:00");

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
  const [form, setForm] = useState<FormState>(EMPTY);
  const create = useCreateBatch();
  const update = useUpdateBatch();
  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(
      batch
        ? {
            name: batch.name,
            start_time: batch.start_time?.slice(0, 5) ?? "",
            end_time: batch.end_time?.slice(0, 5) ?? "",
            is_active: batch.is_active,
          }
        : EMPTY,
    );
  }, [open, batch]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function setStart(start: string) {
    setForm((f) => {
      const endOk = f.end_time && toMinutes(f.end_time) > toMinutes(start);
      const end = endOk ? f.end_time : fromMinutes(Math.min(toMinutes(start) + DEFAULT_LENGTH, LATEST));
      return { ...f, start_time: start, end_time: toMinutes(end) > toMinutes(start) ? end : "" };
    });
  }

  const minutes = form.start_time && form.end_time ? slotMinutes(form.start_time, form.end_time) : 0;
  const valid = !!form.name.trim() && !!form.start_time && !!form.end_time && minutes >= 15;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const payload = {
      name: form.name.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
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
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="slot-start" required>Start time</Label>
              <TimeSelect id="slot-start" value={form.start_time} onChange={setStart} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slot-end" required>End time</Label>
              <TimeSelect
                id="slot-end"
                value={form.end_time}
                after={form.start_time || undefined}
                onChange={(v) => set("end_time", v)}
              />
            </div>
          </div>
          <div className="flex items-baseline justify-between rounded-lg border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{minutes > 0 ? durationText(minutes) : "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="batch-active"
              checked={form.is_active}
              onCheckedChange={(c) => set("is_active", c)}
            />
            <Label htmlFor="batch-active">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={saving || !valid}>
              {saving ? "Saving…" : batch ? "Save changes" : "Create time slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
