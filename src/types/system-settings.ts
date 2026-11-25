/**
 * Settings page: Cloud storage (Cloudflare R2) and Email (SMTP). Admin only.
 * Backend: apps/global_config/settings_views.py.
 *
 * `source`: "saved" = saved on the Settings page, "server" = from the
 * server's .env file (nothing saved yet), "none" = not set up.
 * Secrets are never sent back, only whether one is set.
 */
export type SettingsSource = "saved" | "server" | "none";

export interface StorageSettings {
  source: SettingsSource;
  ready: boolean;
  account_id: string;
  access_key_id: string;
  secret_access_key_set: boolean;
  bucket_name: string;
  public_url: string;
  updated_at: string | null;
  updated_by_name: string;
}

/** A blank secret keeps the one in use. */
export interface StorageSettingsForm {
  account_id: string;
  access_key_id: string;
  secret_access_key: string;
  bucket_name: string;
  public_url: string;
}

export interface StorageTestStep {
  name: string;
  ok: boolean;
  ms: number;
  error: string | null;
}

export interface StorageTestResult {
  ok: boolean;
  key: string;
  steps: StorageTestStep[];
}

export type EmailSecurity = "starttls" | "ssl" | "none";

export interface EmailSettings {
  source: SettingsSource;
  ready: boolean;
  host: string;
  port: number;
  security: EmailSecurity;
  username: string;
  password_set: boolean;
  from_email: string;
  /** The signed-in admin's email, used as the default test address. */
  test_to: string;
  updated_at: string | null;
  updated_by_name: string;
}

/** A blank password keeps the one in use. */
export interface EmailSettingsForm {
  host: string;
  port: number;
  security: EmailSecurity;
  username: string;
  password: string;
  from_email: string;
}

export interface EmailTestResult {
  ok: boolean;
  ms: number;
  error: string | null;
}

/** GET/PUT /api/settings/organisation/: who emails, invoices and receipts come from. */
export interface OrganisationSettingsForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  pan_number: string;
  logo_url: string;
  receipt_note: string;
}

export interface OrganisationSettings extends OrganisationSettingsForm {
  updated_at: string | null;
  updated_by_name: string;
}
