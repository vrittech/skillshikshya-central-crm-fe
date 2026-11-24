import { ArrowLeft, PencilLine } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";
import { useCourseBatch } from "@/hooks/use-batches";
import { formatDate } from "@/lib/leads-format";
import { batchShift } from "@/lib/time-slots";
import type { CourseBatch } from "@/types";
import { BatchMoneyPanel } from "./batch-money-panel";
import { BatchStudentsPanel } from "./batch-students-panel";
import { CourseBatchDialog } from "./course-batch-dialog";
import { STATUS_BADGE } from "./status";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground font-mono text-[11px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

function Seats({ batch }: { batch: CourseBatch }) {
  const taken = batch.seats_taken ?? 0;
  const full = batch.capacity != null && batch.seats_left === 0;
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      {batch.capacity == null ? taken : `${taken} / ${batch.capacity}`}
      {batch.capacity == null && <Badge variant="warning">No seats set</Badge>}
      {full && <Badge variant="warning">Full</Badge>}
    </span>
  );
}

export default function BatchDetailPage() {
  const { id } = useParams();
  const { source } = useDataSource();
  const { hasPerm } = useAuth();
  const { data: batch, isLoading, isError } = useCourseBatch(id ? Number(id) : null);
  const [editing, setEditing] = useState(false);
  const canChange = hasPerm("course.change_coursebatch");
  const back = (
    <Link
      to="/batches"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-4" /> Back to batches
    </Link>
  );

  if (source !== "api") {
    return (
      <div className="space-y-6">
        {back}
        <div className="text-muted-foreground rounded-2xl border border-dashed py-16 text-center text-sm">
          Switch to Live data to see this batch.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="space-y-6">
        {back}
        <div className="flex min-h-[40dvh] items-center justify-center">
          <h1 className="font-headline text-xl font-semibold">Batch not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {back}

      <Card className="gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
              {batch.coursebatch_id}
            </p>
            <h1 className="font-headline mt-1 text-2xl font-semibold tracking-tight">{batch.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={STATUS_BADGE[batch.status] ?? "outline"}>
                {batch.status_display ?? batch.status}
              </Badge>
              {!batch.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
          </div>
          {canChange && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilLine /> Edit
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Fact label="Course">{batch.course_name ?? "—"}</Fact>
          <Fact label="Time slot">{batchShift(batch) ?? "—"}</Fact>
          <Fact label="Starts">{batch.start_date ? formatDate(batch.start_date) : "—"}</Fact>
          <Fact label="Ends">{batch.end_date ? formatDate(batch.end_date) : "—"}</Fact>
          <Fact label="Mode">{batch.mode_display ?? batch.mode}</Fact>
          <Fact label="Seats">
            <Seats batch={batch} />
          </Fact>
          <Fact label="Free seats">{batch.capacity == null ? "—" : (batch.seats_left ?? 0)}</Fact>
          <Fact label="Pending">{batch.waiting_count ?? 0}</Fact>
          <Fact label="Trainer">{batch.trainer || "—"}</Fact>
          <Fact label="Branch">{batch.branch_name ?? "—"}</Fact>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <Tabs defaultValue="students">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-2">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="money">Money</TabsTrigger>
          </TabsList>
          <div className="p-5">
            <TabsContent value="students">
              <BatchStudentsPanel batchId={batch.id} />
            </TabsContent>
            <TabsContent value="money">
              <BatchMoneyPanel
                batch={batch}
                canAddCost={hasPerm("course.add_batchcost")}
                canVoidCost={hasPerm("course.change_batchcost")}
                canClose={canChange}
              />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      <CourseBatchDialog open={editing} onClose={() => setEditing(false)} courseBatch={batch} />
    </div>
  );
}
