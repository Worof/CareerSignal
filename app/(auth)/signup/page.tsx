import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { SignUpForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthShell title="Create your account" description="Measure the opportunities behind your visibility.">
      <SignUpForm />
    </AuthShell>
  );
}
