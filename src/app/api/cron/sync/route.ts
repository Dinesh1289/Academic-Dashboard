import { NextRequest, NextResponse } from "next/server";
import { runFullSync } from "@/lib/sync/engine";

// =============================================================================
// Nightly cron endpoint
// Called by Vercel Cron (configured in vercel.json) or external scheduler.
// Protected by CRON_SECRET header.
// =============================================================================

export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Starting nightly full sync…");

  try {
    const results = await runFullSync({ syncType: "delta" });

    const summary = {
      total: results.length,
      completed: results.filter((r) => r.status === "completed").length,
      partial: results.filter((r) => r.status === "partial").length,
      failed: results.filter((r) => r.status === "failed").length,
      total_records_upserted: results.reduce((sum, r) => sum + r.records_upserted, 0),
    };

    console.log("[Cron] Nightly sync complete:", summary);
    return NextResponse.json({ data: summary, error: null });
  } catch (error) {
    console.error("[Cron] Nightly sync failed:", error);
    return NextResponse.json(
      { data: null, error: "Cron sync failed" },
      { status: 500 },
    );
  }
}
