import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDataSource } from "@/context/data-source";
import { ALL_LEADS } from "@/data/mock-leads";
import { globalListsService } from "@/services/global-lists.service";

export interface EnrollmentRow {
  id: string;
  leadId?: string;
  leadName: string;
  courseName: string;
  batch?: string;
  status: string;
  enrollmentDate?: string;
  agreed: number;
  paid: number;
  remaining: number;
  isFullPaid: boolean;
}

export interface PaymentRow {
  id: string;
  leadId?: string;
  /** Parent enrollment — needed to address the nested payment endpoints. */
  enrollmentId?: string;
  leadName: string;
  courseName?: string;
  amount: number;
  paidAt: string;
  method: string;
  reference?: string;
  status: string;
  receivedBy?: string;
}

/** Global enrollments register — `GET /api/enrollments/` (live) or mock leads' enrollments. */
export function useEnrollments() {
  const { source } = useDataSource();
  const isApi = source === "api";

  const query = useQuery({
    queryKey: ["enrollments", "list"],
    enabled: isApi,
    queryFn: () => globalListsService.enrollments({ ordering: "-created_at", page_size: 100 }),
    placeholderData: keepPreviousData,
  });

  let rows: EnrollmentRow[];
  if (isApi) {
    rows = (query.data?.results ?? []).map((e) => ({
      id: String(e.id),
      leadId: String(e.lead),
      leadName: e.lead_name,
      courseName: e.course_name ?? "—",
      batch: e.current_batch_name ?? e.batch_name ?? undefined,
      status: e.status,
      enrollmentDate: e.enrollment_date ?? undefined,
      agreed: Number(e.agreed_amount),
      paid: Number(e.total_paid),
      remaining: Number(e.remaining_amount),
      isFullPaid: e.is_full_paid,
    }));
  } else {
    rows = ALL_LEADS.filter((l) => l.enrollment).map((l) => {
      const en = l.enrollment!;
      const paid = l.payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.amount, 0);
      return {
        id: en.id,
        leadId: l.id,
        leadName: l.fullName,
        courseName: en.courseName,
        batch: en.batch,
        status: en.status,
        enrollmentDate: en.enrolledAt,
        agreed: en.agreedAmount,
        paid,
        remaining: Math.max(0, en.agreedAmount - paid),
        isFullPaid: en.agreedAmount > 0 && en.agreedAmount - paid <= 0,
      };
    });
  }
  return { rows, isLoading: isApi && query.isLoading };
}

/** Global payments ledger — `GET /api/payments/` (live) or mock leads' payments. */
export function usePayments() {
  const { source } = useDataSource();
  const isApi = source === "api";

  const query = useQuery({
    queryKey: ["payments", "list"],
    enabled: isApi,
    queryFn: () => globalListsService.payments({ ordering: "-payment_date", page_size: 100 }),
    placeholderData: keepPreviousData,
  });

  let rows: PaymentRow[];
  if (isApi) {
    rows = (query.data?.results ?? []).map((p) => ({
      id: String(p.id),
      leadId: String(p.lead),
      enrollmentId: String(p.enrollment),
      leadName: p.lead_name,
      courseName: p.course_name,
      amount: Number(p.amount),
      paidAt: p.payment_date,
      method: p.payment_method,
      reference: p.transaction_reference ?? undefined,
      status: p.status,
      receivedBy: p.received_by_name,
    }));
  } else {
    rows = ALL_LEADS.flatMap((l) =>
      l.payments.map((p) => ({
        id: p.id,
        leadId: l.id,
        leadName: l.fullName,
        courseName: l.enrollment?.courseName,
        amount: p.amount,
        paidAt: p.paidAt,
        method: p.method,
        reference: p.reference,
        status: p.status,
        receivedBy: p.receivedBy,
      })),
    );
    rows.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }
  return { rows, isLoading: isApi && query.isLoading };
}
