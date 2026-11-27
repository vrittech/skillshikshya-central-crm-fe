import axios from "axios";
import type { ApiPhoneMatch } from "@/types/leads-api";

/** The leads sent back when a new lead's phone number is already in use, if any. */
export function phoneMatchOf(error: unknown): ApiPhoneMatch[] | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return null;
  const data = error.response.data as { phone_match?: ApiPhoneMatch[] } | undefined;
  return Array.isArray(data?.phone_match) && data.phone_match.length ? data.phone_match : null;
}
