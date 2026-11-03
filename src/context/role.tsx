/**
 * Mock role/permission context for the static prototype.
 *
 * This is intentionally separate from the real `auth` context: it lets
 * stakeholders preview how navigation, columns, and actions change per role
 * (Administrator / Manager / Counselor / Finance / Read Only) before backend
 * RBAC exists. A dev role switcher in the header drives it. The choice is
 * persisted to localStorage so it survives reloads.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type MockRole = "admin" | "manager" | "counselor" | "finance" | "readonly";

/** Capabilities the UI checks against. Keep coarse — this is a preview. */
export type Capability =
  | "leads.view.all" // see every lead vs. only assigned
  | "leads.create"
  | "leads.edit"
  | "leads.assign"
  | "leads.merge"
  | "leads.archive"
  | "leads.delete" // permanent delete
  | "leads.log_activity"
  | "leads.import"
  | "enrollment.manage"
  | "payment.manage"
  | "reports.view"
  | "users.manage"
  | "settings.view"
  | "recycle_bin.view";

export interface RoleDef {
  role: MockRole;
  label: string;
  description: string;
  capabilities: Set<Capability>;
}

const ALL: Capability[] = [
  "leads.view.all",
  "leads.create",
  "leads.edit",
  "leads.assign",
  "leads.merge",
  "leads.archive",
  "leads.delete",
  "leads.log_activity",
  "leads.import",
  "enrollment.manage",
  "payment.manage",
  "reports.view",
  "users.manage",
  "settings.view",
  "recycle_bin.view",
];

// oxlint-disable-next-line react/only-export-components -- role metadata is also used by the role switcher.
export const ROLE_DEFS: Record<MockRole, RoleDef> = {
  admin: {
    role: "admin",
    label: "Administrator",
    description: "Full access — settings, users, imports, recycle bin, permanent delete.",
    capabilities: new Set(ALL),
  },
  manager: {
    role: "manager",
    label: "Manager",
    description: "All team leads. Can assign, merge, archive, and view reports.",
    capabilities: new Set<Capability>([
      "leads.view.all",
      "leads.create",
      "leads.edit",
      "leads.assign",
      "leads.merge",
      "leads.archive",
      "leads.log_activity",
      "leads.import",
      "reports.view",
    ]),
  },
  counselor: {
    role: "counselor",
    label: "Counselor",
    description: "Assigned leads only. Can log calls and add follow-ups.",
    capabilities: new Set<Capability>(["leads.create", "leads.edit", "leads.log_activity"]),
  },
  finance: {
    role: "finance",
    label: "Finance",
    description: "Enrollment and payment access. Limited lead-note access.",
    capabilities: new Set<Capability>([
      "leads.view.all",
      "enrollment.manage",
      "payment.manage",
      "reports.view",
    ]),
  },
  readonly: {
    role: "readonly",
    label: "Read Only",
    description: "View-only access to leads and reports.",
    capabilities: new Set<Capability>(["leads.view.all", "reports.view"]),
  },
};

const STORAGE_KEY = "scc.mock.role";

interface RoleState {
  role: MockRole;
  def: RoleDef;
  setRole: (role: MockRole) => void;
  can: (cap: Capability) => boolean;
}

const RoleContext = createContext<RoleState | null>(null);

function readInitial(): MockRole {
  if (typeof window === "undefined") return "manager";
  const stored = window.localStorage.getItem(STORAGE_KEY) as MockRole | null;
  return stored && stored in ROLE_DEFS ? stored : "manager";
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<MockRole>(readInitial);

  const setRole = useCallback((next: MockRole) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const def = ROLE_DEFS[role];
  const can = useCallback((cap: Capability) => def.capabilities.has(cap), [def]);

  const value = useMemo<RoleState>(() => ({ role, def, setRole, can }), [role, def, setRole, can]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components -- keep this hook next to its context provider.
export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
