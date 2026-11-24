import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";
import {
  useBatches,
  useCourseBatches,
  useDeleteBatch,
  useDeleteCourseBatch,
} from "@/hooks/use-batches";
import { formatDate } from "@/lib/leads-format";
import type { Batch, CourseBatch, CourseBatchStatus } from "@/types";
import { durationText, slotTimes, timeLabel } from "@/lib/time-slots";
import { BatchDialog } from "./batch-dialog";
import { CourseBatchDialog } from "./course-batch-dialog";
import { STATUS_BADGE, STATUS_LABEL } from "./status";

const PAGE_SIZE = 20;
const ALL_SLOTS = "all";
const ALL_STATUSES = "all";

export default function BatchesPage({ defaultTab = "course-batches" }: { defaultTab?: "course-batches" | "slots" }) {
  const { hasPerm } = useAuth();
  const { source } = useDataSource();
  const isApi = source === "api";
  const navigate = useNavigate();
  const tab = defaultTab;
  const setTab = (next: "course-batches" | "slots") =>
    navigate(next === "slots" ? "/batches/slots" : "/batches");

  if (!isApi) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <div className="text-muted-foreground rounded-2xl border border-dashed py-16 text-center text-sm">
          Switch to Live data to see batches.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "course-batches" | "slots")}>
        <TabsList>
          <TabsTrigger value="course-batches">Batches</TabsTrigger>
          <TabsTrigger value="slots">Time slots</TabsTrigger>
        </TabsList>
        <TabsContent value="course-batches" className="mt-6">
          <CourseBatchesTab
            canAdd={hasPerm("course.add_coursebatch")}
            canChange={hasPerm("course.change_coursebatch")}
            canDelete={hasPerm("course.delete_coursebatch")}
          />
        </TabsContent>
        <TabsContent value="slots" className="mt-6">
          <SlotsTab
            canAdd={hasPerm("course.add_batch")}
            canChange={hasPerm("course.change_batch")}
            canDelete={hasPerm("course.delete_batch")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PageHeading() {
  return (
    <div>
      <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
        Institute
      </p>
      <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Batches</h1>
    </div>
  );
}

/* ------------------------------------------------------------------- course batches */

interface TabPerms {
  canAdd: boolean;
  canChange: boolean;
  canDelete: boolean;
}

function CourseBatchesTab({ canAdd, canChange, canDelete }: TabPerms) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [slot, setSlot] = useState(ALL_SLOTS);
  const [batchStatus, setBatchStatus] = useState<CourseBatchStatus | typeof ALL_STATUSES>(
    ALL_STATUSES,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseBatch | null>(null);
  const [deleting, setDeleting] = useState<CourseBatch | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const slotsQ = useBatches({ page_size: 100 });
  const { data, isLoading } = useCourseBatches({
    page,
    page_size: PAGE_SIZE,
    search: debounced || undefined,
    batch: slot === ALL_SLOTS ? undefined : Number(slot),
    status: batchStatus === ALL_STATUSES ? undefined : batchStatus,
    ordering: "-start_date",
  });
  const del = useDeleteCourseBatch();

  const rows = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm min-w-[16rem]">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <Input
              placeholder="Search name or batch ID…"
              className="rounded-full pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={slot}
            onValueChange={(v) => {
              setSlot(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[11rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SLOTS}>All time slots</SelectItem>
              {(slotsQ.data?.results ?? []).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={batchStatus}
            onValueChange={(v) => {
              setBatchStatus(v as CourseBatchStatus | typeof ALL_STATUSES);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canAdd && (
          <Button
            variant="brand"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> New batch
          </Button>
        )}
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Batch ID</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Time slot</TableHead>
              <TableHead>Runs</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                  No batches found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((cb) => (
              <TableRow key={cb.id}>
                <TableCell>
                  <Link to={`/batches/${cb.id}`} className="font-semibold hover:underline">
                    {cb.name}
                  </Link>
                  <div className="text-muted-foreground text-xs">
                    {cb.mode === "online" ? "Online" : "Physical"}
                    {cb.trainer ? ` · ${cb.trainer}` : ""}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{cb.coursebatch_id}</TableCell>
                <TableCell>{cb.course_name ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {cb.batch_name || "—"}
                  {cb.batch_start_time && cb.batch_end_time && (
                    <div className="text-muted-foreground text-xs">
                      {timeLabel(cb.batch_start_time)} – {timeLabel(cb.batch_end_time)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {cb.start_date ? formatDate(cb.start_date) : "—"}
                  {cb.end_date ? ` → ${formatDate(cb.end_date)}` : ""}
                </TableCell>
                <TableCell>
                  <SeatsCell batch={cb} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={STATUS_BADGE[cb.status] ?? "outline"}>
                      {STATUS_LABEL[cb.status] ?? cb.status}
                    </Badge>
                    {!cb.is_active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <RowMenu
                    onOpen={() => navigate(`/batches/${cb.id}`)}
                    onEdit={
                      canChange
                        ? () => {
                            setEditing(cb);
                            setFormOpen(true);
                          }
                        : undefined
                    }
                    onDelete={canDelete ? () => setDeleting(cb) : undefined}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Pager
          page={page}
          count={data?.count ?? 0}
          shown={rows.length}
          noun="batches"
          onPage={setPage}
        />
      </div>

      <CourseBatchDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        courseBatch={editing}
      />

      <ConfirmDelete
        name={deleting?.name}
        description="This cannot be undone."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) del.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- time slots */

function SlotsTab({ canAdd, canChange, canDelete }: TabPerms) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState<Batch | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useBatches({
    page,
    page_size: PAGE_SIZE,
    search: debounced || undefined,
    ordering: "name",
  });
  const del = useDeleteBatch();

  const rows = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm min-w-[16rem]">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search time slots…"
            className="rounded-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canAdd && (
          <Button
            variant="brand"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> New Time Slot
          </Button>
        )}
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                  No time slots found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-semibold">{b.name}</TableCell>
                <TableCell className="text-muted-foreground">{slotTimes(b) ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{durationText(b.duration_minutes)}</TableCell>
                <TableCell>
                  <Badge variant={b.is_active ? "brand" : "secondary"}>
                    {b.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(canChange || canDelete) && (
                    <RowMenu
                      onEdit={
                        canChange
                          ? () => {
                              setEditing(b);
                              setFormOpen(true);
                            }
                          : undefined
                      }
                      onDelete={canDelete ? () => setDeleting(b) : undefined}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Pager
          page={page}
          count={data?.count ?? 0}
          shown={rows.length}
          noun="time slots"
          onPage={setPage}
        />
      </div>

      <BatchDialog open={formOpen} onClose={() => setFormOpen(false)} batch={editing} />

      <ConfirmDelete
        name={deleting?.name}
        description="This cannot be undone."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) del.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

/** "12 / 30" with a Full badge, or "No seats set" on an older batch, and the pending count. */
function SeatsCell({ batch }: { batch: CourseBatch }) {
  const taken = batch.seats_taken ?? 0;
  const full = batch.capacity != null && batch.seats_left === 0;
  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5">
        <span className="font-medium tabular-nums">
          {batch.capacity == null ? taken : `${taken} / ${batch.capacity}`}
        </span>
        {batch.capacity == null && <Badge variant="warning">No seats set</Badge>}
        {full && <Badge variant="warning">Full</Badge>}
      </div>
      {!!batch.waiting_count && (
        <div className="text-muted-foreground text-xs">{batch.waiting_count} pending</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- shared */

function RowMenu({
  onOpen,
  onEdit,
  onDelete,
}: {
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onOpen && <DropdownMenuItem onSelect={onOpen}>Open</DropdownMenuItem>}
        {onEdit && <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>}
        {onDelete && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pager({
  page,
  count,
  shown,
  noun,
  onPage,
}: {
  page: number;
  count: number;
  shown: number;
  noun: string;
  onPage: (next: number) => void;
}) {
  if (count <= PAGE_SIZE) return null;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <div className="bg-muted/50 flex items-center justify-between border-t px-6 py-3">
      <span className="text-muted-foreground text-sm">
        Showing {shown} of {count} {noun}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
        </Button>
        <span className="text-muted-foreground text-sm">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function ConfirmDelete({
  name,
  description,
  onCancel,
  onConfirm,
}: {
  name?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={name != null} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
