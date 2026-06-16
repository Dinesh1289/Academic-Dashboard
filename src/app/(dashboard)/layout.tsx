import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userRepository } from "@/lib/repositories/user.repository";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

// =============================================================================
// Authenticated dashboard layout — wraps all /dashboard/* routes
// =============================================================================

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await userRepository.findBySupabaseUid(user.id);
  if (!dbUser) redirect("/login");

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar userRole={dbUser.role} userName={dbUser.full_name} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header userName={dbUser.full_name} userRole={dbUser.role} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
