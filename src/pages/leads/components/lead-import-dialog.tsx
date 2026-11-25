import axios from "axios";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import { useImportLeads, useLeadImportPreview } from "@/hooks/use-leads";
import { useCounselors } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api";
import { saveCsv } from "@/lib/download";
import { cn } from "@/lib/utils";
import { leadsService } from "@/services/leads.service";
import type {
  ApiLeadFileType,
  ApiLeadImportOptions,
  ApiLeadImportPreview,
  ApiLeadImportResult,
  ApiLeadImportRow,
} from "@/types/leads-api";
import type { FilterOption, LeadFilterOptions } from "./lead-filters";

type Step = "file" | "review" | "done";
type RowFilter = "all" | ApiLeadImportRow["status"];
type DefaultKey = "lead_type" | "source" | "status" | "priority" | "course" | "branch" | "counselor";

const NONE = "none";
const EMPTY: Record<DefaultKey, string> = {
  lead_type: NONE,
  source: NONE,
  status: NONE,
  priority: NONE,
  course: NONE,
  branch: NONE,
  counselor: NONE,
};
const MAX_SHOWN = 300;
const MAX_BYTES = 5 * 1024 * 1024;

const ROW_TONE: Record<string, string> = {
  ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  created: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  duplicate: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  skipped: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  error: "bg-destructive/10 text-destructive",
  failed: "bg-destructive/10 text-destructive",
};
const ROW_LABEL: Record<string, string> = {
  ready: "Ready",
  duplicate: "Duplicate",
  error: "Error",
  created: "Imported",
  skipped: "Skipped",
  failed: "Failed",
};

function Pill({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", ROW_TONE[status])}>
      {ROW_LABEL[status] ?? status}
    </span>
  );
}

/** What the backend said is wrong with the file, else a general message. */
function importError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const file = (error.response?.data as { file?: string[] } | undefined)?.file;
    if (file?.length) return file[0];
  }
  return apiErrorMessage(error, fallback);
}

/** The duplicate's reason in one line. */
function duplicateText(r: ApiLeadImportRow) {
  if (r.matches.length) {
    const m = r.matches[0];
    const more = r.matches.length > 1 ? ` and ${r.matches.length - 1} more` : "";
    return `Phone is already on ${m.reference_number} (${m.full_name}${m.branch_name ? `, ${m.branch_name}` : ""})${more}.`;
  }
  return r.same_as_row ? `Same phone as row ${r.same_as_row}.` : "";
}

function rowMessages(r: ApiLeadImportRow) {
  return [...r.errors, ...(r.status === "duplicate" ? [duplicateText(r)] : []), ...r.warnings];
}

function DefaultSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>—</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        "min-w-0 rounded-xl border px-3 py-2.5 text-left transition-colors",
        onClick && "hover:bg-muted/50 cursor-pointer",
        active && "border-brand/40 bg-brand/5 ring-brand/20 ring-1",
      )}
    >
      <p className="text-muted-foreground truncate text-xs">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", tone)}>{value.toLocaleString()}</p>
    </button>
  );
}

/**
 * Import leads from a CSV or Excel file: pick the file and defaults, review
 * what each row will do, then import. Nothing is saved until Import.
 */
export function LeadImportDialog({
  open,
  onClose,
  options,
}: {
  open: boolean;
  onClose: () => void;
  options: LeadFilterOptions;
}) {
  const { user } = useAuth();
  const walled = !!user && !user.is_staff && !user.is_superuser && user.branch != null;
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [defaults, setDefaults] = useState(EMPTY);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ApiLeadImportPreview | null>(null);
  const [filter, setFilter] = useState<RowFilter>("all");
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [result, setResult] = useState<ApiLeadImportResult | null>(null);
  const [templateBusy, setTemplateBusy] = useState<ApiLeadFileType | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const check = useLeadImportPreview();
  const save = useImportLeads();

  const branchId = defaults.branch !== NONE ? Number(defaults.branch) : walled ? (user?.branch ?? undefined) : undefined;
  const branchesQ = useBranches(1, 100, "", open && !walled);
  const counselorsQ = useCounselors("", branchId, open);
  const branchOptions = (branchesQ.data?.results ?? []).map((b) => ({ value: String(b.id), label: b.name }));
  const counselorOptions = (counselorsQ.data?.results ?? []).map((u) => ({
    value: String(u.id),
    label: u.name || u.email,
  }));

  useEffect(() => {
    if (!open) return;
    setStep("file");
    setFile(null);
    setDefaults(EMPTY);
    setFileError(null);
    setPreview(null);
    setResult(null);
    setFilter("all");
    setIncludeDuplicates(false);
  }, [open]);

  const setDefault = (key: DefaultKey) => (v: string) =>
    setDefaults((d) => ({ ...d, [key]: v, ...(key === "branch" ? { counselor: NONE } : {}) }));

  function pick(next: File | null | undefined) {
    setFileError(null);
    if (!next) return;
    const name = next.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) {
      setFileError("Upload a .csv or .xlsx file.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setFileError("The file is larger than 5 MB. Split it into smaller files.");
      return;
    }
    setFile(next);
  }

  function body(): ApiLeadImportOptions {
    const id = (k: DefaultKey) => (defaults[k] !== NONE ? Number(defaults[k]) : undefined);
    return {
      file: file as File,
      duplicates: includeDuplicates ? "import" : "skip",
      default_lead_type: id("lead_type"),
      default_source: id("source"),
      default_status: id("status"),
      default_priority: id("priority"),
      default_course: id("course"),
      default_branch: walled ? undefined : id("branch"),
      default_counselor: id("counselor"),
    };
  }

  function runCheck() {
    if (!file) return;
    setFileError(null);
    check.mutate(body(), {
      onSuccess: (p) => {
        setPreview(p);
        setFilter(p.errors > 0 ? "error" : "all");
        setIncludeDuplicates(false);
        setStep("review");
      },
      onError: (e) => setFileError(importError(e, "The file could not be checked.")),
    });
  }

  function runImport() {
    save.mutate(body(), {
      onSuccess: (r) => {
        setResult(r);
        setStep("done");
        if (r.created) toast.success(`${r.created} lead${r.created === 1 ? "" : "s"} imported`);
      },
      onError: (e) => toast.error(importError(e, "The import failed.")),
    });
  }

  async function downloadTemplate(type: ApiLeadFileType) {
    setTemplateBusy(type);
    try {
      await leadsService.importTemplate(type);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not download the template"));
    } finally {
      setTemplateBusy(null);
    }
  }

  function downloadProblems() {
    if (!preview) return;
    const rows = preview.rows.filter((r) => r.status !== "ready");
    saveCsv(
      [
        ["Row", "Full name", "Phone", "Email", "Result", "Problem"],
        ...rows.map((r) => [r.row, r.full_name, r.phone, r.email, ROW_LABEL[r.status], rowMessages(r).join(" ")]),
      ],
      `import-problems-${preview.file_name.replace(/\.[^.]+$/, "")}.csv`,
    );
  }

  function downloadReport() {
    if (!result) return;
    saveCsv(
      [
        ["Row", "Full name", "Result", "Reference", "Message"],
        ...result.rows.map((r) => [r.row, r.full_name, ROW_LABEL[r.status], r.reference_number ?? "", r.message ?? ""]),
      ],
      `import-report-${result.file_name.replace(/\.[^.]+$/, "")}.csv`,
    );
  }

  const shownRows = (preview?.rows ?? []).filter((r) => filter === "all" || r.status === filter);
  const toImport = preview ? preview.ready + (includeDuplicates ? preview.duplicates : 0) : 0;
  const notImported = (result?.rows ?? []).filter((r) => r.status !== "created");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", step === "file" ? "sm:max-w-xl" : "sm:max-w-4xl")}>
        {step === "file" && (
          <>
            <DialogHeader>
              <DialogTitle>Import leads</DialogTitle>
            </DialogHeader>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "rounded-xl border border-dashed p-5 text-center transition-colors",
                dragging ? "border-brand bg-brand/5" : "border-border",
                fileError && "border-destructive/50",
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {file ? (
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileSpreadsheet className="text-brand size-8 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" aria-label="Remove file" onClick={() => setFile(null)}>
                    <X />
                  </Button>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className="text-muted-foreground mx-auto size-8" />
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>
                    <Upload /> Choose file
                  </Button>
                  <p className="text-muted-foreground mt-2 text-xs">CSV or XLSX · max 5 MB</p>
                </>
              )}
            </div>
            {fileError && <p className="text-destructive -mt-2 text-sm">{fileError}</p>}

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Template</span>
              <Button size="sm" variant="ghost" disabled={templateBusy != null} onClick={() => void downloadTemplate("csv")}>
                <Download /> CSV
              </Button>
              <Button size="sm" variant="ghost" disabled={templateBusy != null} onClick={() => void downloadTemplate("xlsx")}>
                <Download /> Excel
              </Button>
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Defaults</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <DefaultSelect id="imp-type" label="Lead type" value={defaults.lead_type} onChange={setDefault("lead_type")} options={options.types} />
                <DefaultSelect id="imp-source" label="Source" value={defaults.source} onChange={setDefault("source")} options={options.sources} />
                <DefaultSelect id="imp-status" label="Status" value={defaults.status} onChange={setDefault("status")} options={options.statuses} />
                <DefaultSelect id="imp-priority" label="Priority" value={defaults.priority} onChange={setDefault("priority")} options={options.priorities} />
                <DefaultSelect id="imp-course" label="Course" value={defaults.course} onChange={setDefault("course")} options={options.courses} />
                {!walled && (
                  <DefaultSelect id="imp-branch" label="Branch" value={defaults.branch} onChange={setDefault("branch")} options={branchOptions} />
                )}
                <DefaultSelect id="imp-counselor" label="Counselor" value={defaults.counselor} onChange={setDefault("counselor")} options={counselorOptions} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="brand" disabled={!file || check.isPending} onClick={runCheck}>
                {check.isPending ? "Checking…" : "Check file"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "review" && preview && (
          <>
            <DialogHeader>
              <DialogTitle>Review import</DialogTitle>
              <DialogDescription>
                {preview.file_name} · {preview.total.toLocaleString()} row{preview.total === 1 ? "" : "s"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="All" value={preview.total} active={filter === "all"} onClick={() => setFilter("all")} />
              <Stat label="Ready" value={preview.ready} tone="text-emerald-600 dark:text-emerald-400" active={filter === "ready"} onClick={() => setFilter("ready")} />
              <Stat label="Duplicates" value={preview.duplicates} tone="text-amber-600 dark:text-amber-400" active={filter === "duplicate"} onClick={() => setFilter("duplicate")} />
              <Stat label="Errors" value={preview.errors} tone="text-destructive" active={filter === "error"} onClick={() => setFilter("error")} />
            </div>

            <div className="space-y-1 text-xs">
              <p>
                <span className="text-muted-foreground">Columns </span>
                {preview.columns.map((c) => c.column).join(", ")}
              </p>
              {preview.ignored.length > 0 && (
                <p className="text-muted-foreground">Ignored {preview.ignored.join(", ")}</p>
              )}
            </div>

            <div className="max-h-[45vh] overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 text-left text-xs">
                  <tr className="text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell">Course</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell">Counselor</th>
                    <th className="px-3 py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shownRows.slice(0, MAX_SHOWN).map((r) => {
                    const messages = rowMessages(r);
                    return (
                      <tr key={r.row} className="align-top">
                        <td className="text-muted-foreground px-3 py-2 tabular-nums">{r.row}</td>
                        <td className="max-w-[12rem] truncate px-3 py-2 font-medium">{r.full_name || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.phone || "—"}</td>
                        <td className="hidden max-w-[10rem] truncate px-3 py-2 md:table-cell">{r.course || "—"}</td>
                        <td className="hidden max-w-[10rem] truncate px-3 py-2 md:table-cell">{r.counselor || "—"}</td>
                        <td className="min-w-[14rem] px-3 py-2">
                          <Pill status={r.status} />
                          {messages.map((m, i) => (
                            <p
                              key={i}
                              className={cn(
                                "mt-1 text-xs",
                                i < r.errors.length ? "text-destructive" : "text-muted-foreground",
                              )}
                            >
                              {m}
                            </p>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                  {shownRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-muted-foreground px-3 py-6 text-center">
                        No rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {shownRows.length > MAX_SHOWN && (
              <p className="text-muted-foreground -mt-2 text-xs">
                {MAX_SHOWN} of {shownRows.length.toLocaleString()} shown
              </p>
            )}

            {preview.duplicates > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={includeDuplicates} onCheckedChange={(v) => setIncludeDuplicates(v === true)} />
                Import duplicates too
              </label>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" disabled={save.isPending} onClick={() => setStep("file")}>
                Back
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {preview.errors + preview.duplicates > 0 && (
                  <Button variant="outline" onClick={downloadProblems}>
                    <Download /> Download problems
                  </Button>
                )}
                <Button variant="brand" disabled={toImport === 0 || save.isPending} onClick={runImport}>
                  {save.isPending
                    ? "Importing…"
                    : `Import ${toImport.toLocaleString()} lead${toImport === 1 ? "" : "s"}`}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}

        {step === "done" && result && (
          <>
            <DialogHeader>
              <DialogTitle>Import finished</DialogTitle>
              <DialogDescription>{result.file_name}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Imported" value={result.created} tone="text-emerald-600 dark:text-emerald-400" />
              <Stat label="Skipped" value={result.skipped} tone="text-amber-600 dark:text-amber-400" />
              <Stat label="Failed" value={result.failed} tone="text-destructive" />
            </div>
            {notImported.length > 0 && (
              <div className="max-h-[40vh] overflow-auto rounded-xl border">
                <ul className="divide-y text-sm">
                  {notImported.slice(0, MAX_SHOWN).map((r) => (
                    <li key={r.row} className="flex items-start justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          <span className="text-muted-foreground mr-2 font-normal tabular-nums">Row {r.row}</span>
                          {r.full_name || "—"}
                        </p>
                        {r.message && <p className="text-muted-foreground mt-0.5 text-xs">{r.message}</p>}
                      </div>
                      <Pill status={r.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={downloadReport}>
                <Download /> Download report
              </Button>
              <Button variant="brand" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
