import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranchScope } from "@/context/branch-scope";

const ALL = "all";

/** Admins only: pick the branch the whole app shows. */
export function BranchSwitcher() {
  const { branchId, branches, canSwitch, setBranchId } = useBranchScope();
  if (!canSwitch) return null;

  return (
    <Select
      value={branchId == null ? ALL : String(branchId)}
      onValueChange={(v) => setBranchId(v === ALL ? null : Number(v))}
    >
      <SelectTrigger className="w-36 justify-start sm:w-48" aria-label="Branch">
        <Building2 className="text-muted-foreground hidden size-4 shrink-0 sm:block" />
        <SelectValue className="flex-1 text-left" placeholder="All branches" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL}>All branches</SelectItem>
        {branches.map((b) => (
          <SelectItem key={b.id} value={String(b.id)}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
