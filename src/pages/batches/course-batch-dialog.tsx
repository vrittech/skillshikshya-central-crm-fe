import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/auth";
import { useBatches, useCreateCourseBatch, useUpdateCourseBatch } from "@/hooks/use-batches";
import { useBranches } from "@/hooks/use-branches";
import { useCourses } from "@/hooks/use-courses";
import type { CourseBatch, CourseBatchMode, CourseBatchPayload, CourseBatchStatus } from "@/types";
import { BatchDialog } from "./batch-dialog";

interface FormState {
  name: string;
  course: string;
  batch: string;
  start_date: string;
  end_date: string;
  /** Seats as typed; "" = no limit. */
  capacity: string;
  mode: CourseBatchMode;
  status: CourseBatchStatus;
  trainer: string;
  is_active: boolean;
  /** Branch id as text; "" = the creator's branch. Staff only. */
  branch: string;
}

const EMPTY: FormState = {
  name: "",
  course: "",
  batch: "",
  start_date: "",
  end_date: "",
  capacity: "",
  mode: "physical",
  status: "upcoming",
  trainer: "",
  is_active: true,
  branch: "",
};

/** Create/edit a course batch — a course run tied to a time slot and date range. */
export function CourseBatchDialog({
  open,
  onClose,
  courseBatch,
}: {
  open: boolean;
  onClose: () => void;
  courseBatch: CourseBatch | null; // null = create
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [courseSearch, setCourseSearch] = useState("");
  const [addingSlot, setAddingSlot] = useState(false);

  const { user, hasPerm } = useAuth();
  const isStaff = !!user?.is_staff;
  const canAddSlot = hasPerm("course.add_batch");
  const branchesQ = useBranches(1, 100, "", open && isStaff);
  const coursesQ = useCourses(1, 50, courseSearch);
  const batchesQ = useBatches({ page_size: 100, is_active: true });
  const slots = batchesQ.data?.results ?? [];
  const create = useCreateCourseBatch();
  const update = useUpdateCourseBatch();
  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setCourseSearch("");
    setForm(
      courseBatch
        ? {
            name: courseBatch.name,
            course: String(courseBatch.course),
            batch: courseBatch.batch == null ? "" : String(courseBatch.batch),
            start_date: courseBatch.start_date ?? "",
            end_date: courseBatch.end_date ?? "",
            capacity: courseBatch.capacity == null ? "" : String(courseBatch.capacity),
            mode: courseBatch.mode,
            status: courseBatch.status,
            trainer: courseBatch.trainer ?? "",
            is_active: courseBatch.is_active,
            branch: courseBatch.branch == null ? "" : String(courseBatch.branch),
          }
        : EMPTY,
    );
  }, [open, courseBatch]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.course || !form.batch) return;
    const payload: CourseBatchPayload = {
      name: form.name.trim(),
      course: Number(form.course),
      batch: Number(form.batch),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      capacity: form.capacity === "" ? null : Number(form.capacity),
      mode: form.mode,
      status: form.status,
      trainer: form.trainer.trim() || null,
      is_active: form.is_active,
      ...(isStaff && form.branch ? { branch: Number(form.branch) } : {}),
    };
    if (courseBatch) {
      update.mutate({ id: courseBatch.id, payload }, { onSuccess: () => onClose() });
    } else {
      create.mutate(payload, { onSuccess: () => onClose() });
    }
  }

  const dateRangeInvalid =
    !!form.start_date && !!form.end_date && form.end_date < form.start_date;
  const capacityInvalid =
    form.capacity !== "" && !(Number.isInteger(Number(form.capacity)) && Number(form.capacity) >= 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{courseBatch ? `Edit ${courseBatch.name}` : "New batch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="cohort-name" required>Name</Label>
              <Input
                id="cohort-name"
                required
                placeholder="Python Bootcamp"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label required>Course</Label>
              <Combobox
                value={form.course}
                onChange={(v) => set("course", v)}
                options={(coursesQ.data?.results ?? []).map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                onSearchChange={setCourseSearch}
                loading={coursesQ.isFetching}
                selectedLabel={courseBatch?.course_name ?? undefined}
                placeholder="Select course"
                searchPlaceholder="Search courses…"
                emptyText="No courses found."
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label required>Time slot</Label>
                {canAddSlot && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setAddingSlot(true)}
                  >
                    <Plus className="size-3" /> New time slot
                  </Button>
                )}
              </div>
              <Select value={form.batch} onValueChange={(v) => set("batch", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.description ? `${b.name} · ${b.description}` : b.name}
                    </SelectItem>
                  ))}
                  {courseBatch?.batch != null &&
                    !slots.some((b) => b.id === courseBatch.batch) && (
                      <SelectItem value={String(courseBatch.batch)}>
                        {courseBatch.batch_name ?? "Current time slot"}
                      </SelectItem>
                    )}
                  {slots.length === 0 && courseBatch?.batch == null && (
                    <p className="text-muted-foreground px-2 py-1.5 text-sm">
                      {batchesQ.isLoading ? "Loading…" : "No time slots."}
                    </p>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cohort-start">Start date</Label>
              <Input
                id="cohort-start"
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cohort-end">End date</Label>
              <Input
                id="cohort-end"
                type="date"
                min={form.start_date || undefined}
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cohort-capacity">Seats</Label>
              <Input
                id="cohort-capacity"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="No limit"
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cohort-trainer">Trainer</Label>
              <Input
                id="cohort-trainer"
                placeholder="Trainer's name"
                value={form.trainer}
                onChange={(e) => set("trainer", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => set("mode", v as CourseBatchMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              {/* Closing and reopening go through the batch's Money panel, with a reason. */}
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as CourseBatchStatus)}
                disabled={form.status === "closed"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  {form.status === "closed" && <SelectItem value="closed">Closed</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {isStaff && (
              <div className="grid gap-2 sm:col-span-2">
                <Label>Branch</Label>
                <Select value={form.branch || undefined} onValueChange={(v) => set("branch", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branchesQ.data?.results ?? []).map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                id="cohort-active"
                checked={form.is_active}
                onCheckedChange={(c) => set("is_active", c)}
              />
              <Label htmlFor="cohort-active">Active</Label>
            </div>
          </div>

          {dateRangeInvalid && (
            <p className="text-destructive text-xs">End date cannot be before the start date.</p>
          )}
          {capacityInvalid && (
            <p className="text-destructive text-xs">Seats must be a whole number, 0 or more.</p>
          )}
          {/* unique_together on (course, batch, start_date) — surfaced via the error toast. */}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={
                saving || !form.course || !form.batch || dateRangeInvalid || capacityInvalid
              }
            >
              {saving ? "Saving…" : courseBatch ? "Save changes" : "Create batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <BatchDialog
        open={addingSlot}
        onClose={() => setAddingSlot(false)}
        batch={null}
        onCreated={(b) => set("batch", String(b.id))}
      />
    </Dialog>
  );
}
