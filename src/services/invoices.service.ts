import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiInvoice,
  InvoiceEmailConfig,
  InvoiceEmailConfigPayload,
  InvoiceListParams,
  InvoiceResendResponse,
} from "@/types/invoices";

export const invoicesService = {
  /** Flat list across all students — `GET /api/invoices/`. */
  async list(params: InvoiceListParams = {}) {
    const { data } = await api.get<Paginated<ApiInvoice>>("/invoices/", { params });
    return data;
  },

  /** Per-student invoice history — same shape, pre-filtered. */
  async byStudent(studentId: number, params: InvoiceListParams = {}) {
    const { data } = await api.get<Paginated<ApiInvoice>>(`/students/${studentId}/invoices/`, {
      params,
    });
    return data;
  },

  /** Admin only — queues the invoice email task again (styled HTML email). */
  async resend(id: number) {
    const { data } = await api.post<InvoiceResendResponse>(`/invoices/${id}/resend/`, {});
    return data;
  },

  /** Admin only — cancel a wrong invoice. The reason is required and kept. */
  async cancel(id: number, reason: string) {
    const { data } = await api.post<ApiInvoice>(`/invoices/${id}/cancel/`, { reason });
    return data;
  },

  /** Admin only — global CC list applied to every invoice email. */
  async emailConfig() {
    const { data } = await api.get<InvoiceEmailConfig>("/invoices/email-config/");
    return data;
  },

  /** Admin only — the endpoint is PUT, so send the whole config. */
  async updateEmailConfig(payload: InvoiceEmailConfigPayload) {
    const { data } = await api.put<InvoiceEmailConfig>("/invoices/email-config/", payload);
    return data;
  },
};
