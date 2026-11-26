/**
 * What the signed-in person may do, as coarse UI capabilities. Each capability
 * follows the user's real Django permissions (see LIVE_PERMS).
 */

import { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth } from "@/context/auth";

/** Capabilities the UI checks against. */
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

/**
 * The server permission each capability follows. "staff" means staff
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

interface RoleState {
  can: (cap: Capability) => boolean;
}

const RoleContext = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user, hasPerm } = useAuth();

  const can = useCallback(
    (cap: Capability) => {
      const need = LIVE_PERMS[cap];
      if (need === "staff") return !!user?.is_staff;
      return (Array.isArray(need) ? need : [need]).some(hasPerm);
    },
    [user, hasPerm],
  );

  const value = useMemo<RoleState>(() => ({ can }), [can]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
