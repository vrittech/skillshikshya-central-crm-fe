import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranches } from "@/hooks/use-branches";
import { useUsers } from "@/hooks/use-users";

export type CallDateRange = "today" | "last7" | "month" | "custom" | "";

interface CallFiltersProps {
  search: string;
  direction: string;
  createdBy: string;
  branchId: string;
  dateRange: CallDateRange;
  dateFrom: string;
  dateTo: string;
  showBranch: boolean;
  onSearchChange: (value: string) => void;
  onDirectionChange: (value: string) => void;
  onCreatedByChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onDateRangeChange: (value: CallDateRange) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClear: () => void;
}

export function CallFilters({
  search,
  direction,
  createdBy,
  branchId,
  dateRange,
  dateFrom,
  dateTo,
  showBranch,
  onSearchChange,
  onDirectionChange,
  onCreatedByChange,
  onBranchChange,
  onDateRangeChange,
  onDateFromChange,
  onDateToChange,
  onClear,
}: CallFiltersProps) {
  const [userSearch, setUserSearch] = useState("");
  const users = useUsers(1, 100, userSearch);
  const branches = useBranches(1, 100, "", showBranch);
  const userOptions = (users.data?.results ?? []).map((user) => ({
    value: String(user.id),
    label: user.name,
  }));
  const branchOptions = branches.data?.results ?? [];

  return (
    <div className="flex min-w-0 flex-wrap items-end gap-3">
      <div className="relative min-w-0 flex-1 basis-full sm:basis-56">
        <label htmlFor="calls-search" className="mb-1.5 block text-sm font-medium">
          Search
        </label>
        <Search className="text-muted-foreground absolute top-10 left-3 size-4" />
        <Input
          id="calls-search"
          placeholder="Lead, phone, caller, or notes"
          className="w-full rounded-full pl-9"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="grid min-w-0 flex-1 basis-36 gap-1.5">
        <label htmlFor="calls-direction" className="text-sm font-medium">
          Direction
        </label>
        <Select value={direction || "all"} onValueChange={onDirectionChange}>
          <SelectTrigger id="calls-direction" className="w-full">
            <SelectValue placeholder="All directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 flex-1 basis-52 gap-1.5">
        <label className="text-sm font-medium">Logged by</label>
        <Combobox
          value={createdBy}
          onChange={onCreatedByChange}
          options={userOptions}
          placeholder="All users"
          searchPlaceholder="Find user..."
          emptyText="No users found."
          selectedLabel={`User ${createdBy}`}
          onSearchChange={setUserSearch}
        />
      </div>

      {showBranch && (
        <div className="grid min-w-0 flex-1 basis-40 gap-1.5">
          <label htmlFor="calls-branch" className="text-sm font-medium">
            Branch
          </label>
          <Select value={branchId || "all"} onValueChange={onBranchChange}>
            <SelectTrigger id="calls-branch" className="w-full">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branchOptions.map((branch) => (
                <SelectItem key={branch.id} value={String(branch.id)}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid min-w-0 flex-1 basis-full gap-1.5">
        <label htmlFor="calls-date-range" className="text-sm font-medium">
          Date range
        </label>
        <Select
          value={dateRange || "all"}
          onValueChange={(value) => onDateRangeChange(value === "all" ? "" : value as CallDateRange)}
        >
          <SelectTrigger id="calls-date-range" className="w-full">
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="last7">Last 7 days</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dateRange === "custom" && (
        <>
          <div className="grid min-w-0 flex-1 basis-40 gap-1.5">
            <label htmlFor="calls-date-from" className="text-sm font-medium">
              From
            </label>
            <Input
              id="calls-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
            />
          </div>
          <div className="grid min-w-0 flex-1 basis-40 gap-1.5">
            <label htmlFor="calls-date-to" className="text-sm font-medium">
              To
            </label>
            <Input
              id="calls-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => onDateToChange(event.target.value)}
            />
          </div>
        </>
      )}

      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
