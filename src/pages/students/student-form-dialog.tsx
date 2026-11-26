import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBranches } from "@/hooks/use-branches";
import { useCreateStudent } from "@/hooks/use-students";
import type { ApiGender, ApiStudentPayload, ApiStudentStatus } from "@/types/leads-api";

const STATUSES: { value: ApiStudentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
  { value: "dropped", label: "Dropped" },
  { value: "transferred", label: "Transferred" },
];

const GENDERS: { value: ApiGender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

/**
 * Create a student who did not come through a lead. A lead becomes a student
 * only when one of their enrollments is confirmed (Confirm on the enrollment card).
 */
export function StudentFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const branchesQ = useBranches(1, 100, "", open);
  const branches = useMemo(() => branchesQ.data?.results ?? [], [branchesQ.data]);
  const create = useCreateStudent();

  const [form, setForm] = useState<ApiStudentPayload>({});

  useEffect(() => {
    if (!open) return;
    setForm({
      full_name: "",
      phone: "",
      email: null,
      gender: null,
      status: "active",
      branch: null,
      source: null,
      assigned_counselor: null,
      lead: null,
      enrolled_at: null,
      notes: null,
    });
  }, [open]);

  const set = <K extends keyof ApiStudentPayload>(k: K, v: ApiStudentPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    if (!form.full_name?.trim() || !form.phone?.trim()) {
      toast.error("Full name and phone are required.");
      return;
    }
    create.mutate(form, { onSuccess: () => onClose() });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New student</DialogTitle>
          <DialogDescription>Create a student record.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label required>Full Name</Label>
            <Input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label required>Phone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value || null)} />
          </div>
          <div className="grid gap-2">
            <Label>Gender</Label>
            <Select value={form.gender ?? undefined} onValueChange={(v) => set("gender", v as ApiGender)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Branch</Label>
            <Select
              value={form.branch != null ? String(form.branch) : undefined}
              onValueChange={(v) => set("branch", Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status ?? "active"} onValueChange={(v) => set("status", v as ApiStudentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Enrolled date</Label>
            <Input
              type="date"
              value={form.enrolled_at ?? ""}
              onChange={(e) => set("enrolled_at", e.target.value || null)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="brand" onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
