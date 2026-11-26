import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { MOCK_ENABLED } from "@/lib/mock-mode";

/**
 * Chooses where the Leads module reads/writes:
 *   - "api"  → the live backend (default; the rest of the app already needs it)
 *   - "mock" → the in-memory prototype dataset, so the fuller design (multi-course,
 *              custom fields, enrollment, payments) can be previewed offline before
 *              the backend ships those (see docs/lead-additional.md).
 *
 * The choice is part of TanStack Query keys, so flipping it refetches cleanly.
 */

export type DataSource = "api" | "mock";
const STORAGE_KEY = "scc.data.source";

interface DataSourceState {
  source: DataSource;
  isMock: boolean;
  setSource: (s: DataSource) => void;
}

const Ctx = createContext<DataSourceState | null>(null);

function readInitial(): DataSource {
  if (typeof window === "undefined" || !MOCK_ENABLED) return "api";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "mock" ? "mock" : "api";
  } catch {
    return "api";
  }
}

export function DataSourceProvider({ children }: { children: React.ReactNode }) {
  const [source, setSourceState] = useState<DataSource>(readInitial);

  const setSource = useCallback((s: DataSource) => {
    const next = MOCK_ENABLED ? s : "api";
    setSourceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice lasts until reload.
    }
  }, []);

  const value = useMemo<DataSourceState>(
    () => ({ source, isMock: source === "mock", setSource }),
    [source, setSource],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDataSource() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDataSource must be used within DataSourceProvider");
  return ctx;
}
