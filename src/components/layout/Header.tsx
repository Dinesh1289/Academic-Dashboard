"use client";

import { usePathname } from "next/navigation";
import type { UserRole } from "@/types";

// =============================================================================
// Header — page title + sync status indicator
// =============================================================================

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/courses": "Courses",
  "/students": "Students",
  "/mentors": "Mentors",
};

interface HeaderProps {
  userName: string;
  userRole: UserRole;
}

export function Header({ userName }: HeaderProps) {
  const pathname = usePathname();

  const title =
    Object.entries(PAGE_TITLES).find(([path]) =>
      path === "/dashboard" ? pathname === path : pathname.startsWith(path),
    )?.[1] ?? "Dashboard";

  return (
    <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="hidden sm:block">
          Welcome, <span className="text-slate-700 font-medium">{userName}</span>
        </span>
      </div>
    </header>
  );
}
