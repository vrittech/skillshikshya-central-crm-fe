import { ChevronLeft, ChevronRight, Download, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataSource } from "@/context/data-source";
import { useRole } from "@/context/role";
import {
  COURSE_CATALOG,
  COUNSELORS,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_TYPES,
} from "@/data/lead-lookups";
import { LEAD_LIST } from "@/data/mock-leads";
import { useCourses } from "@/hooks/use-courses";
import {
  useLeadPriorities,
  useLeadSources,
  useLeadStatuses,
  useLeadTypes,
} from "@/hooks/use-lead-config";
import {
  buildApiParams,
  useBulkAssignLeads,
  useBulkDeleteLeads,
  useLeadsList,
} from "@/hooks/use-leads";
import { useUsers } from "@/hooks/use-users";
import { leadsService } from "@/services/leads.service";
import type { LeadListItem } from "@/types/leads";
import { LeadActionDialogs, type LeadAction } from "./components/lead-action-dialogs";
import {
  LeadFilters,
  type LeadFilterOptions,
} from "./components/lead-filters";
import { DEFAULT_FILTERS, type LeadFilterState } from "./components/lead-filter-state";
import { LeadSummaryCards } from "./components/lead-summary-cards";
import { LeadTable } from "./components/lead-table";

/** In the mock preview, the "logged-in counselor" for the Counselor role. */
const CURRENT_COUNSELOR_ID = "u-sangita";

export default function LeadsPage() {
  const navigate = useNavigate();
  const { can } = useRole();
  const { source, isMock } = useDataSource();
  const apiEnabled = source === "api";
  const canViewAll = can("leads.view.all");

  const [filters, setFilters] = useState<LeadFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<LeadAction>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignTo, setBulkAssignTo] = useState("");

  // Codes (mock) and numeric IDs (api) aren't interchangeable — reset on switch.
  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setSelected(new Set());
  }, [source]);

  // Live config for the filter dropdowns (only fetched on the API path).
  const statusesQ = useLeadStatuses(apiEnabled);
  const sourcesQ = useLeadSources(apiEnabled);
  const prioritiesQ = useLeadPriorities(apiEnabled);
  const typesQ = useLeadTypes(apiEnabled);
  const coursesQ = useCourses(1, 100, "");
  const usersQ = useUsers(1, 100);

  const options: LeadFilterOptions = useMemo(() => {
    if (apiEnabled) {
      return {
        statuses: (statusesQ.data?.results ?? []).map((s) => ({ value: String(s.id), label: s.name })),
        sources: (sourcesQ.data?.results ?? []).map((s) => ({ value: String(s.id), label: s.name })),
        priorities: (prioritiesQ.data?.results ?? []).map((p) => ({ value: String(p.id), label: p.name })),
        courses: (coursesQ.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.name })),
        counselors: (usersQ.data?.results ?? []).map((u) => ({ value: String(u.id), label: u.name })),
        types: (typesQ.data?.results ?? []).map((t) => ({ value: String(t.id), label: t.name })),
      };
    }
    return {
      statuses: LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label })),
      sources: LEAD_SOURCES.map((s) => ({ value: s.value, label: s.label })),
      priorities: LEAD_PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
      courses: COURSE_CATALOG.map((c) => ({ value: c.id, label: c.name })),
      counselors: COUNSELORS.map((c) => ({ value: c.id, label: c.name })),
      types: LEAD_TYPES.map((t) => ({ value: t.value, label: t.label })),
    };
  }, [apiEnabled, statusesQ.data, sourcesQ.data, prioritiesQ.data, typesQ.data, coursesQ.data, usersQ.data]);

  // Counselors (mock role preview) see only their own book; API is governed by the backend.
  const effectiveFilters =
    isMock && !canViewAll ? { ...filters, assignedTo: CURRENT_COUNSELOR_ID } : filters;

  const { items, count, isLoading } = useLeadsList(effectiveFilters, page, pageSize);
  const bulkDelete = useBulkDeleteLeads();
  const bulkAssign = useBulkAssignLeads();

  // Selected rows that carry a backend id — only these can be mutated server-side.
  const selectedApiIds = useMemo(
    () => items.filter((l) => selected.has(l.id) && l.apiId != null).map((l) => l.apiId as number),
    [items, selected],
  );

  function confirmBulkDelete() {
    bulkDelete.mutate(selectedApiIds, {
      onSuccess: () => {
        setSelected(new Set());
        setBulkDeleteOpen(false);
      },
    });
  }

  function confirmBulkAssign() {
    if (!bulkAssignTo) return;
    bulkAssign.mutate(
      { ids: selectedApiIds, counselorId: Number(bulkAssignTo) },
      {
        onSuccess: () => {
          setSelected(new Set());
          setBulkAssignOpen(false);
          setBulkAssignTo("");
        },
      },
    );
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  const summaryLeads = useMemo(
    () =>
      isMock
        ? LEAD_LIST.filter((l) => canViewAll || l.assignedTo === CURRENT_COUNSELOR_ID)
        : items,
    [isMock, canViewAll, items],
  );

  function updateFilters(next: LeadFilterState) {
    setFilters(next);
    setPage(1);
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (items.every((l) => prev.has(l.id))) {
        const next = new Set(prev);
        items.forEach((l) => next.delete(l.id));
        return next;
      }
      const next = new Set(prev);
      items.forEach((l) => next.add(l.id));
      return next;
    });
  }

  function exportCsv() {
    if (isMock) {
      toast.info("Export CSV", { description: "Switch to the live data source to export." });
      return;
    }
    window.open(leadsService.exportCsvUrl(buildApiParams(effectiveFilters, 1, 100, "-created_at")), "_blank");
  }

  const activeLead: LeadListItem | null = actionId
    ? items.find((l) => l.id === actionId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM Workspace
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage inquiries, assignments, follow-ups, and enrollment progress.
            {isMock && " Previewing mock data."}
            {!canViewAll && isMock && " Showing leads assigned to you."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => toast.info("Import Leads", { description: "Bulk import ships with the backend importer." })}>
            <Upload /> Import
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download /> Export
          </Button>
          {can("recycle_bin.view") && (
            <Button variant="outline" onClick={() => navigate("/leads/recycle-bin")}>
              <Trash2 /> Recycle bin
            </Button>
          )}
          {can("leads.create") && (
            <Button variant="brand" onClick={() => navigate("/leads/new")}>
              <Plus /> New Lead
            </Button>
          )}
        </div>
      </div>

      <LeadSummaryCards leads={summaryLeads} />

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className="border-b p-4">
          <LeadFilters value={filters} onChange={updateFilters} options={options} showScopeToggles={isMock} />
        </div>

        {selected.size > 0 && (
          <div className="bg-brand-fixed-dim/15 flex items-center justify-between border-b px-4 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <div className="flex gap-2">
              {can("leads.assign") && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedApiIds.length === 0 || bulkAssign.isPending}
                  onClick={() => setBulkAssignOpen(true)}
                >
                  {bulkAssign.isPending ? "Assigning…" : "Assign"}
                </Button>
              )}
              {can("leads.delete") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={selectedApiIds.length === 0 || bulkDelete.isPending}
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  {bulkDelete.isPending ? "Deleting…" : "Delete"}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <LeadTable
            leads={items}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onAction={(a, id) => {
              setActionId(id);
              setAction(a);
            }}
            can={{
              edit: can("leads.edit"),
              assign: can("leads.assign"),
              logActivity: can("leads.log_activity"),
            }}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm">
              {count === 0
                ? "No leads"
                : `Showing ${start + 1}–${Math.min(start + pageSize, count)} of ${count} leads`}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft /> Previous
            </Button>
            <span className="text-muted-foreground px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <LeadActionDialogs
        action={action}
        lead={activeLead}
        onClose={() => {
          setAction(null);
          setActionId(null);
        }}
      />

      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign {selectedApiIds.length} lead{selectedApiIds.length === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription>Choose the counselor to own the selected leads.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Counselor</Label>
            <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select counselor" />
              </SelectTrigger>
              <SelectContent>
                {options.counselors.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected.size > selectedApiIds.length && (
              <p className="text-muted-foreground text-xs">
                {selected.size - selectedApiIds.length} selected row(s) have no saved record yet and
                will be skipped.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignOpen(false)} disabled={bulkAssign.isPending}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={confirmBulkAssign}
              disabled={!bulkAssignTo || selectedApiIds.length === 0 || bulkAssign.isPending}
            >
              {bulkAssign.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedApiIds.length} lead{selectedApiIds.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This moves the selected leads to the recycle bin (soft delete). They can be restored
              or permanently purged by an administrator.
              {selected.size > selectedApiIds.length && (
                <>
                  {" "}
                  {selected.size - selectedApiIds.length} selected row(s) have no saved record yet and
                  will be skipped.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmBulkDelete();
              }}
              disabled={selectedApiIds.length === 0 || bulkDelete.isPending}
            >
              {bulkDelete.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
