import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" description="We'll email you a link to choose a new one.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
