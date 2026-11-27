import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useCourseCategories,
  useCreateCourseCategory,
  useDeleteCourseCategory,
  useUpdateCourseCategory,
} from "@/hooks/use-courses";
import type { CourseCategory } from "@/types";

interface EditorState {
  row: CourseCategory | null;
  name: string;
  description: string;
  is_active: boolean;
}

const emptyEditor: EditorState = { row: null, name: "", description: "", is_active: true };

/** Manage `/api/course-categories/` — opened from the Courses page "Manage Setup" menu. */
export function CategoryManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const categoriesQ = useCourseCategories(open);
  const create = useCreateCourseCategory();
  const update = useUpdateCourseCategory();
  const remove = useDeleteCourseCategory();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<CourseCategory | null>(null);

  function submitEditor() {
    if (!editor) return;
    if (!editor.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const payload = {
      name: editor.name.trim(),
      description: editor.description || undefined,
      is_active: editor.is_active,
    };
    const onSuccess = () => setEditor(null);
    if (editor.row) update.mutate({ id: editor.row.id, payload }, { onSuccess });
    else create.mutate(payload, { onSuccess });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Course categories</DialogTitle>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {categoriesQ.data?.results.length ? (
            categoriesQ.data.results.map((cat) => (
              <div
                key={cat.id}
                className="bg-surface-container-low flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{cat.name}</p>
                  {cat.description && (
                    <p className="text-muted-foreground truncate text-xs">{cat.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={
                      cat.is_active
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-0.5 text-xs font-semibold"
                        : "bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-semibold"
                    }
                  >
                    {cat.is_active ? "Active" : "Inactive"}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() =>
                      setEditor({
                        row: cat,
                        name: cat.name,
                        description: cat.description ?? "",
                        is_active: cat.is_active,
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => setDeleting(cat)}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">No categories yet.</p>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => setEditor(emptyEditor)}
          disabled={editor != null}
        >
          <Plus /> New category
        </Button>

        {/* create / edit */}
        <Dialog open={editor != null} onOpenChange={(o) => !o && setEditor(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{editor?.row ? `Edit "${editor.row.name}"` : "New category"}</DialogTitle>
            </DialogHeader>
            {editor && (
              <div className="space-y-4 py-1">
                <div className="space-y-2">
                  <Label required>Name</Label>
                  <Input
                    autoFocus
                    value={editor.name}
                    onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                    placeholder="Marketing"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editor.description}
                    onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                    placeholder="Digital marketing & SEO courses"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={editor.is_active}
                    onCheckedChange={(c) => setEditor({ ...editor, is_active: c })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditor(null)}>
                Cancel
              </Button>
              <Button
                variant="brand"
                onClick={submitEditor}
                disabled={create.isPending || update.isPending}
              >
                {editor?.row ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* delete confirm */}
        <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the category from the course catalog.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleting) remove.mutate(deleting.id);
                  setDeleting(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
