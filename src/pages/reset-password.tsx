import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorMessage } from "@/lib/api";
import { authService } from "@/services/auth.service";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // A reset link without both params is invalid — send the user back to login.
  if (!uid || !token) return <Navigate to="/login" replace />;

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        const res = await authService.resetPassword({
          uid,
          token,
          new_password: newPassword,
          confirm_new_password: confirm,
        });
        toast.success(res.detail || "Password reset successfully.");
        navigate("/login", { replace: true });
      } catch (err) {
        toast.error(apiErrorMessage(err, "Could not reset password"));
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="bg-brand-container font-headline mx-auto mb-2 flex size-12 items-center justify-center rounded-xl text-lg font-bold text-white">
            SC
          </div>
          <CardTitle className="font-headline text-xl">Reset password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="np" required>New password</Label>
              <Input
                id="np"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp" required>Confirm new password</Label>
              <Input
                id="cp"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={busy}>
              {busy ? "Resetting…" : "Reset password"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" asChild>
              <Link to="/login">Back to sign in</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
