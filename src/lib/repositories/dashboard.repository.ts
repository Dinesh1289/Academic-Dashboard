import { BaseRepository } from "./base";
import type { DashboardOverview, SyncStatusView } from "@/types";

// =============================================================================
// DashboardRepository — aggregates KPI data for the overview dashboard
// =============================================================================

export class DashboardRepository extends BaseRepository {
  async getOverview(): Promise<DashboardOverview> {
    const [
      coursesResult,
      batchesResult,
      studentsResult,
      mentorsResult,
      syncStatusResult,
    ] = await Promise.all([
      this.db.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true),
      this.db.from("batches").select("id", { count: "exact", head: true }).eq("status", "active"),
      this.db.from("students").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("status", "active"),
      this.db.from("mentors").select("id", { count: "exact", head: true }).eq("is_active", true),
      this.db.from("vw_sync_status").select("*"),
    ]);

    // Build sync status map
    const syncMap: Record<string, SyncStatusView | null> = {};
    const modules = ["courses", "batches", "students", "attendance", "assessments", "mentors", "feedback"];

    for (const moduleName of modules) {
      const found = (syncStatusResult.data ?? []).find((s) => s.module === moduleName);
      syncMap[moduleName] = found
        ? {
            module: found.module as string,
            status: found.status,
            started_at: found.started_at as string,
            completed_at: found.completed_at as string | null,
            records_upserted: found.records_upserted as number,
            error_message: found.error_message as string | null,
          }
        : null;
    }

    // Last sync time = most recent completed_at across all modules
    const completedSyncs = (syncStatusResult.data ?? [])
      .filter((s) => s.completed_at)
      .map((s) => s.completed_at as string)
      .sort()
      .reverse();

    return {
      total_courses: coursesResult.count ?? 0,
      total_active_batches: batchesResult.count ?? 0,
      total_students: studentsResult.count ?? 0,
      total_mentors: mentorsResult.count ?? 0,
      last_sync_time: completedSyncs[0] ?? null,
      sync_status: syncMap,
    };
  }
}

export const dashboardRepository = new DashboardRepository();
