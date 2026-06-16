import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/validators/rbac";
import { dashboardService } from "@/lib/services/dashboard.service";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.response;

  try {
    const data = await dashboardService.getOverview();
    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("[API] GET /dashboard/overview:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch dashboard overview" },
      { status: 500 },
    );
  }
}
