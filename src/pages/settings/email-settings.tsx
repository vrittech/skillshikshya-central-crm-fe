import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { useEmailSettings, useSaveEmailSettings, useSendTestEmail } from "@/hooks/use-system-settings";
import type { EmailSecurity, EmailSettings, EmailSettingsForm } from "@/types/system-settings";
import { FieldError, LastSaved, ResultLine, SourceBadge } from "./system-settings-parts";
import { SECRET_PLACEHOLDER, fieldErrorsOf } from "./system-settings-utils";

const SECURITY_OPTIONS: { value: EmailSecurity; label: string; port: number }[] = [
  { value: "starttls", label: "STARTTLS", port: 587 },
  { value: "ssl", label: "SSL", port: 465 },
  { value: "none", label: "None", port: 25 },
];
const STANDARD_PORTS = SECURITY_OPTIONS.map((o) => o.port);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "Name <a@b.com>" or "a@b.com". */
function validFrom(value: string) {
  const v = value.trim();
  const inBrackets = v.match(/<([^>]+)>\s*$/);
  return EMAIL.test(inBrackets ? inBrackets[1] : v);
}

/** SMTP server the CRM sends email through. */
export function EmailSettingsPanel() {
  const query = useEmailSettings();

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
  return <EmailForm key={query.data.updated_at ?? query.data.source} settings={query.data} />;
}

function EmailForm({ settings }: { settings: EmailSettings }) {
  const save = useSaveEmailSettings();
  const sendTest = useSendTestEmail();
  const [form, setForm] = useState<EmailSettingsForm>({
    host: settings.host,
    port: settings.port,
    security: settings.security,
    username: settings.username,
    password: "",
    from_email: settings.from_email,
  });
  const [to, setTo] = useState(settings.test_to);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof EmailSettingsForm>(key: K, value: EmailSettingsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    sendTest.reset();
  }

  function setSecurity(value: EmailSecurity) {
    const port = SECURITY_OPTIONS.find((o) => o.value === value)!.port;
    setForm((f) => ({ ...f, security: value, port: STANDARD_PORTS.includes(f.port) ? port : f.port }));
    setErrors((e) => ({ ...e, security: "", port: "" }));
    sendTest.reset();
  }

  function check(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.host.trim()) e.host = "Enter the SMTP server.";
    else if (/[\s/]/.test(form.host.trim())) e.host = "Enter a server name like smtp.gmail.com.";
    if (!Number.isInteger(form.port) || form.port < 1 || form.port > 65535) e.port = "Enter a port from 1 to 65535.";
    if (form.username.trim() && !form.password && !settings.password_set) e.password = "Enter the password.";
    if (!form.from_email.trim()) e.from_email = "Enter the From address.";
    else if (!validFrom(form.from_email)) e.from_email = "Enter an email address, like noreply@skillshikshya.com.";
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

  function onSendTest() {
    const e = check();
    if (!EMAIL.test(to.trim())) e.to = "Enter an email address.";
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast.error("Please fix the errors and try again.");
      return;
    }
    sendTest.mutate({ ...form, to: to.trim() });
  }

  const result = sendTest.data;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">SMTP</CardTitle>
        <SourceBadge source={settings.source} />
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} noValidate className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="smtp-host" required>
              SMTP server
            </Label>
            <Input
              id="smtp-host"
              autoComplete="off"
              spellCheck={false}
              placeholder="smtp.gmail.com"
              aria-invalid={!!errors.host}
              value={form.host}
              onChange={(e) => set("host", e.target.value)}
            />
            <FieldError text={errors.host} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="smtp-port" required>
                Port
              </Label>
              <Input
                id="smtp-port"
                type="number"
                inputMode="numeric"
                min={1}
                max={65535}
                aria-invalid={!!errors.port}
                value={Number.isNaN(form.port) ? "" : form.port}
                onChange={(e) => set("port", e.target.value === "" ? Number.NaN : Number(e.target.value))}
              />
              <FieldError text={errors.port} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-security" required>
                Security
              </Label>
              <Select value={form.security} onValueChange={(v) => setSecurity(v as EmailSecurity)}>
                <SelectTrigger id="smtp-security" aria-invalid={!!errors.security}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECURITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError text={errors.security} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="smtp-user">Username</Label>
              <Input
                id="smtp-user"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!errors.username}
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
              />
              <FieldError text={errors.username} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-pass">Password</Label>
              <Input
                id="smtp-pass"
                type="password"
                autoComplete="new-password"
                placeholder={settings.password_set ? SECRET_PLACEHOLDER : ""}
                aria-invalid={!!errors.password}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
              <FieldError text={errors.password} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-from" required>
              From address
            </Label>
            <Input
              id="smtp-from"
              autoComplete="off"
              spellCheck={false}
              placeholder="Skill Shikshya <noreply@skillshikshya.com>"
              aria-invalid={!!errors.from_email}
              value={form.from_email}
              onChange={(e) => set("from_email", e.target.value)}
            />
            <FieldError text={errors.from_email} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" variant="brand" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <div className="ml-auto">
              <LastSaved at={settings.updated_at} by={settings.updated_by_name} />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid min-w-[220px] flex-1 gap-2">
                <Label htmlFor="smtp-test-to">Send a test email to</Label>
                <Input
                  id="smtp-test-to"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.to}
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setErrors((er) => ({ ...er, to: "" }));
                    sendTest.reset();
                  }}
                />
              </div>
              <Button type="button" variant="outline" onClick={onSendTest} disabled={sendTest.isPending}>
                {sendTest.isPending ? "Sending…" : "Send test email"}
              </Button>
            </div>
            <FieldError text={errors.to} />
            {result && (
              <ResultLine ok={result.ok}>
                {result.ok ? `Sent to ${to.trim()}.` : result.error}
              </ResultLine>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
