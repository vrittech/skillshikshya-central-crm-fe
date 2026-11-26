import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiCombobox } from "@/components/ui/multi-combobox";
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
import { buildCustomDataPayload } from "@/data/lead-adapters";
import { EDUCATION_LEVELS, LEARNING_MODES, SHIFTS } from "@/data/lead-lookups";
import { useBranches } from "@/hooks/use-branches";
import { useCourses } from "@/hooks/use-courses";
import { useCities, useProvinces } from "@/hooks/use-locations";
import {
  campaignHooks,
  sourceHooks,
  useCampaigns,
  useLeadPriorities,
  useLeadSources,
  useLeadStatuses,
} from "@/hooks/use-lead-config";
import { useCreateLead, useLead, usePhoneMatch, useUpdateLead } from "@/hooks/use-leads";
import { useCounselors } from "@/hooks/use-users";
import { leadsService } from "@/services/leads.service";
import { BranchDialog } from "@/pages/branches/branch-dialog";
import { phoneMatchOf } from "@/lib/phone-match";
import type { ApiBranch, ApiLeadPayload, ApiPhoneMatch } from "@/types/leads-api";
import { PhoneMatchBox } from "./components/phone-match";
import type { EducationLevel, LeadCustomData, LearningMode, Shift } from "@/types/leads";

interface Option {
  value: string;
  label: string;
}

interface FormState {
  full_name: string;
  phone: string;
  secondary_phone: string;
  email: string;
  address: string;
  notes: string;
  expected_revenue: string;
  source: string;
  campaign: string;
  status: string;
  priority: string;
  assigned_counselor: string;
  primary_course: string;
  additional_courses: string[];
  branch: string;
  province: string;
  city: string;
  landmark: string;
  heard_from: string;
  cd_learning_mode: string;
  cd_shift: string;
  cd_has_laptop: string;
  cd_education: string;
  cd_institution: string;
}

const EMPTY: FormState = {
  full_name: "",
  phone: "",
  secondary_phone: "",
  email: "",
  address: "",
  notes: "",
  expected_revenue: "",
  source: "",
  campaign: "",
  status: "",
  priority: "",
  assigned_counselor: "",
  primary_course: "",
  additional_courses: [],
  branch: "",
  province: "",
  city: "",
  landmark: "",
  heard_from: "",
  cd_learning_mode: "",
  cd_shift: "",
  cd_has_laptop: "",
  cd_education: "",
  cd_institution: "",
};

function Field({ label, required, helper, children }: { label: string; required?: boolean; helper?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {helper && <p className="text-muted-foreground text-xs">{helper}</p>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function OptSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Option[];
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One name-only dialog reused for quick-creating source / campaign. */
function QuickCreateDialog({
  open,
  title,
  pending,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  pending: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (!open) setName("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Create it without leaving the form.</DialogDescription>
        </DialogHeader>
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="brand" onClick={() => onSubmit(name)} disabled={pending}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LeadFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = !!id;

  const { lead: existing } = useLead(id);

  // Form state (declared early — the counselor query is scoped by the branch).
  const [form, setForm] = useState<FormState>(EMPTY);
  const [seeded, setSeeded] = useState(!editing);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);

  // Sticky labels for the searchable comboboxes, so the picked item still shows
  // in the trigger even when it falls outside the current server-search page.
  const [labels, setLabels] = useState({
    branch: "",
    counselor: "",
    course: "",
    campaign: "",
    province: "",
    city: "",
    source: "",
    status: "",
    priority: "",
  });
  // Which lookup's quick-create dialog is open (name-based lookups only).
  const [createLookup, setCreateLookup] = useState<null | "source" | "campaign">(null);
  // id → name for the additional-courses chips (survives server-search paging).
  const [courseLabels, setCourseLabels] = useState<Record<string, string>>({});

  // Debounced server-side search text for the large lookups (Combobox debounces).
  const [branchSearch, setBranchSearch] = useState("");
  const [counselorSearch, setCounselorSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [provinceSearch, setProvinceSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const branchId = form.branch ? Number(form.branch) : undefined;
  const provinceId = form.province ? Number(form.province) : undefined;

  const statusesQ = useLeadStatuses();
  const sourcesQ = useLeadSources();
  const prioritiesQ = useLeadPriorities();
  const campaignsQ = useCampaigns();
  const coursesQ = useCourses(1, 100, courseSearch);
  const usersQ = useCounselors(counselorSearch, branchId);
  const branchesQ = useBranches(1, 100, branchSearch);
  const provincesQ = useProvinces(provinceSearch);
  const citiesQ = useCities(provinceId, citySearch);

  const opts = useMemo(() => {
    return {
      sources: (sourcesQ.data?.results ?? []).map((s) => ({ value: String(s.id), label: s.name })),
      statuses: (statusesQ.data?.results ?? []).map((s) => ({ value: String(s.id), label: s.name })),
      priorities: (prioritiesQ.data?.results ?? []).map((p) => ({ value: String(p.id), label: p.name })),
      campaigns: (campaignsQ.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.name })),
      courses: (coursesQ.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.name })),
      counselors: (usersQ.data?.results ?? []).map((u) => ({ value: String(u.id), label: u.name })),
      branches: (branchesQ.data?.results ?? []).map((b) => ({ value: String(b.id), label: b.name })),
      provinces: (provincesQ.data?.results ?? []).map((p) => ({ value: String(p.id), label: p.name })),
      cities: (citiesQ.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.name })),
    };
  }, [sourcesQ.data, statusesQ.data, prioritiesQ.data, campaignsQ.data, coursesQ.data, usersQ.data, branchesQ.data, provincesQ.data, citiesQ.data]);

  // The existing lead loads async on the API path — populate the form once it arrives.
  useEffect(() => {
    if (seeded || !existing) return;
    setForm({
      ...EMPTY,
      full_name: existing.fullName,
      phone: existing.primaryPhone,
      secondary_phone: existing.secondaryPhone ?? "",
      email: existing.email ?? "",
      address: existing.address ?? "",
      notes: existing.generalNotes ?? "",
      expected_revenue: existing.expectedRevenue != null ? String(existing.expectedRevenue) : "",
      source: existing.sourceId != null ? String(existing.sourceId) : "",
      campaign: existing.campaignId != null ? String(existing.campaignId) : "",
      status: existing.statusId != null ? String(existing.statusId) : "",
      priority: existing.priorityId != null ? String(existing.priorityId) : "",
      assigned_counselor: existing.assignedTo ?? "",
      primary_course: existing.primaryCourseId != null ? String(existing.primaryCourseId) : "",
      additional_courses: existing.courseInterests.filter((c) => !c.isPrimary).map((c) => c.courseId),
      branch: existing.branchId != null ? String(existing.branchId) : "",
      province: existing.provinceId != null ? String(existing.provinceId) : "",
      city: existing.cityId != null ? String(existing.cityId) : "",
      landmark: existing.landmark ?? "",
      heard_from: existing.heardFrom ?? "",
      cd_learning_mode: existing.customData.preferredLearningMode ?? "",
      cd_shift: existing.customData.preferredShift ?? "",
      cd_has_laptop:
        existing.customData.hasLaptop == null ? "" : existing.customData.hasLaptop ? "yes" : "no",
      cd_education: existing.customData.educationLevel ?? "",
      cd_institution: existing.customData.institutionName ?? "",
    });
    setLabels({
      branch: existing.branchName ?? "",
      counselor: existing.assignedToName ?? "",
      course:
        existing.courseInterests.find((c) => c.isPrimary)?.courseName ??
        existing.courseInterests[0]?.courseName ??
        "",
      campaign: existing.campaign ?? "",
      province: existing.provinceName ?? "",
      city: existing.cityName ?? "",
      source: existing.sourceName ?? "",
      status: existing.statusName ?? "",
      priority: existing.priorityName ?? "",
    });
    setCourseLabels(
      Object.fromEntries(existing.courseInterests.map((c) => [c.courseId, c.courseName])),
    );
    setSeeded(true);
  }, [existing, seeded]);

  const set = <K extends keyof FormState>(key: K, v: FormState[K]) => setForm((f) => ({ ...f, [key]: v }));

  // Combobox pickers — capture the chosen label; changing branch resets counselor.
  const onPickBranch = (v: string) => {
    const changed = v !== form.branch;
    setForm((f) => ({ ...f, branch: v, assigned_counselor: changed ? "" : f.assigned_counselor }));
    setLabels((l) => ({
      ...l,
      branch: opts.branches.find((o) => o.value === v)?.label ?? l.branch,
      counselor: changed ? "" : l.counselor,
    }));
  };
  const onPickCounselor = (v: string) => {
    set("assigned_counselor", v);
    setLabels((l) => ({ ...l, counselor: opts.counselors.find((o) => o.value === v)?.label ?? l.counselor }));
  };
  const onPickCourse = (v: string) => {
    set("primary_course", v);
    setLabels((l) => ({ ...l, course: opts.courses.find((o) => o.value === v)?.label ?? l.course }));
  };
  const onChangeAdditionalCourses = (vals: string[]) => {
    set("additional_courses", vals);
    setCourseLabels((m) => {
      const next = { ...m };
      for (const v of vals) if (!next[v]) next[v] = opts.courses.find((o) => o.value === v)?.label ?? v;
      return next;
    });
  };

  /**
   * Sync the lead's non-primary course interests to `additional_courses`.
   * `primary_course` is set on the lead itself; extras live in the nested
   * collection (the lead payload can't carry an array), so add/remove the diff.
   */
  async function syncAdditionalCourses(leadApiId: number) {
    const primary = form.primary_course ? Number(form.primary_course) : null;
    const desired = form.additional_courses
      .map(Number)
      .filter((c) => Number.isFinite(c) && c !== primary);
    let existingNonPrimary: { id: number; course: number }[] = [];
    try {
      const res = await leadsService.courseInterests(leadApiId);
      // Enquiries without a course are left alone.
      existingNonPrimary = res.results.flatMap((r) =>
        !r.is_primary && r.course != null ? [{ id: r.id, course: r.course }] : [],
      );
    } catch {
      /* best effort — leave as empty and only add */
    }
    const existingIds = new Set(existingNonPrimary.map((r) => r.course));
    const toAdd = desired.filter((c) => !existingIds.has(c));
    const toRemove = existingNonPrimary.filter((r) => !desired.includes(r.course));
    if (!toAdd.length && !toRemove.length) return;
    const results = await Promise.allSettled([
      ...toAdd.map((course) =>
        leadsService.addCourseInterest(leadApiId, { course, is_primary: false, interest_level: "medium" }),
      ),
      ...toRemove.map((r) => leadsService.removeCourseInterest(leadApiId, r.id)),
    ]);
    for (const r of results) {
      if (r.status === "rejected") toast.error(apiErrorMessage(r.reason, "Course not updated"));
    }
  }
  const onPickCampaign = (v: string) => {
    set("campaign", v);
    setLabels((l) => ({ ...l, campaign: opts.campaigns.find((o) => o.value === v)?.label ?? l.campaign }));
  };
  const onPickSource = (v: string) => {
    set("source", v);
    setLabels((l) => ({ ...l, source: opts.sources.find((o) => o.value === v)?.label ?? l.source }));
  };
  const onPickStatus = (v: string) => {
    set("status", v);
    setLabels((l) => ({ ...l, status: opts.statuses.find((o) => o.value === v)?.label ?? l.status }));
  };
  const onPickPriority = (v: string) => {
    set("priority", v);
    setLabels((l) => ({ ...l, priority: opts.priorities.find((o) => o.value === v)?.label ?? l.priority }));
  };

  // Inline create for the name-based lookups — reuses one quick-create dialog.
  const createSource = sourceHooks.useCreate();
  const createCampaign = campaignHooks.useCreate();
  const createBusy = createSource.isPending || createCampaign.isPending;

  const submitCreateLookup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required.");
      return;
    }
    if (createLookup === "source") {
      createSource.mutate(
        { name: trimmed, is_active: true, is_protected: false },
        {
          onSuccess: (s) => {
            set("source", String(s.id));
            setLabels((l) => ({ ...l, source: s.name }));
            setCreateLookup(null);
          },
        },
      );
    } else if (createLookup === "campaign") {
      createCampaign.mutate(
        { name: trimmed, source: null, is_active: true },
        {
          onSuccess: (c) => {
            set("campaign", String(c.id));
            setLabels((l) => ({ ...l, campaign: c.name }));
            setCreateLookup(null);
          },
        },
      );
    }
  };

  const createFooter = (kind: "source" | "campaign", label: string) => (
    <button
      type="button"
      onClick={() => setCreateLookup(kind)}
      className="text-brand hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium"
    >
      <Plus className="size-4" /> Create {label}
    </button>
  );
  const onPickProvince = (v: string) => {
    const changed = v !== form.province;
    setForm((f) => ({ ...f, province: v, city: changed ? "" : f.city }));
    setLabels((l) => ({
      ...l,
      province: opts.provinces.find((o) => o.value === v)?.label ?? l.province,
      city: changed ? "" : l.city,
    }));
  };
  const onPickCity = (v: string) => {
    set("city", v);
    setLabels((l) => ({ ...l, city: opts.cities.find((o) => o.value === v)?.label ?? l.city }));
  };
  const onBranchCreated = (b: ApiBranch) => {
    setForm((f) => ({ ...f, branch: String(b.id), assigned_counselor: "" }));
    setLabels((l) => ({ ...l, branch: b.name, counselor: "" }));
  };

  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const saving = createLead.isPending || updateLead.isPending;

  const num = (v: string) => (v ? Number(v) : null);

  // Leads with the same phone number, from any branch.
  const phoneQ = usePhoneMatch(form.phone, editing ? existing?.apiId : undefined);
  const secondPhoneQ = usePhoneMatch(form.secondary_phone, editing ? existing?.apiId : undefined);
  const [refusedMatches, setRefusedMatches] = useState<ApiPhoneMatch[]>([]);
  useEffect(() => setRefusedMatches([]), [form.phone, form.secondary_phone]);
  const phoneMatches = useMemo(() => {
    const byId = new Map<number, ApiPhoneMatch>();
    for (const m of [...(phoneQ.data ?? []), ...(secondPhoneQ.data ?? []), ...refusedMatches]) {
      byId.set(m.id, m);
    }
    return [...byId.values()];
  }, [phoneQ.data, secondPhoneQ.data, refusedMatches]);
  const pickedCourses = useMemo(
    () =>
      [...new Set([form.primary_course, ...form.additional_courses].filter(Boolean).map(Number))].filter(
        Number.isFinite,
      ),
    [form.primary_course, form.additional_courses],
  );

  function save(allowDuplicatePhone = false) {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error("Full name and phone are required.");
      return;
    }

    const customData: LeadCustomData = {
      preferredLearningMode: (form.cd_learning_mode as LearningMode) || undefined,
      preferredShift: (form.cd_shift as Shift) || undefined,
      hasLaptop: form.cd_has_laptop === "yes" ? true : form.cd_has_laptop === "no" ? false : undefined,
      educationLevel: (form.cd_education as EducationLevel) || undefined,
      institutionName: form.cd_institution.trim() || undefined,
    };

    const payload: ApiLeadPayload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      secondary_phone: form.secondary_phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      expected_revenue: form.expected_revenue.trim() || null,
      source: num(form.source),
      campaign: num(form.campaign),
      status: num(form.status),
      priority: num(form.priority),
      assigned_counselor: num(form.assigned_counselor),
      primary_course: num(form.primary_course),
      branch: num(form.branch),
      province: num(form.province),
      city: num(form.city),
      landmark: form.landmark.trim() || null,
      heard_from: form.heard_from.trim() || null,
      custom_data: buildCustomDataPayload(customData),
    };

    const done = (targetId?: number | string) => navigate(targetId ? `/leads/${targetId}` : "/leads");
    // Additional courses live in the nested collection — sync them, then navigate.
    const syncThenDone = (leadApiId?: number, target?: number | string) => {
      if (leadApiId != null) void syncAdditionalCourses(leadApiId).finally(() => done(target));
      else done(target);
    };

    if (editing) {
      if (existing?.apiId == null) return;
      updateLead.mutate(
        { id: existing.apiId, payload },
        { onSuccess: () => syncThenDone(existing.apiId, existing.apiId) },
      );
    } else {
      createLead.mutate(
        allowDuplicatePhone ? { ...payload, allow_duplicate_phone: true } : payload,
        {
          onSuccess: (lead) => syncThenDone(lead?.id, lead?.id),
          onError: (e) => {
            const matches = phoneMatchOf(e);
            if (!matches) return;
            setRefusedMatches(matches);
            toast.error("A lead with this phone number already exists.");
          },
        },
      );
    }
  }

  const title = editing ? `Edit ${existing?.fullName ?? "lead"}` : "New Lead";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <Link
        to={editing ? `/leads/${id}` : "/leads"}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> {editing ? "Back to lead" : "Back to leads"}
      </Link>

      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
          Lead intake
        </p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Fields marked <span className="text-destructive">*</span> are required.
        </p>
      </div>

      <Section title="Basic Information">
        <Field label="Full Name" required>
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Primary Phone" required>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9812345678" />
        </Field>
        <Field label="Secondary Phone">
          <Input value={form.secondary_phone} onChange={(e) => set("secondary_phone", e.target.value)} placeholder="Optional" />
        </Field>
        {phoneMatches.length > 0 && (
          <div className="sm:col-span-2">
            <PhoneMatchBox
              matches={phoneMatches}
              courses={pickedCourses}
              creating={!editing}
              saving={saving}
              onSaveAnyway={() => save(true)}
            />
          </div>
        )}
        <Field label="Email Address">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, area, city" />
          </Field>
        </div>
        <Field label="Province">
          <Combobox
            value={form.province}
            onChange={onPickProvince}
            options={opts.provinces}
            placeholder="Select province"
            searchPlaceholder="Search provinces…"
            emptyText="No provinces found."
            onSearchChange={setProvinceSearch}
            loading={provincesQ.isFetching}
            selectedLabel={labels.province}
          />
        </Field>
        <Field label="City">
          <Combobox
            value={form.city}
            onChange={onPickCity}
            options={opts.cities}
            placeholder="Select city"
            searchPlaceholder="Search cities…"
            emptyText={form.province ? "No cities in this province." : "No cities found."}
            onSearchChange={setCitySearch}
            loading={citiesQ.isFetching}
            selectedLabel={labels.city}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Landmark">
            <Input value={form.landmark} onChange={(e) => set("landmark", e.target.value)} placeholder="Nearby landmark" />
          </Field>
        </div>
      </Section>

      <Section title="Lead Classification">
        <Field label="Lead Source">
          <Combobox
            value={form.source}
            onChange={onPickSource}
            options={opts.sources}
            placeholder="Select source"
            searchPlaceholder="Search sources…"
            emptyText="No sources found."
            selectedLabel={labels.source}
            footer={createFooter("source", "source")}
          />
        </Field>
        <Field label="Campaign">
          <Combobox
            value={form.campaign}
            onChange={onPickCampaign}
            options={opts.campaigns}
            placeholder="Select campaign"
            searchPlaceholder="Search campaigns…"
            emptyText="No campaigns."
            selectedLabel={labels.campaign}
            footer={createFooter("campaign", "campaign")}
          />
        </Field>
        <Field label="Current Status">
          <Combobox
            value={form.status}
            onChange={onPickStatus}
            options={opts.statuses}
            placeholder="Select status"
            searchPlaceholder="Search statuses…"
            emptyText="No statuses found."
            selectedLabel={labels.status}
          />
        </Field>
        <Field label="Priority">
          <Combobox
            value={form.priority}
            onChange={onPickPriority}
            options={opts.priorities}
            placeholder="Select priority"
            searchPlaceholder="Search priorities…"
            emptyText="No priorities found."
            selectedLabel={labels.priority}
          />
        </Field>
        <Field label="Expected Revenue (NPR)">
          <Input
            type="number"
            min={0}
            value={form.expected_revenue}
            onChange={(e) => set("expected_revenue", e.target.value)}
            placeholder="e.g. 30000"
          />
        </Field>
        <Field label="Heard from" helper="How the lead heard about us (free text).">
          <Input
            value={form.heard_from}
            onChange={(e) => set("heard_from", e.target.value)}
            placeholder="e.g. Google Ads, friend referral"
          />
        </Field>

        {/* Branch + Assigned counselor — one row; counselor is scoped to the branch. */}
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <Field label="Branch">
            <Combobox
              value={form.branch}
              onChange={onPickBranch}
              options={opts.branches}
              placeholder="Select branch"
              searchPlaceholder="Search branches…"
              emptyText="No branches found."
              onSearchChange={setBranchSearch}
              loading={branchesQ.isFetching}
              selectedLabel={labels.branch}
              footer={
                <button
                  type="button"
                  onClick={() => setBranchDialogOpen(true)}
                  className="text-brand hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium"
                >
                  <Plus className="size-4" /> Create branch
                </button>
              }
            />
          </Field>
          <Field
            label="Assigned Counselor"
            helper={form.branch ? undefined : "Select a branch to choose a counselor"}
          >
            <Combobox
              value={form.assigned_counselor}
              onChange={onPickCounselor}
              options={opts.counselors}
              placeholder={form.branch ? "Select counselor" : "Select a branch first"}
              searchPlaceholder="Search counselors…"
              emptyText="No counselors in this branch."
              onSearchChange={setCounselorSearch}
              loading={usersQ.isFetching}
              disabled={!form.branch}
              selectedLabel={labels.counselor}
            />
          </Field>
        </div>
      </Section>

      <Section title="Course Interest" description="Primary course the lead is considering.">
        <div className="sm:col-span-2">
          <Field label="Primary Course">
            <Combobox
              value={form.primary_course}
              onChange={onPickCourse}
              options={opts.courses}
              placeholder="Select course"
              searchPlaceholder="Search courses…"
              emptyText="No courses found."
              onSearchChange={setCourseSearch}
              loading={coursesQ.isFetching}
              selectedLabel={labels.course}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Other courses of interest"
            helper="Optional — additional courses the lead is considering."
          >
            <MultiCombobox
              values={form.additional_courses}
              onChange={onChangeAdditionalCourses}
              options={opts.courses.filter((o) => o.value !== form.primary_course)}
              placeholder="Add courses"
              searchPlaceholder="Search courses…"
              emptyText="No courses found."
              onSearchChange={setCourseSearch}
              loading={coursesQ.isFetching}
              selectedLabels={courseLabels}
            />
          </Field>
        </div>
      </Section>

      <Section title="Type-specific Information" description="Stored in the lead's custom fields.">
        <Field label="Preferred Learning Mode">
          <OptSelect
            value={form.cd_learning_mode}
            onChange={(v) => set("cd_learning_mode", v)}
            placeholder="Select mode"
            options={LEARNING_MODES.map((m) => ({ value: m.value, label: m.label }))}
          />
        </Field>
        <Field label="Preferred Shift">
          <OptSelect
            value={form.cd_shift}
            onChange={(v) => set("cd_shift", v)}
            placeholder="Select shift"
            options={SHIFTS.map((s) => ({ value: s.value, label: s.label }))}
          />
        </Field>
        <Field label="Education Level">
          <OptSelect
            value={form.cd_education}
            onChange={(v) => set("cd_education", v)}
            placeholder="Select level"
            options={EDUCATION_LEVELS.map((e) => ({ value: e.value, label: e.label }))}
          />
        </Field>
        <Field label="Laptop Available">
          <OptSelect
            value={form.cd_has_laptop}
            onChange={(v) => set("cd_has_laptop", v)}
            placeholder="Unknown"
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="College / Institution">
            <Input value={form.cd_institution} onChange={(e) => set("cd_institution", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Short summary note" />
        </CardContent>
      </Card>

      {/* Sticky action bar */}
      <div className="bg-background/90 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-end gap-2 px-4 py-3 md:px-8">
          <Button variant="outline" onClick={() => navigate(editing ? `/leads/${id}` : "/leads")}>
            Cancel
          </Button>
          <Button variant="brand" onClick={() => save()} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Save Lead"}
          </Button>
        </div>
      </div>

      <BranchDialog
        open={branchDialogOpen}
        onClose={() => setBranchDialogOpen(false)}
        branch={null}
        onCreated={onBranchCreated}
      />

      <QuickCreateDialog
        open={createLookup !== null}
        title={createLookup === "source" ? "New source" : "New campaign"}
        pending={createBusy}
        onSubmit={submitCreateLookup}
        onClose={() => setCreateLookup(null)}
      />
    </div>
  );
}
