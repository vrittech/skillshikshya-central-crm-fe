import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { useSaveStorageSettings, useStorageSettings, useTestStorage } from "@/hooks/use-system-settings";
import type { StorageSettings, StorageSettingsForm } from "@/types/system-settings";
import { FieldError, LastSaved, ResultLine, SourceBadge } from "./system-settings-parts";
import { SECRET_PLACEHOLDER, fieldErrorsOf } from "./system-settings-utils";

const ACCOUNT_ID = /^[0-9a-fA-F]{32}$/;
const BUCKET_NAME = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

/** Cloudflare R2: where voice notes and uploaded files are kept. */
export function StorageSettingsPanel() {
  const query = useStorageSettings();

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </CardContent>
      </Card>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-destructive text-sm">{apiErrorMessage(query.error, "Couldn't load these settings.")}</p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  // Re-mount the form after each save so it shows what was saved.
  return <StorageForm key={query.data.updated_at ?? query.data.source} settings={query.data} />;
}

function StorageForm({ settings }: { settings: StorageSettings }) {
  const save = useSaveStorageSettings();
  const test = useTestStorage();
  const [form, setForm] = useState<StorageSettingsForm>({
    account_id: settings.account_id,
    access_key_id: settings.access_key_id,
    secret_access_key: "",
    bucket_name: settings.bucket_name,
    public_url: settings.public_url,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof StorageSettingsForm>(key: K, value: StorageSettingsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    test.reset();
  }

  function check(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.account_id.trim()) e.account_id = "Enter the account ID.";
    else if (!ACCOUNT_ID.test(form.account_id.trim()))
      e.account_id = "Enter the 32-character account ID from Cloudflare.";
    if (!form.access_key_id.trim()) e.access_key_id = "Enter the access key ID.";
    if (!form.secret_access_key && !settings.secret_access_key_set)
      e.secret_access_key = "Enter the secret access key.";
    if (!form.bucket_name.trim()) e.bucket_name = "Enter the bucket name.";
    else if (!BUCKET_NAME.test(form.bucket_name.trim()))
      e.bucket_name = "Use 3–63 lowercase letters, numbers and hyphens.";
    if (form.public_url.trim() && !/^https?:\/\/\S+$/.test(form.public_url.trim()))
      e.public_url = "Enter a full address starting with https://";
    return e;
  }

  function onSave(event: React.FormEvent) {
    event.preventDefault();
    const e = check();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast.error("Please fix the errors and try again.");
      return;
    }
    save.mutate(form, {
      onError: (err) => {
        const fields = fieldErrorsOf(err);
        if (Object.keys(fields).length) {
          setErrors(fields);
          toast.error("Please fix the errors and try again.");
        } else {
          toast.error(apiErrorMessage(err, "Couldn't save the settings"));
        }
      },
    });
  }

  function onTest() {
    const e = check();
    delete e.public_url;
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast.error("Please fix the errors and try again.");
      return;
    }
    test.mutate(form);
  }

  const result = test.data;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Cloudflare R2</CardTitle>
        <SourceBadge source={settings.source} />
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} noValidate className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="r2-account" required>
              Account ID
            </Label>
            <Input
              id="r2-account"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!errors.account_id}
              value={form.account_id}
              onChange={(e) => set("account_id", e.target.value)}
            />
            <FieldError text={errors.account_id} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="r2-key" required>
                Access key ID
              </Label>
              <Input
                id="r2-key"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!errors.access_key_id}
                value={form.access_key_id}
                onChange={(e) => set("access_key_id", e.target.value)}
              />
              <FieldError text={errors.access_key_id} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r2-secret" required={!settings.secret_access_key_set}>
                Secret access key
              </Label>
              <Input
                id="r2-secret"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                placeholder={settings.secret_access_key_set ? SECRET_PLACEHOLDER : ""}
                aria-invalid={!!errors.secret_access_key}
                value={form.secret_access_key}
                onChange={(e) => set("secret_access_key", e.target.value)}
              />
              <FieldError text={errors.secret_access_key} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="r2-bucket" required>
                Bucket name
              </Label>
              <Input
                id="r2-bucket"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!errors.bucket_name}
                value={form.bucket_name}
                onChange={(e) => set("bucket_name", e.target.value)}
              />
              <FieldError text={errors.bucket_name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r2-public">Public URL</Label>
              <Input
                id="r2-public"
                type="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://"
                aria-invalid={!!errors.public_url}
                value={form.public_url}
                onChange={(e) => set("public_url", e.target.value)}
              />
              <FieldError text={errors.public_url} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" variant="brand" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={onTest} disabled={test.isPending}>
              {test.isPending ? "Testing…" : "Test connection"}
            </Button>
            <div className="ml-auto">
              <LastSaved at={settings.updated_at} by={settings.updated_by_name} />
            </div>
          </div>

          {result && (
            <div className="space-y-2">
              <ul className="divide-y rounded-lg border text-sm">
                {result.steps.map((s) => (
                  <li key={s.name} className="flex items-start gap-2 px-3 py-2">
                    {s.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p>{s.name}</p>
                      {s.error && <p className="text-destructive text-xs break-words">{s.error}</p>}
                    </div>
                    <span className="text-muted-foreground text-xs tabular-nums">{s.ms} ms</span>
                  </li>
                ))}
              </ul>
              <ResultLine ok={result.ok}>
                {result.ok ? "Cloudflare R2 works." : "Cloudflare R2 test failed."}
              </ResultLine>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
