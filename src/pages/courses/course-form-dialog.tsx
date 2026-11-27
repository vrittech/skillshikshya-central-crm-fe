import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourseCategories, useCreateCourse, useUpdateCourse } from "@/hooks/use-courses";
import type { Course, CourseType } from "@/types";

const COURSE_TYPES: { value: CourseType; label: string }[] = [
  { value: "course", label: "Course" },
  { value: "master_class", label: "Master Class" },
  { value: "job_ready_program", label: "Job Ready Program" },
];

interface FormState {
  course_type: CourseType;
  name: string;
  full_amount: string;
  one_time_payment_discount: string;
  syllabus: string;
  remarks: string;
  categories: number[];
}

const emptyForm: FormState = {
  course_type: "course",
  name: "",
  full_amount: "",
  one_time_payment_discount: "",
  syllabus: "",
  remarks: "",
  categories: [],
};

function toForm(course: Course): FormState {
  return {
    course_type: course.course_type,
    name: course.name,
    full_amount: course.full_amount,
    one_time_payment_discount: course.one_time_payment_discount ?? "",
    syllabus: course.syllabus ?? "",
    remarks: course.remarks ?? "",
    categories: course.categories ?? [],
  };
}

export function CourseFormDialog({
  open,
  onOpenChange,
  course,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null; // null = create new
}) {
  const isEdit = course != null;
  const [form, setForm] = useState<FormState>(emptyForm);
  const create = useCreateCourse();
  const update = useUpdateCourse();
  const categoriesQ = useCourseCategories(open);
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (open) setForm(course ? toForm(course) : emptyForm);
  }, [open, course]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleCategory = (id: number, checked: boolean) =>
    setForm((f) => ({
      ...f,
      categories: checked ? [...f.categories, id] : f.categories.filter((c) => c !== id),
    }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      course_type: form.course_type,
      name: form.name,
      full_amount: form.full_amount,
      one_time_payment_discount: form.one_time_payment_discount || undefined,
      syllabus: form.syllabus || undefined,
      remarks: form.remarks || undefined,
      categories: form.categories,
    };
    if (isEdit) {
      update.mutate({ id: course.id, payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${course.name}` : "Create course"}</DialogTitle>
          {isEdit && <DialogDescription>Update pricing, syllabus, or remarks.</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course-name" required>Name</Label>
              <Input
                id="course-name"
                required
                placeholder="Python Programming"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.course_type}
                onValueChange={(v) => set("course_type", v as CourseType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-amount" required>Full amount (NPR)</Label>
              <Input
                id="course-amount"
                type="number"
                min={0}
                step="0.01"
                required
                placeholder="50000.00"
                value={form.full_amount}
                onChange={(e) => set("full_amount", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-discount">One-time payment discount (NPR)</Label>
              <Input
                id="course-discount"
                type="number"
                min={0}
                step="0.01"
                placeholder="5000.00"
                value={form.one_time_payment_discount}
                onChange={(e) => set("one_time_payment_discount", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="course-syllabus">Syllabus URL</Label>
              <Input
                id="course-syllabus"
                type="url"
                placeholder="https://syllabi.example.com/python.pdf"
                value={form.syllabus}
                onChange={(e) => set("syllabus", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="course-remarks">Remarks</Label>
              <Input
                id="course-remarks"
                placeholder="Comprehensive Python course"
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
            </div>
            {categoriesQ.data && categoriesQ.data.results.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Categories</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categoriesQ.data.results.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      <Checkbox
                        checked={form.categories.includes(cat.id)}
                        onCheckedChange={(c) => toggleCategory(cat.id, c === true)}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Create course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
