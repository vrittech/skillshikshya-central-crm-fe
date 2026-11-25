import { Lock, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useDataSource } from "@/context/data-source";
import { useRole } from "@/context/role";
import { useAuth } from "@/context/auth";
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES, LEAD_TYPES } from "@/data/lead-lookups";
import {
  campaignHooks,
  institutionHooks,
  learningModeHooks,
  priorityHooks,
  sourceHooks,
  statusHooks,
  tagHooks,
  useCampaigns,
  useInstitutions,
  useLeadPriorities,
  useLeadSources,
  useLeadStatuses,
  useLeadTags,
  useLearningModes,
} from "@/hooks/use-lead-config";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/leads-format";
import { useOrbitChatSyncState, useUpdateOrbitChatSync } from "@/hooks/use-orbitchat";
import { EmailSettingsPanel } from "./email-settings";
import { StorageSettingsPanel } from "./storage-settings";

type Section =
  | "sources"
  | "campaigns"
  | "statuses"
  | "priorities"
  | "tags"
  | "types"
  | "learning_modes"
  | "institutions"
  | "integrations"
  | "storage"
  | "email";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "sources", label: "Lead Sources" },
  { key: "campaigns", label: "Campaigns" },
  { key: "statuses", label: "Statuses" },
  { key: "priorities", label: "Priorities" },
  { key: "tags", label: "Tags" },
  { key: "types", label: "Lead Types" },
  { key: "learning_modes", label: "Learning Modes" },
  { key: "institutions", label: "Institutions" },
  { key: "integrations", label: "Integrations" },
  { key: "storage", label: "Cloud storage" },
  { key: "email", label: "Email" },
];

/* ------------------------------------------------------------ field schema */

type FieldType = "text" | "color" | "number" | "bool";
interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default?: unknown;
}

interface EntityConfig {
  label: string;
  hasColor?: boolean;
  fields: FieldDef[];
  hooks: {
    useCreate: () => { mutate: (p: never, o?: { onSuccess?: () => void }) => void };
    useUpdate: () => { mutate: (p: never, o?: { onSuccess?: () => void }) => void };
    useRemove: () => { mutate: (id: number, o?: { onSuccess?: () => void }) => void };
  };
}

const ENTITY: Partial<Record<Section, EntityConfig>> = {
  sources: {
    label: "Source",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "is_active", label: "Active", type: "bool", default: true },
      {
        key: "is_protected",
        label: "Protected (cannot be deleted)",
        type: "bool",
        default: false,
      },
    ],
    hooks: sourceHooks as never,
  },
  campaigns: {
    label: "Campaign",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "is_active", label: "Active", type: "bool", default: true },
    ],
    hooks: campaignHooks as never,
  },
  statuses: {
    label: "Status",
    hasColor: true,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "color", label: "Color", type: "color", default: "#2563eb" },
      { key: "sort_order", label: "Sort order", type: "number", default: 0 },
      { key: "is_final", label: "Final (terminal)", type: "bool", default: false },
      { key: "is_active", label: "Active", type: "bool", default: true },
    ],
    hooks: statusHooks as never,
  },
  priorities: {
    label: "Priority",
    hasColor: true,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "color", label: "Color", type: "color", default: "#f59e0b" },
      { key: "sort_order", label: "Sort order", type: "number", default: 0 },
      { key: "is_active", label: "Active", type: "bool", default: true },
    ],
    hooks: priorityHooks as never,
  },
  tags: {
    label: "Tag",
    hasColor: true,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "color", label: "Color", type: "color", default: "#64748b" },
      { key: "is_active", label: "Active", type: "bool", default: true },
    ],
    hooks: tagHooks as never,
  },
  learning_modes: {
    label: "Learning mode",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      { key: "is_active", label: "Active", type: "bool", default: true },
    ],
    hooks: learningModeHooks as never,
  },
  institutions: {
    label: "Institution",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      { key: "address", label: "Address", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "is_active", label: "Active", type: "bool", default: true },
    ],
    hooks: institutionHooks as never,
  },
};

interface Row {
  id: number;
  name: string;
  color?: string;
  is_active?: boolean;
  [k: string]: unknown;
}

/* ------------------------------------------------------------------ dialog */

function EditorDialog({
  open,
  onClose,
  section,
  row,
}: {
  open: boolean;
  onClose: () => void;
  section: Section;
  row: Row | null;
}) {
  const cfg = ENTITY[section];
  const create = cfg?.hooks.useCreate();
  const update = cfg?.hooks.useUpdate();
  const [values, setValues] = useState<Record<string, unknown>>({});

  // Seed defaults / existing row when the dialog opens.
  const seed = () => {
    if (!cfg) return;
    const v: Record<string, unknown> = {};
    for (const f of cfg.fields) v[f.key] = row ? (row[f.key] ?? f.default ?? "") : (f.default ?? "");
    setValues(v);
  };

  if (!cfg) return null;

  function submit() {
    for (const f of cfg!.fields) {
      if (f.required && !String(values[f.key] ?? "").trim()) {
        toast.error(`${f.label} is required.`);
        return;
      }
    }
    const onSuccess = () => onClose();
    if (row) update?.mutate({ id: row.id, payload: values } as never, { onSuccess });
    else create?.mutate(values as never, { onSuccess });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) seed();
        else onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {row ? "Edit" : "New"} {cfg.label}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {cfg.fields.map((f) => (
            <div key={f.key} className="grid gap-2">
              <Label>
                {f.label}
                {f.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {f.type === "bool" ? (
                <Switch
                  checked={Boolean(values[f.key])}
                  onCheckedChange={(c) => setValues((v) => ({ ...v, [f.key]: c }))}
                />
              ) : f.type === "color" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={String(values[f.key] ?? "#000000")}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="size-9 cursor-pointer rounded-md border"
                  />
                  <Input
                    value={String(values[f.key] ?? "")}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="font-mono"
                  />
                </div>
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="brand" onClick={submit}>
            {row ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- integrations */

function OrbitChatSyncCard({ canManage }: { canManage: boolean }) {
  const stateQ = useOrbitChatSyncState(canManage);
  const update = useUpdateOrbitChatSync();
  const state = stateQ.data;

  return (
    <div className="bg-surface-container-low flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <RefreshCcw className="text-brand size-4 shrink-0" />
          <p className="text-sm font-semibold">OrbitChat lead sync</p>
        </div>
        <p className="text-muted-foreground text-xs">
          Hourly automatic import of OrbitChat contacts as CRM leads. Toggling takes effect on the
          next hourly tick — no restart needed.
        </p>
        <p className="text-muted-foreground text-xs">
          Last sync:{" "}
          {state?.last_sync_at ? (
            formatDateTime(state.last_sync_at)
          ) : stateQ.isLoading ? (
            "…"
          ) : (
            "never"
          )}
        </p>
      </div>
      <Switch
        disabled={!canManage || update.isPending}
        checked={state?.is_enabled ?? false}
        onCheckedChange={(checked) => update.mutate({ is_enabled: checked })}
      />
    </div>
  );
}

/* -------------------------------------------------------------------- page */

function RowItem({
  row,
  meta,
  onEdit,
  onDelete,
  canManage,
  locked,
}: {
  row: Row;
  meta?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage: boolean;
  /** Backend-protected rows (e.g. protected lead sources) — delete is hidden. */
  locked?: boolean;
}) {
  const deletable = canManage && onDelete && !locked;
  return (
    <div className="bg-surface-container-low flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="flex min-w-0 items-center gap-2">
        {row.color && <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{row.name}</p>
          {meta && <p className="text-muted-foreground text-xs">{meta}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {locked && (
          <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
            <Lock className="size-3" /> Protected
          </span>
        )}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            row.is_active === false
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          )}
        >
          {row.is_active === false ? "Inactive" : "Active"}
        </span>
        {canManage && onEdit && (
          <Button size="icon" variant="ghost" className="size-8" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
        )}
        {deletable && (
          <Button size="icon" variant="ghost" className="size-8" onClick={onDelete}>
            <Trash2 className="text-destructive size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("sources");
  const { source: dataSource } = useDataSource();
  const { can } = useRole();
  const isApi = dataSource === "api";
  const canManage = isApi && can("settings.view");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  // Live lists (API path only).
  const sourcesQ = useLeadSources(isApi);
  const campaignsQ = useCampaigns(isApi);
  const statusesQ = useLeadStatuses(isApi);
  const prioritiesQ = useLeadPriorities(isApi);
  const tagsQ = useLeadTags(isApi);
  const learningModesQ = useLearningModes(isApi);
  const institutionsQ = useInstitutions(isApi);

  // Call every remove hook unconditionally (rules of hooks), then select one.
  const removeSource = sourceHooks.useRemove();
  const removeCampaign = campaignHooks.useRemove();
  const removeStatus = statusHooks.useRemove();
  const removePriority = priorityHooks.useRemove();
  const removeTag = tagHooks.useRemove();
  const removeLearningMode = learningModeHooks.useRemove();
  const removeInstitution = institutionHooks.useRemove();
  const REMOVE_BY_SECTION: Partial<Record<Section, typeof removeSource>> = {
    sources: removeSource,
    campaigns: removeCampaign,
    statuses: removeStatus,
    priorities: removePriority,
    tags: removeTag,
    learning_modes: removeLearningMode,
    institutions: removeInstitution,
  };
  const removeHook = REMOVE_BY_SECTION[section] ?? removeSource;

  const heading = SECTIONS.find((s) => s.key === section)!.label;

  function liveRows(): Row[] {
    switch (section) {
      case "sources":
        return (sourcesQ.data?.results ?? []) as unknown as Row[];
      case "campaigns":
        return (campaignsQ.data?.results ?? []) as unknown as Row[];
      case "statuses":
        return (statusesQ.data?.results ?? []) as unknown as Row[];
      case "priorities":
        return (prioritiesQ.data?.results ?? []) as unknown as Row[];
      case "tags":
        return (tagsQ.data?.results ?? []) as unknown as Row[];
      case "learning_modes":
        return (learningModesQ.data?.results ?? []) as unknown as Row[];
      case "institutions":
        return (institutionsQ.data?.results ?? []) as unknown as Row[];
      default:
        return [];
    }
  }

  function mockRows(): { name: string; meta?: string }[] {
    switch (section) {
      case "sources":
        return LEAD_SOURCES.map((s) => ({ name: s.label, meta: s.value }));
      case "statuses":
        return LEAD_STATUSES.map((s) => ({ name: s.label, meta: `${s.category}${s.isTerminal ? " · terminal" : ""}` }));
      case "priorities":
        return LEAD_PRIORITIES.map((p) => ({ name: p.label, meta: p.description }));
      case "types":
        return LEAD_TYPES.map((t) => ({ name: t.label, meta: t.value }));
      default:
        return [];
    }
  }

  const isTypes = section === "types";
  const isIntegrations = section === "integrations";
  // Cloud storage and Email have their own panels, not the list + editor.
  const isSystem = section === "storage" || section === "email";
  const { user } = useAuth();
  // OrbitChat sync-state is staff-only per the API guide.
  const canManageIntegrations = isApi && !!user?.is_staff;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            System controls
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure the CRM vocabulary — sources, campaigns, statuses, priorities, tags,
            learning modes, and institutions.
            {!isApi && " Switch the data source to Live to edit."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit p-2">
          <div className="grid gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  section === s.key
                    ? "bg-brand-fixed-dim/20 text-brand-container"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Card>

        {isSystem ? (
          canManageIntegrations ? (
            section === "storage" ? (
              <StorageSettingsPanel />
            ) : (
              <EmailSettingsPanel />
            )
          ) : (
            <Card>
              <CardContent className="text-muted-foreground py-10 text-center text-sm">
                {isApi ? "Only administrators can manage this." : "Switch the data source to Live to edit."}
              </CardContent>
            </Card>
          )
        ) : isIntegrations ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-base">{heading}</CardTitle>
                <p className="text-muted-foreground mt-1 text-xs">
                  Third-party services that feed data into the CRM.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {canManageIntegrations ? (
                <OrbitChatSyncCard canManage={canManageIntegrations} />
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Only administrators can manage integrations.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{heading}</CardTitle>
              </div>
              {canManage && !isTypes && !isIntegrations && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setEditorOpen(true);
                  }}
                >
                  <Plus /> New
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {isApi && !isTypes ? (
                liveRows().length > 0 ? (
                  liveRows().map((r) => (
                    <RowItem
                      key={r.id}
                      row={r}
                      canManage={canManage}
                      locked={r.is_protected === true}
                      onEdit={() => {
                        setEditing(r);
                        setEditorOpen(true);
                      }}
                      onDelete={() => setDeleting(r)}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No {heading.toLowerCase()} yet.
                  </p>
                )
              ) : (
                mockRows().map((r, i) => (
                  <RowItem key={i} row={{ id: i, name: r.name, is_active: true }} meta={r.meta} canManage={false} />
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {!isTypes && !isIntegrations && !isSystem && (
        <EditorDialog
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          section={section}
          row={editing}
        />
      )}

      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {heading.toLowerCase().replace(/s$/, "")} from the CRM configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) removeHook.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
