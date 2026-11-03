import axios, { AxiosError, type AxiosRequestConfig } from "axios";

// Auth uses httpOnly cookies set by the backend; the browser attaches them
// automatically. In dev, Vite proxies /api to the Django server; in Docker,
// nginx does the same — so requests are always same-origin.
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken() {
  refreshPromise ??= axios
    .post("/api/auth/refresh/", {}, { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
  const url = original?.url ?? "";
  const isAuthEndpoint = url.includes("/auth/");

  if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
    try {
      await refreshAccessToken();
      original._retried = true;
      return api.request(original);
    } catch {
      window.dispatchEvent(new Event("auth:logout"));
    }
  }
  return Promise.reject(error);
});

const FIELD_LABELS: Record<string, string> = {
  non_field_errors: "Error",
  detail: "",
  message: "",
  error: "",
};

const USER_FRIENDLY_PATTERNS: [RegExp, string][] = [
  [/user with this email already exists/i, "This email is already in use"],
  [/user with this username already exists/i, "This username is already taken"],
  [/user with this phone number already exists/i, "A user with this phone number already exists"],
  [/a user with this email already exists/i, "This email is already registered"],
  [/null value in column/i, "This field cannot be empty"],
  [/not null constraint/i, "This field is required"],
  [/unique constraint/i, "A record with these details already exists"],
  [/duplicate key/i, "A record with these details already exists"],
  [/does not exist/i, "The requested resource was not found"],
  [/permission denied/i, "You don't have permission to do this"],
  [/invalid password/i, "The password is incorrect"],
  [/token expired/i, "Your session has expired"],
];

function formatFieldName(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, " ");
}

function cleanMessage(text: string): string {
  const trimmed = text.trim();
  for (const [pattern, replacement] of USER_FRIENDLY_PATTERNS) {
    if (pattern.test(trimmed)) return replacement;
  }
  return trimmed;
}

/** Extract a human-readable message from a DRF error response. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (typeof data === "string") {
      return cleanMessage(data);
    }
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      for (const key of ["detail", "message", "error"]) {
        if (typeof d[key] === "string") {
          const cleaned = cleanMessage(d[key] as string);
          if (cleaned !== d[key]) return cleaned;
          return cleaned;
        }
      }
      const parts: string[] = [];
      for (const [field, value] of Object.entries(d)) {
        const text = Array.isArray(value) ? (value as string[]).join(" ") : String(value);
        const cleaned = cleanMessage(text);
        if (field === "non_field_errors") {
          parts.push(cleaned);
        } else {
          const label = formatFieldName(field);
          parts.push(cleaned !== text ? cleaned : `${label}: ${cleaned}`);
        }
      }
      if (parts.length) return parts.join(" · ");
    }
    if (error.message) {
      const cleaned = cleanMessage(error.message);
      if (cleaned !== error.message) return cleaned;
    }
    if (status === 401) return "Session expired — please log in again";
    if (status === 403) return "You don't have permission to perform this action";
    if (status === 404) return "The requested resource was not found";
    if (status === 409) return "A conflict occurred — please try again";
    if (status && status >= 500) return "Something went wrong on our end — please try again later";
  }
  return fallback;
}
