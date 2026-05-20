"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Search,
  Bell,
  BarChart2,
  Users,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/resume-versions", label: "Resumes", icon: FileText },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/search", label: "Search", icon: Search },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white h-screen sticky top-0 flex flex-col">
      <div className="px-4 py-5 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
            <Briefcase className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-base font-semibold text-neutral-900 tracking-tight">CareerOS</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-neutral-900 text-white font-medium"
                  : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-neutral-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-600">
            N
          </div>
          <span className="text-xs text-neutral-500 truncate">tiongMax</span>
        </div>
      </div>
    </aside>
  );
}
