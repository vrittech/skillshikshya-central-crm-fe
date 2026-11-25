import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { systemSettingsService } from "@/services/system-settings.service";
import type { EmailSettingsForm, StorageSettingsForm } from "@/types/system-settings";

const STORAGE_KEY = ["settings", "storage"];
const EMAIL_KEY = ["settings", "email"];

export function useStorageSettings(enabled = true) {
  return useQuery({
    queryKey: STORAGE_KEY,
    queryFn: () => systemSettingsService.getStorage(),
    enabled,
  });
}

/** Field errors are left to the form; it shows them under each field. */
export function useSaveStorageSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StorageSettingsForm) => systemSettingsService.saveStorage(payload),
    onSuccess: (data) => {
      qc.setQueryData(STORAGE_KEY, data);
      toast.success("Cloud storage settings saved");
    },
  });
}

export function useTestStorage() {
  return useMutation({
    mutationFn: (payload: StorageSettingsForm) => systemSettingsService.testStorage(payload),
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't run the test")),
  });
}

export function useEmailSettings(enabled = true) {
  return useQuery({
    queryKey: EMAIL_KEY,
    queryFn: () => systemSettingsService.getEmail(),
    enabled,
  });
}

export function useSaveEmailSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmailSettingsForm) => systemSettingsService.saveEmail(payload),
    onSuccess: (data) => {
      qc.setQueryData(EMAIL_KEY, data);
      toast.success("Email settings saved");
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (payload: EmailSettingsForm & { to: string }) =>
      systemSettingsService.sendTestEmail(payload),
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't send the test email")),
  });
}
