import { ArrowLeft, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BatchLink } from "@/components/batch-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/context/role";
import { useEnrollmentPage } from "@/hooks/use-leads";
import { formatDate } from "@/lib/leads-format";
import { canSit } from "@/lib/seats";
import { EnrollmentDialog } from "@/pages/leads/components/enrollment-dialogs";
import { EnrollmentCard } from "@/pages/leads/components/enrollments-panel";
import type { ApiEnrollment } from "@/types/leads-api";

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

/** Where the student sits now: the batch, Paused, or —. */
function SittingIn({ enrollment: e }: { enrollment: ApiEnrollment }) {
  if (!canSit(e)) return <>—</>;
  if (e.seat_state === "paused") return <>Paused</>;
  if (e.current_batch != null) return <BatchLink id={e.current_batch} name={e.current_batch_name} />;
  return <>—</>;
}

export default function EnrollmentDetailPage() {
  const { id } = useParams();
  const { can } = useRole();
  const { data, isLoading, isError } = useEnrollmentPage(id ? Number(id) : undefined);
  const [editing, setEditing] = useState(false);
  const back = (
    <Link
      to="/enrollments"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-4" /> Back to enrollments
    </Link>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        {back}
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-2 text-center">
          <h1 className="font-headline text-xl font-semibold">Enrollment not found</h1>
        </div>
      </div>
    );
  }

  const { leadId, enrollment: e } = data;
  const name = e.student_name ?? e.lead_name ?? "Enrollment";

  return (
    <div className="space-y-6">
      {back}

      <Card className="gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
              Enrollment {e.id}
            </p>
            <h1 className="font-headline mt-1 text-2xl font-semibold tracking-tight">{name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{e.course_name}</p>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/leads/${leadId}`}>
              <UserRound /> Open lead
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Lead">
            <Link to={`/leads/${leadId}`} className="hover:underline">
              {e.lead_name ?? "—"}
            </Link>
          </Fact>
          <Fact label="Course">{e.course_name ?? "—"}</Fact>
          <Fact label="Enrolled batch">
            {e.batch != null ? <BatchLink id={e.batch} name={e.batch_name} /> : "—"}
          </Fact>
          <Fact label="Sitting in">
            <SittingIn enrollment={e} />
          </Fact>
          <Fact label="Branch">{e.branch_name ?? "—"}</Fact>
          <Fact label="Enrolled">{formatDate(e.enrollment_date ?? undefined)}</Fact>
        </div>
      </Card>

      <EnrollmentCard
        page
        leadId={leadId}
        enrollment={e}
        canManage={can("enrollment.manage")}
        onEdit={() => setEditing(true)}
      />

      <EnrollmentDialog
        open={editing}
        onClose={() => setEditing(false)}
        leadId={leadId}
        enrollment={editing ? e : null}
      />
    </div>
  );
}
