import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth";
import { useCourses, useDeleteCourse } from "@/hooks/use-courses";
import type { Course, CourseType } from "@/types";
import { CategoryManagerDialog } from "./category-manager-dialog";
import { CourseFormDialog } from "./course-form-dialog";
import { TruncatedTooltip } from "@/components/ui/truncated-tooltip";

const PAGE_SIZE = 20;

const TYPE_TABS: { value: CourseType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "course", label: "Courses" },
  { value: "master_class", label: "Master Classes" },
  { value: "job_ready_program", label: "Job Ready Programs" },
];

const TYPE_BADGE: Record<CourseType, string> = {
  course: "Course",
  master_class: "Master Class",
  job_ready_program: "Job Ready Program",
};

function formatMoney(value: string | null) {
  if (!value) return "—";
  const n = Number(value);
  return Number.isNaN(n) ? value : `Rs. ${n.toLocaleString("en-IN")}`;
}

export default function CoursesPage() {
  const { hasPerm } = useAuth();
  const canAdd = hasPerm("course.add_course");
  const canChange = hasPerm("course.change_course");
  const canDelete = hasPerm("course.delete_course");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courseType, setCourseType] = useState<CourseType | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // Debounce the search box, then let the backend do the filtering (?search=).
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useCourses(
    page,
    PAGE_SIZE,
    debouncedSearch,
    courseType === "all" ? undefined : courseType,
  );
  const deleteCourse = useDeleteCourse();

  const rows = data?.results ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {data ? `${data.count} offering${data.count === 1 ? "" : "s"}` : "Course offerings"}{" "}
            across courses, master classes, and job-ready programs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAdd && (
            <Button
              variant="brand"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Add New Course
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Manage Setup</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setCategoriesOpen(true)}>
                Manage Categories
              </DropdownMenuItem>
              <NavLink to="/batches/slots">
                <DropdownMenuItem>Manage Time Slots</DropdownMenuItem>
              </NavLink>
              <NavLink to="/batches">
                <DropdownMenuItem>Manage Course Batches</DropdownMenuItem>
              </NavLink>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={courseType}
          onValueChange={(v) => {
            setCourseType(v as CourseType | "all");
            setPage(1);
          }}
        >
          <TabsList>
            {TYPE_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search name, remarks..."
            className="rounded-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Full amount</TableHead>
              <TableHead>One-time discount</TableHead>
              <TableHead>Syllabus</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                  No courses found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="max-w-xs">
                  <p className="font-semibold truncate">{c.name}</p>
                  {c.category_names && c.category_names.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.category_names.map((n) => (
                        <Badge key={n} variant="outline" className="text-[10px] px-1.5 py-0">
                          {n}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {c.remarks && (
                    <TruncatedTooltip text={c.remarks} className="text-muted-foreground text-xs" maxWidth="14rem" />
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{TYPE_BADGE[c.course_type]}</Badge>
                </TableCell>
                <TableCell className="font-medium">{formatMoney(c.full_amount)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatMoney(c.one_time_payment_discount)}
                </TableCell>
                <TableCell>
                  {c.syllabus ? (
                    <a
                      href={c.syllabus}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand text-sm hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {(canChange || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canChange && (
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditing(c);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
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
              Showing {rows.length} of {data.count} courses
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

      <CourseFormDialog open={formOpen} onOpenChange={setFormOpen} course={editing} />

      <CategoryManagerDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />

      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the course offering. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) deleteCourse.mutate(deleting.id);
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
