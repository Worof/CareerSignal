import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" description="Use at least 8 characters.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
