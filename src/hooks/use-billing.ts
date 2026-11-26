import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
 * Global enrollments register, one page at a time, searched, filtered and
 * paged by `GET /api/enrollments/`.
 */
export function useEnrollments({ page, pageSize, search, status, seat }: EnrollmentListParams) {
  const q = useDebouncedValue(search.trim(), 300);

  const query = useQuery({
    queryKey: ["enrollments", "list", { page, pageSize, q, status, seat }],
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

  const rows: EnrollmentRow[] = (query.data?.results ?? []).map((e) => ({
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
  const count = query.data?.count ?? 0;
  return { rows, count, isLoading: query.isLoading };
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
 * total for the filters across every page, searched, filtered and paged by
 * `GET /api/payments/`.
 */
export function usePayments({ page, pageSize, search, status, method }: PaymentListParams) {
  const q = useDebouncedValue(search.trim(), 300);
  const filters = { search: q || undefined, status, payment_method: method };

  const query = useQuery({
    queryKey: ["payments", "list", { page, pageSize, ...filters }],
    queryFn: () =>
      globalListsService.payments({ ordering: "-payment_date", page, page_size: pageSize, ...filters }),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({
    queryKey: ["payments", "summary", filters],
    queryFn: () => globalListsService.paymentsSummary(filters),
    placeholderData: keepPreviousData,
  });

  const rows: PaymentRow[] = (query.data?.results ?? []).map((p) => ({
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
  const count = query.data?.count ?? 0;
  const successfulTotal = Number(summary.data?.successful_total ?? 0);
  return { rows, count, successfulTotal, isLoading: query.isLoading };
}
