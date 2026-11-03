/**
 * Call minutes ledger — see src/docs/be-mds/account_app_apis_guide.md §Call Minutes
 * and lead_app_calls_api_guide.md §Call Minutes Deduction.
 */

export type CallMinutesTransactionType = "topup" | "deduction" | "adjustment";

/** One immutable row in a user's call-minutes ledger. */
export interface CallMinutesTransaction {
  id: number;
  /** Positive for top-ups/adjustments, negative for deductions. */
  amount: number;
  amount_minutes: number;
  type: CallMinutesTransactionType;
  balance_after: number;
  balance_after_minutes: number;
  /** Related LeadCall id (deductions only). */
  call: number | null;
  note: string;
  /** Present on top-ups — the admin who performed the top-up. */
  created_by_name?: string;
  created_at: string;
}

export interface AddCallMinutesPayload {
  amount: number;
  note?: string;
}

export interface AddCallMinutesResponse {
  detail: string;
  user: { id: number; email: string };
  balance: number;
  transaction: CallMinutesTransaction;
}

export interface CallMinutesTransactionsParams {
  page?: number;
  page_size?: number;
  type?: CallMinutesTransactionType;
  created_at__gte?: string;
  created_at__lte?: string;
}

/** GET /users/me/call-minutes/ — own balance + last 10 transactions. */
export interface MyCallMinutes {
  balance_seconds: number;
  balance_minutes: number;
  balance_display: string;
  recent_transactions: CallMinutesTransaction[];
}
