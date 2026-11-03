import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DEFAULT_FILTERS, type LeadFilterState } from "./lead-filter-state";

export interface FilterOption {
  value: string;
  label: string;
}

export interface LeadFilterOptions {
  statuses: FilterOption[];
  sources: FilterOption[];
  types: FilterOption[];
  courses: FilterOption[];
  counselors: FilterOption[];
  priorities: FilterOption[];
}

interface Props {
  value: LeadFilterState;
  onChange: (next: LeadFilterState) => void;
  options: LeadFilterOptions;
  /** API path can't filter unassigned/archived server-side; hide those toggles. */
  showScopeToggles?: boolean;
}

const labelIn = (opts: FilterOption[], v: string) => opts.find((o) => o.value === v)?.label ?? v;

/** Applied (non-default) filters as removable chips, labels resolved via options. */
function activeChips(
  v: LeadFilterState,
  o: LeadFilterOptions,
): { key: string; label: string; clear: LeadFilterState }[] {
  const chips: { key: string; label: string; clear: LeadFilterState }[] = [];
  if (v.status !== "all") chips.push({ key: "status", label: `Status: ${labelIn(o.statuses, v.status)}`, clear: { ...v, status: "all" } });
  if (v.source !== "all") chips.push({ key: "source", label: `Source: ${labelIn(o.sources, v.source)}`, clear: { ...v, source: "all" } });
  if (v.type !== "all") chips.push({ key: "type", label: `Type: ${labelIn(o.types, v.type)}`, clear: { ...v, type: "all" } });
  if (v.course !== "all") chips.push({ key: "course", label: `Course: ${labelIn(o.courses, v.course)}`, clear: { ...v, course: "all" } });
  if (v.assignedTo === "unassigned") chips.push({ key: "assignedTo", label: "Unassigned", clear: { ...v, assignedTo: "all" } });
  else if (v.assignedTo !== "all") chips.push({ key: "assignedTo", label: `Counselor: ${labelIn(o.counselors, v.assignedTo)}`, clear: { ...v, assignedTo: "all" } });
  if (v.priority !== "all") chips.push({ key: "priority", label: `Priority: ${labelIn(o.priorities, v.priority)}`, clear: { ...v, priority: "all" } });
  if (v.dateFrom || v.dateTo) {
    const label = v.dateFrom && v.dateTo
      ? `Created ${v.dateFrom} → ${v.dateTo}`
      : v.dateFrom
        ? `Created from ${v.dateFrom}`
        : `Created up to ${v.dateTo}`;
    chips.push({ key: "created-range", label, clear: { ...v, dateFrom: "", dateTo: "" } });
  }
  if (v.createdDate) chips.push({ key: "created-date", label: `Created on ${v.createdDate}`, clear: { ...v, createdDate: "" } });
  if (v.overdueOnly) chips.push({ key: "overdueOnly", label: "Overdue only", clear: { ...v, overdueOnly: false } });
  if (v.unassignedOnly) chips.push({ key: "unassignedOnly", label: "Unassigned only", clear: { ...v, unassignedOnly: false } });
  return chips;
}

function SheetSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
  extra,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: FilterOption[];
  extra?: FilterOption[];
}) {
  const active = value !== "all";
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn("w-full", active && "border-brand text-brand")}>
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {extra?.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SheetToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors",
        active
          ? "border-brand bg-brand-fixed-dim/20 text-brand-container"
          : "bg-background text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function LeadFilters({ value, onChange, options, showScopeToggles = true }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LeadFilterState>(value);

  const chips = activeChips(value, options);
  const activeCount = chips.length;

  const setDraftField = <K extends keyof LeadFilterState>(key: K, v: LeadFilterState[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  function openSheet(next: boolean) {
    if (next) setDraft(value);
    setOpen(next);
  }
  function apply() {
    onChange(draft);
    setOpen(false);
  }
  function resetDraft() {
    setDraft({ ...DEFAULT_FILTERS, search: draft.search });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search by name, phone, email, or lead ID"
            className="rounded-full pl-9"
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
          />
        </div>

        <Button variant="outline" onClick={() => openSheet(true)}>
          <SlidersHorizontal /> Advanced Filters
          {activeCount > 0 && (
            <span className="bg-brand text-brand-foreground ml-1 inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
              {activeCount}
            </span>
          )}
        </Button>

      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange(c.clear)}
              className="border-brand/30 bg-brand-fixed-dim/15 text-brand-container hover:bg-brand-fixed-dim/25 inline-flex items-center gap-1 rounded-full border py-1 pr-1.5 pl-2.5 text-xs font-medium transition-colors"
            >
              {c.label}
              <X className="size-3.5" />
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7"
            onClick={() => onChange({ ...DEFAULT_FILTERS, search: value.search })}
          >
            Clear all
          </Button>
        </div>
      )}

      <Sheet open={open} onOpenChange={openSheet}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Advanced filters</SheetTitle>
            <SheetDescription>Refine the lead list, then apply.</SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-4">
            <SheetSelect label="Status" value={draft.status} onChange={(v) => setDraftField("status", v)} allLabel="All Statuses" options={options.statuses} />
            <SheetSelect label="Source" value={draft.source} onChange={(v) => setDraftField("source", v)} allLabel="All Sources" options={options.sources} />
            <SheetSelect label="Lead type" value={draft.type} onChange={(v) => setDraftField("type", v)} allLabel="All Lead Types" options={options.types} />
            <SheetSelect label="Course" value={draft.course} onChange={(v) => setDraftField("course", v)} allLabel="All Courses" options={options.courses} />
            <SheetSelect
              label="Assigned to"
              value={draft.assignedTo}
              onChange={(v) => setDraftField("assignedTo", v)}
              allLabel="All Counselors"
              options={options.counselors}
              extra={showScopeToggles ? [{ value: "unassigned", label: "Unassigned" }] : undefined}
            />
            <SheetSelect label="Priority" value={draft.priority} onChange={(v) => setDraftField("priority", v)} allLabel="All Priorities" options={options.priorities} />

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Created on</label>
              <Input
                type="date"
                aria-label="Created on"
                value={draft.createdDate}
                onChange={(e) => setDraftField("createdDate", e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Created between</label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  aria-label="Created from"
                  max={draft.dateTo || undefined}
                  value={draft.dateFrom}
                  onChange={(e) => setDraftField("dateFrom", e.target.value)}
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  aria-label="Created to"
                  min={draft.dateFrom || undefined}
                  value={draft.dateTo}
                  onChange={(e) => setDraftField("dateTo", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Quick toggles</label>
              <div className="flex flex-wrap gap-2">
                <SheetToggle active={draft.overdueOnly} onClick={() => setDraftField("overdueOnly", !draft.overdueOnly)}>
                  Overdue only
                </SheetToggle>
                {showScopeToggles && (
                  <SheetToggle active={draft.unassignedOnly} onClick={() => setDraftField("unassignedOnly", !draft.unassignedOnly)}>
                    Unassigned only
                  </SheetToggle>
                )}
              </div>
            </div>
          </SheetBody>

          <SheetFooter>
            <Button variant="ghost" className="mr-auto" onClick={resetDraft}>
              <RotateCcw /> Reset
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={apply}>
              Apply{activeChips(draft, options).length > 0 ? ` (${activeChips(draft, options).length})` : ""}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
