"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  UserCheck,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

// =============================================================================
// Sidebar — role-filtered navigation
// =============================================================================

interface NavItem {
  label: string;
  href: "/dashboard" | "/courses" | "/students" | "/mentors";
  icon: React.ElementType;
  allowedRoles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "academic_team", "support_team"],
  },
  {
    label: "Courses",
    href: "/courses",
    icon: BookOpen,
    allowedRoles: ["admin", "academic_team", "support_team"],
  },
  {
    label: "Students",
    href: "/students",
    icon: Users,
    allowedRoles: ["admin", "academic_team", "support_team"],
  },
  {
    label: "Mentors",
    href: "/mentors",
    icon: UserCheck,
    allowedRoles: ["admin", "academic_team"],
  },
];

interface SidebarProps {
  userRole: UserRole;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(userRole),
  );

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const roleBadgeLabel: Record<UserRole, string> = {
    admin: "Admin",
    academic_team: "Academic",
    support_team: "Support",
  };

  return (
    <aside className="w-60 shrink-0 bg-slate-900 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">
            Academic Dashboard
          </p>
          <p className="text-slate-400 text-xs">Internal Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-700/50 space-y-1">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{userName}</p>
            <span className="inline-block text-xs text-blue-300 bg-blue-900/50 px-1.5 py-0.5 rounded mt-0.5">
              {roleBadgeLabel[userRole]}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                     text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
