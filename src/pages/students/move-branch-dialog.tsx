import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useBranches } from "@/hooks/use-branches";
import { useMoveStudentBranch } from "@/hooks/use-students";
import type { ApiStudent } from "@/types/leads-api";

/** Move a student, with their open enrollments, to another branch. */
export function MoveBranchDialog({
  student,
  open,
  onOpenChange,
  onMoved,
}: {
  student: ApiStudent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved: () => void;
}) {
  const branchesQ = useBranches(1, 100, "", open);
  const options = useMemo(
    () => (branchesQ.data?.results ?? []).filter((b) => b.is_active && b.id !== student.branch),
    [branchesQ.data, student.branch],
  );
  const move = useMoveStudentBranch();
  const [branch, setBranch] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setBranch("");
      setReason("");
    }
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    move.mutate(
      { id: student.id, branch: Number(branch), reason: reason.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          onMoved();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move branch</DialogTitle>
          <DialogDescription>
            {student.full_name}
            {student.branch_name ? ` · ${student.branch_name}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="move-branch" required>
              New branch
            </Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger id="move-branch">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {options.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="move-reason" required>
              Reason
            </Label>
            <Textarea
              id="move-reason"
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={move.isPending || !branch || !reason.trim()}>
              {move.isPending ? "Moving…" : "Move"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
