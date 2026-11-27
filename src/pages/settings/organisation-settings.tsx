import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/lib/api";
import { useOrganisationSettings, useSaveOrganisationSettings } from "@/hooks/use-system-settings";
import type { OrganisationSettings, OrganisationSettingsForm } from "@/types/system-settings";
import { FieldError, LastSaved } from "./system-settings-parts";
import { fieldErrorsOf } from "./system-settings-utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Who the emails, invoices and receipts come from. */
export function OrganisationSettingsPanel() {
  const query = useOrganisationSettings();

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
  return <OrganisationForm key={query.data.updated_at ?? "default"} settings={query.data} />;
}

function OrganisationForm({ settings }: { settings: OrganisationSettings }) {
  const save = useSaveOrganisationSettings();
  const [form, setForm] = useState<OrganisationSettingsForm>({
    name: settings.name,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    website: settings.website,
    pan_number: settings.pan_number,
    logo_url: settings.logo_url,
    receipt_note: settings.receipt_note,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof OrganisationSettingsForm>(key: K, value: OrganisationSettingsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function onSave(event: React.FormEvent) {
    event.preventDefault();
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Enter the organisation name.";
    if (form.email.trim() && !EMAIL.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (form.logo_url.trim() && !/^https?:\/\/\S+$/.test(form.logo_url.trim()))
      e.logo_url = "Enter a full address starting with https://";
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

  const text = (key: keyof OrganisationSettingsForm, label: string, extra?: { required?: boolean; type?: string }) => (
    <div className="grid gap-2">
      <Label htmlFor={`org-${key}`} required={extra?.required}>
        {label}
      </Label>
      <Input
        id={`org-${key}`}
        type={extra?.type ?? "text"}
        aria-invalid={!!errors[key]}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      <FieldError text={errors[key]} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organisation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} noValidate className="space-y-4">
          {text("name", "Name", { required: true })}
          {text("address", "Address")}
          <div className="grid gap-4 sm:grid-cols-2">
            {text("phone", "Phone")}
            {text("email", "Email", { type: "email" })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("website", "Website")}
            {text("pan_number", "PAN/VAT number")}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            {text("logo_url", "Logo URL", { type: "url" })}
            {form.logo_url && /^https?:\/\//.test(form.logo_url) && (
              <img src={form.logo_url} alt="" className="mb-[1px] h-9 max-w-40 rounded border bg-white object-contain p-1" />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-receipt_note">Receipt note</Label>
            <Textarea
              id="org-receipt_note"
              rows={2}
              value={form.receipt_note}
              onChange={(e) => set("receipt_note", e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" variant="brand" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <div className="ml-auto">
              <LastSaved at={settings.updated_at} by={settings.updated_by_name} />
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
