"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Bell,
  BarChart2,
  Users,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/resume-versions", label: "Resumes", icon: FileText },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
        <Brand />
        <Navigation pathname={pathname} />
        <UserSummary />
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur md:hidden">
        <Brand compact />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-neutral-950/30 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside
            id="mobile-navigation"
            className="relative flex h-full w-[min(20rem,88vw)] flex-col border-r border-neutral-200 bg-white shadow-2xl"
            aria-label="Main navigation"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pr-3">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Navigation
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <UserSummary />
          </aside>
        </div>
      )}
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn("flex items-center gap-2.5", compact ? "" : "px-4 py-5")}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 shadow-sm">
        <Briefcase className="h-4 w-4 text-white" />
      </div>
      <span className="text-base font-semibold tracking-tight text-neutral-900">
        CareerOS
      </span>
    </div>
  );
}

function Navigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
      aria-label="Main"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2",
              active
                ? "bg-neutral-900 font-medium text-white shadow-sm"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserSummary() {
  return (
    <div className="border-t border-neutral-100 px-4 py-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
          N
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-neutral-700">
            tiongMax
          </p>
          <p className="text-[11px] text-neutral-400">Personal workspace</p>
        </div>
      </div>
    </div>
  );
}
