import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { SignInForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Welcome back" description="Sign in to see who your LinkedIn presence is reaching.">
      <SignInForm next={sp.next} callbackError={sp.error === "callback"} />
    </AuthShell>
  );
}
