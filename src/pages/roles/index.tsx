import { MoreHorizontal, Plus, Search } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  usePermissions,
  useUpdateGroup,
} from "@/hooks/use-groups";
import type { Group, Permission } from "@/types";

function RoleFormDialog({
  open,
  onOpenChange,
  group,
  permissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  permissions: Permission[];
}) {
  const isEdit = group != null;
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const create = useCreateGroup();
  const update = useUpdateGroup();
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setName(group?.name ?? "");
      setSelected(new Set(group?.permissions ?? []));
      setFilter("");
    }
  }, [open, group]);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const visible = q
      ? permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.codename.toLowerCase().includes(q) ||
            p.content_type_name.toLowerCase().includes(q),
        )
      : permissions;
    const map = new Map<string, Permission[]>();
    for (const p of visible) {
      const list = map.get(p.content_type_name) ?? [];
      list.push(p);
      map.set(p.content_type_name, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, filter]);

  function toggle(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, permissions: [...selected] };
    if (isEdit) {
      update.mutate({ id: group.id, payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Only the permission list scrolls; the name and buttons stay put. */}
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit role: ${group.name}` : "Create role"}</DialogTitle>
          <DialogDescription className="sr-only">Role name and permissions</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="role-name" required>Role name</Label>
            <Input
              id="role-name"
              required
              placeholder="Call Agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Permissions ({selected.size} selected)</Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2 left-2 size-3.5" />
                <Input
                  className="h-8 w-48 pl-7 text-xs"
                  placeholder="Filter permissions…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>
            <div className="relative min-h-0 flex-1 space-y-3 overflow-y-auto rounded-md border p-3">
              {permissions.length === 0 && (
                <p className="text-muted-foreground text-sm">No permissions loaded.</p>
              )}
              {grouped.map(([contentType, perms]) => (
                <div key={contentType}>
                  <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                    {contentType}
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {perms.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selected.has(p.id)}
                          onCheckedChange={(v) => toggle(p.id, v === true)}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save role" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesPage() {
  const groups = useGroups();
  const permissions = usePermissions();
  const deleteGroup = useDeleteGroup();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight">
            Roles &amp; Permissions
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Admin only.
          </p>
        </div>
        <Button
          variant="brand"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus /> Create role
        </Button>
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {groups.isError && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-10 text-center">
                  Could not load roles — admin access is required.
                </TableCell>
              </TableRow>
            )}
            {groups.data?.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-10 text-center">
                  No roles yet. Create the first one.
                </TableCell>
              </TableRow>
            )}
            {groups.data?.results.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{g.permissions.length} permissions</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditing(g);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(g)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editing}
        permissions={permissions.data ?? []}
      />

      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Users assigned this role will lose its permissions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) deleteGroup.mutate(deleting.id);
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
