/**
 * The branch an admin is looking at. Admins pick one in the top bar (or
 * "All branches"); every list, report and new record then follows it.
 * Everyone else is kept to their own branch by the backend, so for them
 * this is always null.
 */

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { setScopedBranch } from "@/lib/branch-scope";
import type { ApiBranch } from "@/types/leads-api";

interface BranchScope {
  /** The admin's picked branch id, or null for every branch (and for non-admins). */
  branchId: number | null;
  branch: ApiBranch | null;
  /** Active branches an admin can pick from. */
  branches: ApiBranch[];
  canSwitch: boolean;
  setBranchId: (id: number | null) => void;
}

const BranchScopeContext = createContext<BranchScope | null>(null);

const storageKey = (userId: number) => `scc.branch-scope.${userId}`;

function readStored(userId: number): number | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function writeStored(userId: number, id: number | null) {
  try {
    if (id == null) localStorage.removeItem(storageKey(userId));
    else localStorage.setItem(storageKey(userId), String(id));
  } catch {
    // Storage blocked: the pick lasts until reload.
  }
}

export function BranchScopeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const canSwitch = !!user?.is_staff;

  // Each admin keeps their own pick; a new sign-in reads it back.
  const [state, setState] = useState<{ userId: number | null; branch: number | null }>({
    userId: null,
    branch: null,
  });
  let picked = state.branch;
  if (state.userId !== userId) {
    picked = canSwitch && userId != null ? readStored(userId) : null;
    setState({ userId, branch: picked });
  }
  const branchId = canSwitch ? picked : null;
  // Set while rendering, so the first requests of the pages below carry it.
  setScopedBranch(branchId);

  const branchesQ = useBranches(1, 100, "", canSwitch);
  const branches = useMemo(
    () => (branchesQ.data?.results ?? []).filter((b) => b.is_active),
    [branchesQ.data],
  );

  const setBranchId = useCallback(
    (id: number | null) => {
      if (userId == null) return;
      setScopedBranch(id);
      writeStored(userId, id);
      setState({ userId, branch: id });
      // Lists loaded for the other branch go; the ones on screen load again.
      void queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== "branches" });
    },
    [userId, queryClient],
  );

  // A picked branch that was closed or removed falls back to every branch.
  const loaded = branchesQ.isSuccess && !branchesQ.isPlaceholderData;
  useEffect(() => {
    if (loaded && branchId != null && !branches.some((b) => b.id === branchId)) setBranchId(null);
  }, [loaded, branchId, branches, setBranchId]);

  const value = useMemo<BranchScope>(
    () => ({
      branchId,
      branch: branches.find((b) => b.id === branchId) ?? null,
      branches,
      canSwitch,
      setBranchId,
    }),
    [branchId, branches, canSwitch, setBranchId],
  );

  return <BranchScopeContext.Provider value={value}>{children}</BranchScopeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBranchScope() {
  const ctx = useContext(BranchScopeContext);
  if (!ctx) throw new Error("useBranchScope must be used inside BranchScopeProvider");
  return ctx;
}
