import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
import { Switch } from "@/components/ui/switch";
import { useBranches } from "@/hooks/use-branches";
import { useGroups } from "@/hooks/use-groups";
import { useRegisterUser, useUpdateUser } from "@/hooks/use-users";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";
import type { RegisterPayload, User } from "@/types";

const WEEKDAYS = [
  { key: "work_sun", label: "Sun" },
  { key: "work_mon", label: "Mon" },
  { key: "work_tue", label: "Tue" },
  { key: "work_wed", label: "Wed" },
  { key: "work_thu", label: "Thu" },
  { key: "work_fri", label: "Fri" },
  { key: "work_sat", label: "Sat" },
] as const;

type WorkDayKey = (typeof WEEKDAYS)[number]["key"];

interface FormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  designation: string;
  group: string; // single group id as string, "" = none (sent as groups: [])
  branch: string; // single branch id as string, "" = unassigned
  daily_call_target_min: string;
  monthly_enrollment_target: string;
  shift_start: string;
  shift_end: string;
  custom_weekly_offs: boolean;
  work_sun: boolean;
  work_mon: boolean;
  work_tue: boolean;
  work_wed: boolean;
  work_thu: boolean;
  work_fri: boolean;
  work_sat: boolean;
  exclude_from_calls: boolean;
  exclude_from_enrollment: boolean;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  phone: "",
  designation: "",
  group: "",
  branch: "",
  daily_call_target_min: "",
  monthly_enrollment_target: "",
  shift_start: "09:00",
  shift_end: "18:00",
  custom_weekly_offs: false,
  work_sun: false,
  work_mon: true,
  work_tue: true,
  work_wed: true,
  work_thu: true,
  work_fri: true,
  work_sat: false,
  exclude_from_calls: false,
  exclude_from_enrollment: false,
  is_active: true,
};

function toForm(user: User): FormState {
  return {
    name: user.name,
    email: user.email,
    password: "",
    phone: user.phone ?? "",
    designation: user.designation ?? "",
    group: user.groups?.[0] != null ? String(user.groups[0]) : "",
    branch: user.branch != null ? String(user.branch) : "",
    daily_call_target_min:
      user.daily_call_target_min != null ? String(user.daily_call_target_min) : "",
    monthly_enrollment_target: user.monthly_enrollment_target ?? "",
    shift_start: user.shift_start?.slice(0, 5) ?? "",
    shift_end: user.shift_end?.slice(0, 5) ?? "",
    custom_weekly_offs: user.custom_weekly_offs,
    work_sun: user.work_sun,
    work_mon: user.work_mon,
    work_tue: user.work_tue,
    work_wed: user.work_wed,
    work_thu: user.work_thu,
    work_fri: user.work_fri,
    work_sat: user.work_sat,
    exclude_from_calls: user.exclude_from_calls,
    exclude_from_enrollment: user.exclude_from_enrollment,
    is_active: user.is_active,
  };
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null; // null = register new
}) {
  const isEdit = user != null;
  const { user: currentUser } = useAuth();
  const { source } = useDataSource();
  const isStaff = !!currentUser?.is_staff;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchLabel, setBranchLabel] = useState("");
  const groups = useGroups(open && isStaff);
  const branchesQ = useBranches(1, 100, branchSearch, open && isStaff && source === "api");
  const register = useRegisterUser();
  const update = useUpdateUser();
  const busy = register.isPending || update.isPending;

  const branchOptions = useMemo(
    () => (branchesQ.data?.results ?? []).map((b) => ({ value: String(b.id), label: b.name })),
    [branchesQ.data],
  );

  useEffect(() => {
    if (open) {
      setForm(user ? toForm(user) : emptyForm);
      setBranchLabel(user?.branch_name ?? "");
      setBranchSearch("");
    }
  }, [open, user]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onPickBranch = (v: string) => {
    set("branch", v);
    setBranchLabel(branchOptions.find((o) => o.value === v)?.label ?? branchLabel);
  };

  function buildCommon() {
    return {
      phone: form.phone || undefined,
      designation: form.designation || undefined,
      daily_call_target_min: form.daily_call_target_min
        ? Number(form.daily_call_target_min)
        : undefined,
      monthly_enrollment_target: form.monthly_enrollment_target || undefined,
      shift_start: form.shift_start ? `${form.shift_start}:00` : undefined,
      shift_end: form.shift_end ? `${form.shift_end}:00` : undefined,
      custom_weekly_offs: form.custom_weekly_offs,
      work_sun: form.work_sun,
      work_mon: form.work_mon,
      work_tue: form.work_tue,
      work_wed: form.work_wed,
      work_thu: form.work_thu,
      work_fri: form.work_fri,
      work_sat: form.work_sat,
      exclude_from_calls: form.exclude_from_calls,
      exclude_from_enrollment: form.exclude_from_enrollment,
    };
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) {
      // Only staff manage groups/active status. For a non-staff self-edit the role
      // select is hidden, so sending groups here would wipe existing membership.
      const staffOnly = currentUser?.is_staff
        ? {
            // groups is M2M; a single-select maps to one-element (or empty) array.
            groups: form.group ? [Number(form.group)] : [],
            is_active: form.is_active,
            branch: form.branch ? Number(form.branch) : null,
          }
        : {};
      update.mutate(
        {
          id: user.id,
          payload: {
            name: form.name,
            email: form.email,
            ...staffOnly,
            ...buildCommon(),
          },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      const payload: RegisterPayload = {
        name: form.name,
        email: form.email,
        password: form.password,
        branch: form.branch ? Number(form.branch) : null,
        groups: form.group ? [Number(form.group)] : [],
        ...buildCommon(),
      };
      register.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${user.name}` : "Register new user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update profile, role, targets, and schedule."
              : "Creates the account via /auth/register — name, email, and password are required."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="uf-name" required>Name</Label>
              <Input
                id="uf-name"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf-email" required>Email</Label>
              <Input
                id="uf-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="uf-password" required>Password</Label>
                <Input
                  id="uf-password"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="uf-phone">Phone</Label>
              <Input
                id="uf-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf-designation">Designation</Label>
              <Input
                id="uf-designation"
                placeholder="Sales Executive"
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
              />
            </div>
            {currentUser?.is_staff && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.group || "none"}
                  onValueChange={(v) => set("group", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No role</SelectItem>
                    {groups.data?.results.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isStaff && source === "api" && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Combobox
                  value={form.branch}
                  onChange={onPickBranch}
                  options={branchOptions}
                  placeholder="Unassigned"
                  searchPlaceholder="Search branches…"
                  emptyText="No branches found."
                  onSearchChange={setBranchSearch}
                  loading={branchesQ.isFetching}
                  selectedLabel={branchLabel}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="uf-target">Daily call target (min)</Label>
              <Input
                id="uf-target"
                type="number"
                min={0}
                placeholder="50"
                value={form.daily_call_target_min}
                onChange={(e) => set("daily_call_target_min", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf-enroll">Monthly enrollment target (NPR)</Label>
              <Input
                id="uf-enroll"
                type="number"
                min={0}
                step="0.01"
                placeholder="500000.00"
                value={form.monthly_enrollment_target}
                onChange={(e) => set("monthly_enrollment_target", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf-shift-start">Shift start</Label>
              <Input
                id="uf-shift-start"
                type="time"
                value={form.shift_start}
                onChange={(e) => set("shift_start", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf-shift-end">Shift end</Label>
              <Input
                id="uf-shift-end"
                type="time"
                value={form.shift_end}
                onChange={(e) => set("shift_end", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Working days</Label>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((d) => (
                <label key={d.key} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={form[d.key as WorkDayKey]}
                    onCheckedChange={(v) => set(d.key as WorkDayKey, v === true)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
              Custom weekly offs
              <Switch
                checked={form.custom_weekly_offs}
                onCheckedChange={(v) => set("custom_weekly_offs", v)}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
              Exclude from calls
              <Switch
                checked={form.exclude_from_calls}
                onCheckedChange={(v) => set("exclude_from_calls", v)}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
              Exclude from enrollment
              <Switch
                checked={form.exclude_from_enrollment}
                onCheckedChange={(v) => set("exclude_from_enrollment", v)}
              />
            </label>
            {isEdit && currentUser?.is_staff && (
              <label className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                Active
                <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
              </label>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Register user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
