import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/validators/rbac";
import { runFullSync, runModuleSync } from "@/lib/sync/engine";
import type { SyncModule } from "@/types/edmingle";
import { SYNC_MODULES } from "@/types/edmingle";

// POST /api/sync — trigger a full or module-specific sync
export async function POST(request: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (isAuthError(auth)) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as { module?: string };
    const requestedModule = body.module as SyncModule | undefined;

    if (requestedModule) {
      // Validate module name
      if (!SYNC_MODULES.includes(requestedModule)) {
        return NextResponse.json(
          {
            data: null,
            error: `Invalid module. Valid modules: ${SYNC_MODULES.join(", ")}`,
          },
          { status: 400 },
        );
      }

      const result = await runModuleSync(requestedModule, {
        syncType: "manual",
        triggeredBy: auth.user.id,
      });

      return NextResponse.json({ data: result, error: null });
    }

    // Full sync
    const results = await runFullSync({
      syncType: "manual",
      triggeredBy: auth.user.id,
    });

    const hasFailures = results.some((r) => r.status === "failed");
    const hasPartial = results.some((r) => r.status === "partial");

    return NextResponse.json({
      data: {
        results,
        overall_status: hasFailures ? "partial" : hasPartial ? "partial" : "completed",
        total_modules: results.length,
        completed: results.filter((r) => r.status === "completed").length,
        failed: results.filter((r) => r.status === "failed").length,
      },
      error: null,
    });
  } catch (error) {
    console.error("[API] POST /sync:", error);
    return NextResponse.json(
      { data: null, error: "Sync operation failed" },
      { status: 500 },
    );
  }
}

// GET /api/sync — get latest sync status for all modules
export async function GET() {
  const auth = await requireAuth(["admin"]);
  if (isAuthError(auth)) return auth.response;

  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("vw_sync_status")
      .select("*");

    if (error) throw error;

    return NextResponse.json({ data: data ?? [], error: null });
  } catch (error) {
    console.error("[API] GET /sync:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch sync status" },
      { status: 500 },
    );
  }
}
