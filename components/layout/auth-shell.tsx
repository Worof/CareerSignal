import Link from "next/link";
import { Radar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { Alert } from "@/components/ui/misc";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 font-serif text-xl font-semibold">
        <Radar className="h-5 w-5 text-primary" aria-hidden /> CareerSignal
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {!getSupabaseEnv() ? (
            <Alert tone="warning" title="Backend not configured" className="mb-4">
              Set the Supabase environment variables to enable sign-in. See <code>.env.example</code>.
            </Alert>
          ) : null}
          {children}
        </CardContent>
      </Card>
    </main>
  );
}

