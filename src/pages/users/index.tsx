import { ChevronLeft, ChevronRight, Download, MoreHorizontal, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { useGroups } from "@/hooks/use-groups";
import { useDeleteUser, useUsers } from "@/hooks/use-users";
import { apiErrorMessage } from "@/lib/api";
import { usersService } from "@/services/users.service";
import type { User } from "@/types";
import { CallMinutesDialog } from "./call-minutes-dialog";
import { UserFormDialog } from "./user-form-dialog";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isStaff = !!currentUser?.is_staff;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [minutesUser, setMinutesUser] = useState<User | null>(null);

  // Debounce the search box, then let the backend do the filtering (?search=).
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useUsers(page, PAGE_SIZE, debouncedSearch);
  const groups = useGroups(isStaff);
  const deleteUser = useDeleteUser();

  async function handleExport() {
    setExporting(true);
    try {
      await usersService.exportCsv({ search: debouncedSearch || undefined });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  }

  const groupName = useMemo(() => {
    const map = new Map<number, string>();
    groups.data?.results.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [groups.data]);

  const rows = data?.results ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {data ? `${data.count} team member${data.count === 1 ? "" : "s"}` : "Team members"}{" "}
            actively managing your CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download /> {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          )}
          {isStaff && (
            <Button
              variant="brand"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Add New User
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
        <Input
          placeholder="Search name, email, phone..."
          className="rounded-full pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Call target</TableHead>
              <TableHead>Minutes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-muted-foreground py-10 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="bg-brand-fixed-dim/30 text-brand-container dark:text-brand-fixed flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                      {u.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="leading-tight">
                      <p className="font-semibold">
                        {u.name}
                        {u.is_staff && (
                          <Badge variant="secondary" className="ml-2">
                            Admin
                          </Badge>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.designation || "—"}</TableCell>
                <TableCell>
                  {u.groups?.[0] != null ? (
                    <Badge variant="secondary">
                      {groupName.get(u.groups[0]) ?? `Role #${u.groups[0]}`}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.branch_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.phone || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {u.shift_start && u.shift_end
                    ? `${u.shift_start.slice(0, 5)}–${u.shift_end.slice(0, 5)}`
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.daily_call_target_min != null ? `${u.daily_call_target_min} min/day` : "—"}
                </TableCell>
                <TableCell>
                  {isStaff ? (
                    <button
                      type="button"
                      className="hover:text-brand font-semibold"
                      onClick={() => setMinutesUser(u)}
                    >
                      {u.call_minutes_balance ?? "—"}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">{u.call_minutes_balance ?? "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {u.is_active ? (
                    <Badge variant="brand" className="text-[11px] font-bold uppercase">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[11px] font-bold uppercase">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {(isStaff || currentUser?.id === u.id) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(u);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        {isStaff && (
                          <DropdownMenuItem onSelect={() => setMinutesUser(u)}>
                            Call minutes
                          </DropdownMenuItem>
                        )}
                        {isStaff && u.id !== currentUser?.id && (
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(u)}>
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data && data.count > PAGE_SIZE && (
          <div className="bg-muted/50 flex items-center justify-between border-t px-6 py-3">
            <span className="text-muted-foreground text-sm">
              Showing {rows.length} of {data.count} members
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />

      <CallMinutesDialog user={minutesUser} open={minutesUser != null} onOpenChange={(o) => !o && setMinutesUser(null)} />

      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the user account for {deleting?.email}. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) deleteUser.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
