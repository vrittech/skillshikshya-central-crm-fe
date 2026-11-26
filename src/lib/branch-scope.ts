import type { InternalAxiosRequestConfig } from "axios";

/**
 * The branch an admin is looking at, or null for every branch.
 *
 * Set by BranchScopeProvider (admins only) and read by the API client,
 * which adds `branch_id` to list and report requests. The backend shows an
 * admin who picks a branch exactly what that branch's users see.
 */
let scopedBranch: number | null = null;

export function setScopedBranch(id: number | null) {
  scopedBranch = id;
}

export function getScopedBranch() {
  return scopedBranch;
}

/** Lists that are the same for every branch, or that must not be narrowed. */
const NEVER_SCOPED = [
  "/auth/",
  "/branches/",
  "/groups/",
  "/permissions/",
  "/notifications/",
  "/settings/",
  "/users/me/",
  "/orbitchat/",
  "/upload/",
  "/invoices/email-config/",
  "/leads/import-template/",
  // Finding a phone number already in use looks at every branch.
  "/leads/phone-match/",
];

/**
 * Add the picked branch to a GET of a list or report. One record
 * (`/leads/12/`) and anything under it stay as they are, and a request
 * that names its own branch keeps it.
 */
export function withScopedBranch(config: InternalAxiosRequestConfig) {
  const branch = scopedBranch;
  if (branch == null) return config;
  if ((config.method ?? "get").toLowerCase() !== "get") return config;

  const url = config.url ?? "";
  const [path, query = ""] = url.split("?");
  if (/(^|\/)\d+(\/|$)/.test(path)) return config;
  if (NEVER_SCOPED.some((p) => path.startsWith(p))) return config;
  if (/(^|&)branch_id=/.test(query)) return config;

  const params = config.params;
  if (params instanceof URLSearchParams) {
    if (!params.has("branch_id")) params.set("branch_id", String(branch));
    return config;
  }
  if (params && typeof params === "object" && "branch_id" in params && params.branch_id !== undefined) {
    return config;
  }
  config.params = { ...(params ?? {}), branch_id: branch };
  return config;
}
