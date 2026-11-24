import { Search } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import type { CallFilterState, useCallFilters } from "@/hooks/use-call-filters";
import { useUsers } from "@/hooks/use-users";
import type { CallDateRange } from "@/lib/call-dates";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { CallDirection } from "@/types/calls";

const RANGE_LABELS: Record<CallDateRange, string> = {
  all: "All time",
  today: "Today",
  "7d": "Last 7 days",
  month: "This month",
  custom: "Custom",
};

interface Props {
  state: CallFilterState;
  actions: ReturnType<typeof useCallFilters>["actions"];
}

export function CallFilters({ state, actions }: Props) {
  const { user } = useAuth();
  const isStaff = !!(user?.is_staff || user?.is_superuser);

  // Search: type locally, push to the URL after the user pauses.
  const [searchText, setSearchText] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchText, 300);
  useEffect(() => {
    if (debouncedSearch.trim() !== state.search) actions.setSearch(debouncedSearch);
    // Only react to the debounced text changing, never to URL changes (see below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  // When the URL changes from outside (Clear filters, back button), mirror it.
  useEffect(() => {
    setSearchText(state.search);
  }, [state.search]);

  // "Logged by" picker, searched on the server.
  const [userSearch, setUserSearch] = useState("");
  const [userLabel, setUserLabel] = useState("");
  const usersQ = useUsers(1, 20, userSearch);
  const userOptions = [
    { value: "all", label: "All callers" },
    ...(usersQ.data?.results ?? []).map((u) => ({ value: String(u.id), label: u.name })),
  ];

  // Branch filter is for staff only; the backend scopes everyone else automatically.
  const branchesQ = useBranches(1, 100, "", isStaff);

  const badRange = state.range === "custom" && state.from && state.to && state.from > state.to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-sm min-w-[13rem] flex-1">
        <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
        <Input
          placeholder="Search lead, phone, caller or notes"
          className="rounded-full pl-9"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <Select
        value={state.direction || "all"}
        onValueChange={(v) => actions.setDirection(v === "all" ? "" : (v as CallDirection))}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Direction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All directions</SelectItem>
          <SelectItem value="outbound">Outbound</SelectItem>
          <SelectItem value="inbound">Inbound</SelectItem>
        </SelectContent>
      </Select>

      <Combobox
        className="w-48"
        value={state.user || "all"}
        options={userOptions}
        placeholder="Logged by"
        searchPlaceholder="Search people"
        selectedLabel={userLabel || (state.user ? `User #${state.user}` : undefined)}
        loading={usersQ.isFetching}
        onSearchChange={setUserSearch}
        onChange={(v) => {
          setUserLabel(userOptions.find((o) => o.value === v)?.label ?? "");
          actions.setUser(v === "all" ? "" : v);
        }}
      />

      {isStaff && (
        <Select
          value={state.branch || "all"}
          onValueChange={(v) => actions.setBranch(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {(branchesQ.data?.results ?? []).map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={state.range} onValueChange={(v) => actions.setRange(v as CallDateRange)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(RANGE_LABELS) as CallDateRange[]).map((r) => (
            <SelectItem key={r} value={r}>
              {RANGE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {state.range === "custom" && (
        <>
          <Input
            type="date"
            aria-label="From date"
            className="w-40"
            value={state.from}
            onChange={(e) => actions.setCustomDate("from", e.target.value)}
          />
          <Input
            type="date"
            aria-label="To date"
            className="w-40"
            value={state.to}
            onChange={(e) => actions.setCustomDate("to", e.target.value)}
          />
        </>
      )}

      <Button variant="outline" onClick={actions.clear}>
        Clear filters
      </Button>
      {badRange && (
        <p className="text-destructive w-full text-xs">The "from" date is after the "to" date.</p>
      )}
    </div>
  );
}