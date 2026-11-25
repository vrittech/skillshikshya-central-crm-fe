import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDataSource } from "@/context/data-source";
import { ALL_LEADS } from "@/data/mock-leads";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { globalListsService } from "@/services/global-lists.service";
import type {
  ApiEnrollmentStatus,
  ApiPaymentMethod,
  ApiPaymentStatus,
  ApiSeatState,
} from "@/types/leads-api";

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
  seatState?: ApiSeatState;
  pausedOn?: string;
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

export interface EnrollmentListParams {
  page: number;
  pageSize: number;
  search: string;
  status?: ApiEnrollmentStatus;
  seat?: ApiSeatState;
}

/**
 * Global enrollments register, one page at a time. Live data is searched,
 * filtered and paged by `GET /api/enrollments/`; mock data is done here.
 */
export function useEnrollments({ page, pageSize, search, status, seat }: EnrollmentListParams) {
  const { source } = useDataSource();
  const isApi = source === "api";
  const q = useDebouncedValue(search.trim(), 300);

  const query = useQuery({
    queryKey: ["enrollments", "list", { page, pageSize, q, status, seat }],
    enabled: isApi,
    queryFn: () =>
      globalListsService.enrollments({
        ordering: "-created_at",
        page,
        page_size: pageSize,
        search: q || undefined,
        status,
        seat,
      }),
    placeholderData: keepPreviousData,
  });

  let rows: EnrollmentRow[];
  let count: number;
  if (isApi) {
    rows = (query.data?.results ?? []).map((e) => ({
      id: String(e.id),
      leadId: String(e.lead),
      leadName: e.lead_name,
      courseName: e.course_name ?? "—",
      batch: e.current_batch_name ?? e.paused_from_name ?? e.batch_name ?? undefined,
      status: e.status,
      enrollmentDate: e.enrollment_date ?? undefined,
      agreed: Number(e.agreed_amount),
      paid: Number(e.total_paid),
      remaining: Number(e.remaining_amount),
      isFullPaid: e.is_full_paid,
      seatState: e.seat_state,
      pausedOn: e.paused_on ?? undefined,
    }));
    count = query.data?.count ?? 0;
  } else {
    const all: EnrollmentRow[] = ALL_LEADS.filter((l) => l.enrollment).map((l) => {
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
    const needle = q.toLowerCase();
    const matched = all.filter(
      (r) =>
        (!status || r.status === status) &&
        (!needle || `${r.leadName} ${r.courseName} ${r.batch ?? ""}`.toLowerCase().includes(needle)),
    );
    count = matched.length;
    rows = matched.slice((page - 1) * pageSize, page * pageSize);
  }
  return { rows, count, isLoading: isApi && query.isLoading };
}

export interface PaymentListParams {
  page: number;
  pageSize: number;
  search: string;
  status?: ApiPaymentStatus;
  method?: ApiPaymentMethod;
}

/**
 * Global payments ledger, one page at a time, with the count and successful
 * total for the filters across every page. Live data is searched, filtered
 * and paged by `GET /api/payments/`; mock data is done here.
 */
export function usePayments({ page, pageSize, search, status, method }: PaymentListParams) {
  const { source } = useDataSource();
  const isApi = source === "api";
  const q = useDebouncedValue(search.trim(), 300);
  const filters = { search: q || undefined, status, payment_method: method };

  const query = useQuery({
    queryKey: ["payments", "list", { page, pageSize, ...filters }],
    enabled: isApi,
    queryFn: () =>
      globalListsService.payments({ ordering: "-payment_date", page, page_size: pageSize, ...filters }),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({
    queryKey: ["payments", "summary", filters],
    enabled: isApi,
    queryFn: () => globalListsService.paymentsSummary(filters),
    placeholderData: keepPreviousData,
  });

  let rows: PaymentRow[];
  let count: number;
  let successfulTotal: number;
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
    count = query.data?.count ?? 0;
    successfulTotal = Number(summary.data?.successful_total ?? 0);
  } else {
    const all: PaymentRow[] = ALL_LEADS.flatMap((l) =>
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
    all.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
    const needle = q.toLowerCase();
    const matched = all.filter(
      (r) =>
        (!status || r.status === status) &&
        (!method || r.method === method) &&
        (!needle ||
          `${r.leadName} ${r.courseName ?? ""} ${r.reference ?? ""}`.toLowerCase().includes(needle)),
    );
    count = matched.length;
    successfulTotal = matched
      .filter((r) => r.status === "successful")
      .reduce((s, r) => s + r.amount, 0);
    rows = matched.slice((page - 1) * pageSize, page * pageSize);
  }
  return { rows, count, successfulTotal, isLoading: isApi && query.isLoading };
}
