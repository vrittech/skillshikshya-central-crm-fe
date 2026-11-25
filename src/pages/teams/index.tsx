import {
  ArchiveRestore,
  Ban,
  ChevronLeft,
  ChevronRight,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";
import { useBranches } from "@/hooks/use-branches";
import {
  useAddTeamsAccounts,
  useRestoreTeamsAccount,
  useRetireTeamsAccount,
  useTeamsAccounts,
  useTeamsLicences,
  useTeamsSummary,
} from "@/hooks/use-teams";
import { formatDate } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { ApiTeamsAccount, ApiTeamsState } from "@/types/leads-api";
import {
  FreeLicenceDialog,
  SendTeamsDetailsDialog,
  TeamsStateBadge,
} from "../leads/components/teams-licence";

type Tab = "all" | ApiTeamsState | "taken_back";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready to give" },
  { value: "in_use", label: "In use" },
  { value: "safe_to_remove", label: "Safe to remove" },
  { value: "action_required", label: "Action required" },
  { value: "retired", label: "Retired" },
  { value: "taken_back", label: "Taken back" },
];

const PAGE_SIZE = 20;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Kpi({
  label,
  value,
  loading,
  active,
  tone,
  onClick,
}: {
  label: string;
  value: number | string;
  loading: boolean;
  active: boolean;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card
        className={cn(
          "hover:border-foreground/20 gap-2 py-5 transition-colors",
          active && "border-brand ring-brand/20 ring-2",
        )}
      >
        <CardHeader>
          <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
            {label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className={cn("font-headline text-2xl font-semibold tabular-nums", tone)}>
              {value}
            </p>
          )}
        </CardContent>
      </Card>
    </button>
  );
}

function parseEmails(text: string) {
  const all = text
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(all)];
  return { valid: unique.filter((e) => EMAIL.test(e)), invalid: unique.filter((e) => !EMAIL.test(e)) };
}

function AddAccountsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const isStaff = !!user && (user.is_staff || user.is_superuser);
  const [text, setText] = useState("");
  const [branch, setBranch] = useState("shared");
  const branches = useBranches(1, 100, "", open && isStaff);
  const add = useAddTeamsAccounts();
  const { valid, invalid } = parseEmails(text);

  useEffect(() => {
    if (open) {
      setText("");
      setBranch("shared");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Teams accounts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="teams-emails" required>
              Teams emails
            </Label>
            <Textarea
              id="teams-emails"
              rows={6}
              className="font-mono text-sm"
              placeholder={"student1@skillshikshya.com\nstudent2@skillshikshya.com"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              {valid.length} email{valid.length === 1 ? "" : "s"}
              {invalid.length > 0 && (
                <span className="text-destructive"> · Not an email: {invalid.join(", ")}</span>
              )}
            </p>
          </div>
          {isStaff && (
            <div className="grid gap-2">
              <Label htmlFor="teams-branch">Branch</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger id="teams-branch" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">All branches</SelectItem>
                  {(branches.data?.results ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            variant="brand"
            disabled={valid.length === 0 || invalid.length > 0 || add.isPending}
            onClick={() =>
              add.mutate(
                { emails: valid, branch: branch === "shared" ? null : Number(branch) },
                { onSuccess: onClose },
              )
            }
          >
            {add.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudentCell({ row }: { row: ApiTeamsAccount }) {
  const l = row.licence;
  if (!l) return <span className="text-muted-foreground">—</span>;
  if (l.other_branch) return <span className="text-muted-foreground">Another branch</span>;
  return (
    <>
      <Link to={`/leads/${l.lead}`} className="font-semibold hover:underline">
        {l.name}
      </Link>
      {l.student_id && <span className="text-muted-foreground ml-1.5 text-xs">{l.student_id}</span>}
      <p className="text-muted-foreground text-xs">
        <Link to={`/enrollments/${l.enrollment}`} className="hover:underline">
          {l.course_name}
        </Link>
        {l.batch_name ? ` · ${l.batch_name}` : ""}
      </p>
    </>
  );
}

function AccountsTable({
  rows,
  loading,
  onSend,
  onTakeBack,
  onRetire,
}: {
  rows: ApiTeamsAccount[];
  loading: boolean;
  onSend: (row: ApiTeamsAccount) => void;
  onTakeBack: (row: ApiTeamsAccount) => void;
  onRetire: (row: ApiTeamsAccount) => void;
}) {
  const { hasPerm } = useAuth();
  const restore = useRestoreTeamsAccount();
  const canGive = hasPerm("lead.add_teamslicence");
  const canFree = hasPerm("lead.change_teamslicence");
  const canChangeAccount = hasPerm("lead.change_teamsaccount");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Teams account</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Student</TableHead>
          <TableHead>Given</TableHead>
          <TableHead>Details sent</TableHead>
          <TableHead className="w-12 pr-6" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={6} className="pl-6">
                <Skeleton className="h-5 w-full" />
              </TableCell>
            </TableRow>
          ))}
        {!loading && rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
              No accounts.
            </TableCell>
          </TableRow>
        )}
        {!loading &&
          rows.map((r) => {
            const l = r.licence;
            const mine = l && !l.other_branch;
            const actions = [
              mine && canGive && { key: "send", label: "Send details", icon: Mail, run: () => onSend(r) },
              mine && canFree && { key: "back", label: "Take back", icon: Undo2, run: () => onTakeBack(r) },
              r.state === "ready" &&
                canChangeAccount && { key: "retire", label: "Retire", icon: Ban, run: () => onRetire(r), danger: true },
              r.state === "retired" &&
                canChangeAccount && {
                  key: "restore",
                  label: "Restore",
                  icon: ArchiveRestore,
                  run: () => restore.mutate(r.id),
                },
            ].filter(Boolean) as {
              key: string;
              label: string;
              icon: typeof Mail;
              run: () => void;
              danger?: boolean;
            }[];
            return (
              <TableRow key={r.id} className={cn(r.state === "retired" && "opacity-60")}>
                <TableCell className="pl-6">
                  <p className="font-mono text-sm">{r.email}</p>
                  <p className="text-muted-foreground text-xs">{r.branch_name ?? "All branches"}</p>
                </TableCell>
                <TableCell>
                  <TeamsStateBadge state={r.state} label={r.state_label} reason={r.reason} />
                  {r.state === "retired" && r.reason && (
                    <p className="text-muted-foreground mt-1 text-xs">{r.reason}</p>
                  )}
                </TableCell>
                <TableCell>
                  <StudentCell row={r} />
                </TableCell>
                <TableCell>
                  {mine ? (
                    <>
                      <p>{formatDate(l.assigned_at)}</p>
                      <p className="text-muted-foreground text-xs">{l.assigned_by_name}</p>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {mine && l.details_sent_at ? (
                    <>
                      <p>{formatDate(l.details_sent_at)}</p>
                      <p className="text-muted-foreground text-xs">{l.details_sent_to}</p>
                    </>
                  ) : mine ? (
                    <span className="text-muted-foreground text-xs">Not sent</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  {actions.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((a) => (
                          <DropdownMenuItem
                            key={a.key}
                            onSelect={a.run}
                            className={cn(a.danger && "text-destructive focus:text-destructive")}
                          >
                            <a.icon className="size-4" /> {a.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
}

function TakenBackTable({ search, branchId }: { search: string; branchId?: number }) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [search, branchId]);
  const { data, isLoading } = useTeamsLicences({
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    open: false,
    branch_id: branchId,
  });
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Teams account</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Given</TableHead>
            <TableHead>Taken back</TableHead>
            <TableHead className="pr-6">Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5} className="pl-6">
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                No licences.
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-6 font-mono text-sm">{r.account}</TableCell>
                <TableCell>
                  <Link to={`/leads/${r.lead}`} className="font-semibold hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {r.course_name}
                    {r.batch_name ? ` · ${r.batch_name}` : ""}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{formatDate(r.assigned_at)}</p>
                  <p className="text-muted-foreground text-xs">{r.assigned_by_name}</p>
                </TableCell>
                <TableCell>
                  <p>{formatDate(r.released_at ?? undefined)}</p>
                  <p className="text-muted-foreground text-xs">{r.released_by_name}</p>
                </TableCell>
                <TableCell className="pr-6 text-sm">{r.release_reason}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {count > PAGE_SIZE && (
        <div className="bg-muted/50 flex items-center justify-between border-t px-6 py-3">
          <span className="text-muted-foreground text-sm">
            Showing {rows.length} of {count}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft />
            </Button>
            <span className="text-muted-foreground text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default function TeamsPage() {
  const { source } = useDataSource();
  const isApi = source === "api";
  const { user, hasPerm } = useAuth();
  const isStaff = !!user && (user.is_staff || user.is_superuser);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [branch, setBranch] = useState("all");
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState<{ id: number; account: string } | null>(null);
  const [takingBack, setTakingBack] = useState<{ id: number; account: string } | null>(null);
  const [retiring, setRetiring] = useState<ApiTeamsAccount | null>(null);
  const retire = useRetireTeamsAccount();
  const branches = useBranches(1, 100, "", isApi && isStaff);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const branchId = branch === "all" ? undefined : Number(branch);
  const summary = useTeamsSummary({ branch_id: branchId }, isApi);
  const accounts = useTeamsAccounts(
    {
      branch_id: branchId,
      search: debounced || undefined,
      state: tab === "all" || tab === "taken_back" ? undefined : tab,
    },
    isApi && tab !== "taken_back",
  );
  const rows = useMemo(() => accounts.data ?? [], [accounts.data]);
  const s = summary.data;

  const licenceOf = (r: ApiTeamsAccount) => (r.licence ? { id: r.licence.id, account: r.email } : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            Institute
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Teams licences
          </h1>
        </div>
        {isApi && hasPerm("lead.add_teamsaccount") && (
          <Button variant="brand" onClick={() => setAdding(true)}>
            <Plus />
            Add accounts
          </Button>
        )}
      </div>

      {!isApi ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed py-16 text-center text-sm">
          Switch to Live data to see Teams licences.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi
              label="Total"
              value={s?.total ?? 0}
              loading={summary.isLoading}
              active={tab === "all"}
              onClick={() => setTab("all")}
            />
            <Kpi
              label="Ready to give"
              value={s?.ready ?? 0}
              loading={summary.isLoading}
              active={tab === "ready"}
              onClick={() => setTab("ready")}
            />
            <Kpi
              label="In use"
              value={s?.in_use ?? 0}
              loading={summary.isLoading}
              active={tab === "in_use"}
              onClick={() => setTab("in_use")}
            />
            <Kpi
              label="Safe to remove"
              value={s?.safe_to_remove ?? 0}
              loading={summary.isLoading}
              active={tab === "safe_to_remove"}
              tone={s?.safe_to_remove ? "text-sky-700 dark:text-sky-300" : undefined}
              onClick={() => setTab("safe_to_remove")}
            />
            <Kpi
              label="Action required"
              value={s?.action_required ?? 0}
              loading={summary.isLoading}
              active={tab === "action_required"}
              tone={s?.action_required ? "text-amber-700 dark:text-amber-400" : undefined}
              onClick={() => setTab("action_required")}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList className="h-auto flex-wrap">
                {TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap items-center gap-2">
              {isStaff && (
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {(branches.data?.results ?? []).map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative min-w-[16rem]">
                <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                <Input
                  placeholder="Search account or student…"
                  className="rounded-full pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-card overflow-hidden rounded-2xl border">
            {tab === "taken_back" ? (
              <TakenBackTable search={debounced} branchId={branchId} />
            ) : (
              <AccountsTable
                rows={rows}
                loading={accounts.isLoading}
                onSend={(r) => setSending(licenceOf(r))}
                onTakeBack={(r) => setTakingBack(licenceOf(r))}
                onRetire={setRetiring}
              />
            )}
          </div>
        </>
      )}

      <AddAccountsDialog open={adding} onClose={() => setAdding(false)} />
      <SendTeamsDetailsDialog licence={sending} onClose={() => setSending(null)} />
      <FreeLicenceDialog licence={takingBack} onClose={() => setTakingBack(null)} />
      <ReasonDialog
        open={retiring != null}
        onClose={() => setRetiring(null)}
        title="Retire Teams account"
        description={retiring?.email}
        confirmLabel="Retire"
        destructive
        pending={retire.isPending}
        onConfirm={(reason) =>
          retiring &&
          retire.mutate({ id: retiring.id, reason }, { onSuccess: () => setRetiring(null) })
        }
      />
    </div>
  );
}
