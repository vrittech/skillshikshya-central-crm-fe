/**
 * What the signed-in person may do, as coarse UI capabilities.
 *
 * With live data, each capability follows the user's real Django permissions
 * (see LIVE_PERMS). With mock data, a previewed role decides instead, picked
 * with the role switcher in the header and kept in localStorage.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";

export type MockRole = "admin" | "manager" | "counselor" | "finance" | "readonly";

/** Capabilities the UI checks against. Keep coarse — this is a preview. */
export type Capability =
  | "leads.view.all" // see every lead vs. only assigned
  | "leads.create"
  | "leads.edit"
  | "leads.assign"
  | "leads.merge"
  | "leads.archive"
  | "leads.delete" // move to recycle bin
  | "leads.purge" // delete forever
  | "leads.log_activity"
  | "followups.complete"
  | "leads.import"
  | "enrollment.create"
  | "enrollment.manage"
  | "payment.record"
  | "payment.manage"
  | "money.adjust"
  | "reports.view"
  | "users.manage"
  | "minutes.top_up"
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
  "leads.purge",
  "leads.log_activity",
  "followups.complete",
  "leads.import",
  "enrollment.create",
  "enrollment.manage",
  "payment.record",
  "payment.manage",
  "money.adjust",
  "reports.view",
  "users.manage",
  "minutes.top_up",
  "settings.view",
  "recycle_bin.view",
];

/**
 * Live data: the server permission each capability follows. "staff" means staff
 * only; a list means any one of them. Keep in step with the backend's checks.
 */
const LIVE_PERMS: Record<Capability, string | string[]> = {
  "leads.view.all": "lead.view_lead",
  "leads.create": "lead.add_lead",
  "leads.edit": "lead.change_lead",
  "leads.assign": "lead.change_lead",
  "leads.merge": "lead.change_lead",
  "leads.archive": "lead.change_lead",
  "leads.delete": "lead.delete_lead",
  "leads.purge": "staff",
  "leads.log_activity": ["lead.add_leadcall", "lead.add_followup"],
  "followups.complete": "lead.change_followup",
  "leads.import": "lead.add_lead",
  "enrollment.create": "lead.add_enrollment",
  "enrollment.manage": "lead.change_enrollment",
  "payment.record": "lead.add_payment",
  "payment.manage": "lead.change_payment",
  "money.adjust": "lead.add_adjustment",
  "reports.view": "lead.view_payment",
  "users.manage": "account.change_user",
  "minutes.top_up": "staff",
  "settings.view": "staff",
  "recycle_bin.view": "lead.delete_lead",
};

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
      "followups.complete",
      "leads.import",
      "reports.view",
    ]),
  },
  counselor: {
    role: "counselor",
    label: "Counselor",
    description: "Assigned leads only. Can log calls and add follow-ups.",
    capabilities: new Set<Capability>([
      "leads.create",
      "leads.edit",
      "leads.log_activity",
      "followups.complete",
    ]),
  },
  finance: {
    role: "finance",
    label: "Finance",
    description: "Enrollment and payment access. Limited lead-note access.",
    capabilities: new Set<Capability>([
      "leads.view.all",
      "enrollment.create",
      "enrollment.manage",
      "payment.record",
      "payment.manage",
      "money.adjust",
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
  const { user, hasPerm } = useAuth();
  const { isMock } = useDataSource();

  const setRole = useCallback((next: MockRole) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const def = ROLE_DEFS[role];
  const can = useCallback(
    (cap: Capability) => {
      if (isMock) return def.capabilities.has(cap);
      const need = LIVE_PERMS[cap];
      if (need === "staff") return !!user?.is_staff;
      return (Array.isArray(need) ? need : [need]).some(hasPerm);
    },
    [isMock, def, user, hasPerm],
  );

  const value = useMemo<RoleState>(() => ({ role, def, setRole, can }), [role, def, setRole, can]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
