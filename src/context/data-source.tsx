import { createContext, useCallback, useContext, useMemo, useState } from "react";

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
  if (typeof window === "undefined") return "api";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "mock" ? "mock" : "api";
}

export function DataSourceProvider({ children }: { children: React.ReactNode }) {
  const [source, setSourceState] = useState<DataSource>(readInitial);

  const setSource = useCallback((s: DataSource) => {
    setSourceState(s);
    window.localStorage.setItem(STORAGE_KEY, s);
  }, []);

  const value = useMemo<DataSourceState>(
    () => ({ source, isMock: source === "mock", setSource }),
    [source, setSource],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// oxlint-disable-next-line react/only-export-components -- keep this hook next to its context provider.
export function useDataSource() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDataSource must be used within DataSourceProvider");
  return ctx;
}
