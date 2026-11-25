import axios from "axios";

/** Shown in a password box when a secret is already saved; blank keeps it. */
export const SECRET_PLACEHOLDER = "••••••••";

/** DRF field errors ({field: ["message"]}) as {field: "message"}. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const data = error.response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key === "detail") continue;
    out[key] = Array.isArray(value) ? String(value[0]) : String(value);
  }
  return out;
}
