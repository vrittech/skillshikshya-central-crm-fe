import { api } from "@/lib/api";
import type {
  EmailSettings,
  EmailSettingsForm,
  EmailTestResult,
  StorageSettings,
  StorageSettingsForm,
  StorageTestResult,
} from "@/types/system-settings";

/** Cloud storage (R2) and Email (SMTP) settings — admin only (`is_staff`). */
export const systemSettingsService = {
  async getStorage() {
    const { data } = await api.get<StorageSettings>("/settings/storage/");
    return data;
  },

  async saveStorage(payload: StorageSettingsForm) {
    const { data } = await api.put<StorageSettings>("/settings/storage/", payload);
    return data;
  },

  /** Uploads a 1 KB file with the form values (unsaved is fine), reads it back and deletes it. */
  async testStorage(payload: StorageSettingsForm) {
    const { data } = await api.post<StorageTestResult>("/settings/storage/test/", payload, {
      timeout: 120_000,
    });
    return data;
  },

  async getEmail() {
    const { data } = await api.get<EmailSettings>("/settings/email/");
    return data;
  },

  async saveEmail(payload: EmailSettingsForm) {
    const { data } = await api.put<EmailSettings>("/settings/email/", payload);
    return data;
  },

  /** Sends one test email with the form values (unsaved is fine). */
  async sendTestEmail(payload: EmailSettingsForm & { to: string }) {
    const { data } = await api.post<EmailTestResult>("/settings/email/test/", payload, {
      timeout: 60_000,
    });
    return data;
  },
};
