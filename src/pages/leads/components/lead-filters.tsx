import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface LeadFilterState {
  search: string;
  status: string;
  source: string;
  course: string;
  assignedTo: string;
  priority: string;
  /** Enrollment status ("all" = any) — maps to `?enrollment_status=`. */
  enrollment: string;
  overdueOnly: boolean;
  /** Exact created day, `YYYY-MM-DD` ("" = unset) — maps to `?created_date=`. */
  createdDate: string;
  /** Created on or after, `YYYY-MM-DD` ("" = unset) — maps to `?from_date=`. */
  dateFrom: string;
  /** Created on or before, `YYYY-MM-DD` ("" = unset) — maps to `?to_date=`. */
  dateTo: string;
}

export const DEFAULT_FILTERS: LeadFilterState = {
  search: "",
  status: "all",
  source: "all",
  course: "all",
  assignedTo: "all",
  priority: "all",
  enrollment: "all",
  overdueOnly: false,
  createdDate: "",
  dateFrom: "",
  dateTo: "",
};

export interface FilterOption {
  value: string;
  label: string;
}

export interface LeadFilterOptions {
  statuses: FilterOption[];
  sources: FilterOption[];
  courses: FilterOption[];
  counselors: FilterOption[];
  priorities: FilterOption[];
}

const ENROLLMENT_STATUSES: FilterOption[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "dropped_out", label: "Dropped out" },
  { value: "transferred", label: "Transferred" },
];

interface Props {
  value: LeadFilterState;
  onChange: (next: LeadFilterState) => void;
  options: LeadFilterOptions;
}

/** How many filters (search aside) differ from the defaults. */
function activeFilterCount(v: LeadFilterState): number {
  return (Object.keys(DEFAULT_FILTERS) as (keyof LeadFilterState)[]).filter(
    (k) => k !== "search" && v[k] !== DEFAULT_FILTERS[k],
  ).length;
}

function FilterSelect({
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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 w-auto max-w-[14rem] shrink-0 gap-2 rounded-full",
          active && "border-brand bg-brand/10 text-brand",
        )}
      >
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
  );
}

function FilterDate({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 rounded-full border pr-1 pl-3 text-sm whitespace-nowrap",
        value ? "border-brand bg-brand/10 text-brand" : "text-muted-foreground",
      )}
    >
      {label}
      <input
        type="date"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-foreground h-7 rounded-full bg-transparent px-1 text-sm outline-none"
      />
    </label>
  );
}

function FilterToggle({
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
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 cursor-pointer rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "border-brand bg-brand/10 text-brand"
          : "bg-background text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Search and the date filters on top, every other filter below. Both rows
 * wrap onto more lines, so nothing scrolls sideways.
 */
export function LeadFilters({ value, onChange, options }: Props) {
  const set = <K extends keyof LeadFilterState>(key: K, v: LeadFilterState[K]) =>
    onChange({ ...value, [key]: v });
  const activeCount = activeFilterCount(value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search by name, phone, email, or lead ID"
            className="rounded-full pl-9"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>
        <FilterDate label="Created on" value={value.createdDate} onChange={(v) => set("createdDate", v)} />
        <FilterDate label="From" value={value.dateFrom} max={value.dateTo || undefined} onChange={(v) => set("dateFrom", v)} />
        <FilterDate label="To" value={value.dateTo} min={value.dateFrom || undefined} onChange={(v) => set("dateTo", v)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect label="Status" value={value.status} onChange={(v) => set("status", v)} allLabel="All statuses" options={options.statuses} />
        <FilterSelect label="Enrollment" value={value.enrollment} onChange={(v) => set("enrollment", v)} allLabel="All enrollments" options={ENROLLMENT_STATUSES} />
        <FilterSelect label="Source" value={value.source} onChange={(v) => set("source", v)} allLabel="All sources" options={options.sources} />
        <FilterSelect label="Course" value={value.course} onChange={(v) => set("course", v)} allLabel="All courses" options={options.courses} />
        <FilterSelect
          label="Assigned to"
          value={value.assignedTo}
          onChange={(v) => set("assignedTo", v)}
          allLabel="All counselors"
          options={options.counselors}
        />
        <FilterSelect label="Priority" value={value.priority} onChange={(v) => set("priority", v)} allLabel="All priorities" options={options.priorities} />
        <FilterToggle active={value.overdueOnly} onClick={() => set("overdueOnly", !value.overdueOnly)}>
          Overdue
        </FilterToggle>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-9 shrink-0 rounded-full"
            onClick={() => onChange({ ...DEFAULT_FILTERS, search: value.search })}
          >
            <X /> Clear ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}
