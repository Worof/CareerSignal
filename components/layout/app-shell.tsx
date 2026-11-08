"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, LogOut, Menu, Radar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "./nav";

export interface Notice {
  id: string;
  text: string;
  href: string;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children, name, email, avatarUrl, notices, signOut,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
  avatarUrl: string | null;
  notices: Notice[];
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const initials = (name || email).split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r bg-card p-4 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 pt-1 font-serif text-xl font-semibold">
          <Radar className="h-5 w-5 text-primary" aria-hidden /> CareerSignal
        </Link>
        <NavLinks />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-slate-900/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 max-w-[85%] bg-card p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-serif text-lg font-semibold">CareerSignal</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-4 w-4" /></Button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
          <div className="ml-auto flex items-center gap-1">
            <details className="relative">
              <summary className="relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md hover:bg-muted [&::-webkit-details-marker]:hidden" aria-label={`Notifications (${notices.length})`}>
                <Bell className="h-4 w-4" aria-hidden />
                {notices.length > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-negative" /> : null}
              </summary>
              <div className="absolute right-0 top-11 z-40 w-72 rounded-lg border bg-card p-2 shadow-lg">
                {notices.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">You’re all caught up.</p>
                ) : (
                  <ul>{notices.map((n) => (
                    <li key={n.id}><Link href={n.href} className="block rounded-md p-3 text-sm hover:bg-muted">{n.text}</Link></li>
                  ))}</ul>
                )}
              </div>
            </details>

            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 hover:bg-muted [&::-webkit-details-marker]:hidden" aria-label="Account menu">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials}</span>
                )}
                <span className="hidden max-w-[10rem] truncate text-sm sm:block">{name || email}</span>
              </summary>
              <div className="absolute right-0 top-11 z-40 w-56 rounded-lg border bg-card p-2 shadow-lg">
                <p className="truncate px-3 py-2 text-xs text-muted-foreground">{email}</p>
                <Link href="/settings" className="block rounded-md px-3 py-2 text-sm hover:bg-muted">Settings</Link>
                <form action={signOut}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"><LogOut className="h-4 w-4" aria-hidden /> Sign out</button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
