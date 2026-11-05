import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/use-users";
import { useBranches } from "@/hooks/use-branches";
import { presetDates, type DatePreset } from "@/lib/calls-filters";

export function CallFilters({
  params,
  update,
  clear,
  isStaff,
  dateError,
}: {
  params: URLSearchParams;
  update: (changes: Record<string, string>) => void;
  clear: () => void;
  isStaff: boolean;
  dateError: string;
}) {
  const [userSearch, setUserSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const branchId = params.get("branch_id") ?? "";
  const users = useUsers(
    1,
    100,
    userSearch,
    isStaff && branchId ? Number(branchId) : undefined,
  );
  const branches = useBranches(1, 100, branchSearch, isStaff);
  const dateRange =
    params.get("range") ??
    (params.has("start") || params.has("end") ? "custom" : "all");

  function chooseRange(value: string) {
    if (value === "custom") update({ range: value });
    else
      update({
        range: value === "all" ? "" : value,
        ...presetDates(value as DatePreset),
      });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 basis-full sm:min-w-56 sm:flex-1 sm:basis-auto">
          <Label htmlFor="call-search" className="mb-2 text-xs">
            Search calls
          </Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-2.5 size-4" />
            <Input
              id="call-search"
              placeholder="Lead, phone, caller or notes"
              className="pl-9"
              value={params.get("search") ?? ""}
              onChange={(event) => update({ search: event.target.value })}
            />
          </div>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-36">
          <Label htmlFor="call-direction" className="mb-2 text-xs">
            Direction
          </Label>
          <Select
            value={params.get("direction") || "all"}
            onValueChange={(value) =>
              update({ direction: value === "all" ? "" : value })
            }
          >
            <SelectTrigger id="call-direction" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directions</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <Label htmlFor="call-user" className="mb-2 text-xs">Logged by</Label>
          <Combobox
            id="call-user"
            value={params.get("created_by") ?? ""}
            onChange={(value) => update({ created_by: value })}
            placeholder="All users"
            selectedLabel={`User #${params.get("created_by")}`}
            searchPlaceholder="Search users…"
            onSearchChange={setUserSearch}
            loading={users.isFetching}
            emptyText={
              users.isError
                ? "Could not load users. Try searching again."
                : "No users found."
            }
            options={[
              { value: "", label: "All users" },
              ...(users.data?.results ?? []).map((user) => ({
                value: String(user.id),
                label: user.name,
              })),
            ]}
          />
        </div>
        {isStaff && (
          <div className="w-[calc(50%-0.375rem)] sm:w-44">
            <Label htmlFor="call-branch" className="mb-2 text-xs">Branch</Label>
            <Combobox
              id="call-branch"
              value={branchId}
              onChange={(value) => update({ branch_id: value, created_by: "" })}
              placeholder="All branches"
              selectedLabel={`Branch #${branchId}`}
              searchPlaceholder="Search branches…"
              onSearchChange={setBranchSearch}
              loading={branches.isFetching}
              emptyText={
                branches.isError
                  ? "Could not load branches. Try searching again."
                  : "No branches found."
              }
              options={[
                { value: "", label: "All branches" },
                ...(branches.data?.results ?? []).map((branch) => ({
                  value: String(branch.id),
                  label: branch.name,
                })),
              ]}
            />
          </div>
        )}
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <Label htmlFor="call-range" className="mb-2 text-xs">
            Date range
          </Label>
          <Select value={dateRange} onValueChange={chooseRange}>
            <SelectTrigger id="call-range" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          className="text-muted-foreground h-9"
        >
          <X className="size-3.5" /> Clear filters
        </Button>
      </div>
      {dateRange !== "all" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-44">
            <Label htmlFor="call-start" className="mb-2 text-xs">
              From (NPT)
            </Label>
            <Input
              id="call-start"
              type="date"
              className="block min-w-0 w-full"
              value={params.get("start") ?? ""}
              aria-invalid={!!dateError}
              aria-describedby={dateError ? "call-date-error" : undefined}
              onChange={(event) =>
                update({ start: event.target.value, range: "custom" })
              }
            />
          </div>
          <div className="min-w-0 flex-1 sm:max-w-44">
            <Label htmlFor="call-end" className="mb-2 text-xs">
              Through (NPT)
            </Label>
            <Input
              id="call-end"
              type="date"
              className="block min-w-0 w-full"
              value={params.get("end") ?? ""}
              aria-invalid={!!dateError}
              aria-describedby={dateError ? "call-date-error" : undefined}
              onChange={(event) =>
                update({ end: event.target.value, range: "custom" })
              }
            />
          </div>
          <p className="text-muted-foreground pb-2 text-xs">
            Includes the entire last day.
          </p>
        </div>
      )}
      {dateError && (
        <p
          id="call-date-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {dateError}
        </p>
      )}
    </div>
  );
}
