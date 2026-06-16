import { dashboardService } from "@/lib/services/dashboard.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userRepository } from "@/lib/repositories/user.repository";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

// =============================================================================
// Overview Dashboard Page (Server Component — fetches data, passes to client)
// =============================================================================

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await userRepository.findBySupabaseUid(user.id);
  if (!dbUser) redirect("/login");

  // Fetch overview data server-side for fast initial render
  let overview = null;
  try {
    overview = await dashboardService.getOverview();
  } catch {
    // Pass null — client component will show error state
  }

  return (
    <DashboardClient
      initialData={overview}
      userRole={dbUser.role}
      isAdmin={dbUser.role === "admin"}
    />
  );
}
