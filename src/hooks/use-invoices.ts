import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { invoicesService } from "@/services/invoices.service";
import type { InvoiceEmailConfigPayload, InvoiceListParams } from "@/types/invoices";

/** Flat invoice register. */
export function useInvoices(params: InvoiceListParams = {}) {
  const query = useQuery({
    queryKey: ["invoices", "list", params],
    queryFn: () => invoicesService.list({ ordering: "-created_at", page_size: 50, ...params }),
    placeholderData: keepPreviousData,
  });
  return {
    invoices: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

/** One student's invoice history. */
export function useStudentInvoices(studentId?: number | null) {
  const enabled = studentId != null;
  const query = useQuery({
    queryKey: ["invoices", "student", studentId],
    enabled,
    queryFn: () =>
      invoicesService.byStudent(studentId as number, { ordering: "-created_at", page_size: 100 }),
  });
  return {
    invoices: query.data?.results ?? [],
    isLoading: enabled && query.isLoading,
  };
}

/** Admin only — re-queue the invoice email. */
export function useResendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => invoicesService.resend(id),
    onSuccess: (data) => {
      toast.success(data.detail || "Invoice queued for re-send", { description: `To ${data.to}` });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not re-send the invoice")),
  });
}

/** Admin only — cancel an invoice with a reason (it also shows in the enrollment history). */
export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      invoicesService.cancel(id, reason),
    onSuccess: (data) => {
      toast.success(`${data.invoice_number} cancelled`);
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["lead"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not cancel the invoice")),
  });
}

/** Admin only — global invoice-email CC config. */
export function useInvoiceEmailConfig(enabled = true) {
  return useQuery({
    queryKey: ["invoices", "email-config"],
    enabled,
    queryFn: () => invoicesService.emailConfig(),
  });
}

export function useUpdateInvoiceEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoiceEmailConfigPayload) => invoicesService.updateEmailConfig(payload),
    onSuccess: () => {
      toast.success("Invoice email settings saved");
      void qc.invalidateQueries({ queryKey: ["invoices", "email-config"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the email settings")),
  });
}

/** Opens an invoice or receipt PDF in a new tab; shows a message when it can't. */
export function openInvoicePdf(id: number) {
  invoicesService.openPdf(id).catch((e) => toast.error(apiErrorMessage(e, "Couldn't open the PDF")));
}
