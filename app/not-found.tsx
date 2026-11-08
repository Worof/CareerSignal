import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">That page doesn’t exist, or it isn’t yours to see.</p>
      <Link href="/dashboard" className={buttonVariants()}>Go to dashboard</Link>
    </main>
  );
}
