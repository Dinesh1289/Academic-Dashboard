"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  Users,
  UserCheck,
  GraduationCap,
  RefreshCw,
  Activity,
} from "lucide-react";
import type { DashboardOverview, UserRole } from "@/types";
import { KPICard, SyncStatusBadge, ErrorState } from "@/components/shared";

// =============================================================================
// DashboardClient — KPI cards + sync controls
// =============================================================================

interface DashboardClientProps {
  initialData: DashboardOverview | null;
  userRole: UserRole;
  isAdmin: boolean;
}

export function DashboardClient({ initialData, isAdmin }: DashboardClientProps) {
  const [data, setData] = useState<DashboardOverview | null>(initialData);
  const [error, setError] = useState<string | null>(initialData ? null : "Failed to load dashboard data");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ─── Refresh data ──────────────────────────────────────────────────────
  async function refreshData() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/dashboard/overview");
        const json = (await res.json()) as { data: DashboardOverview | null; error: string | null };
        if (json.error) throw new Error(json.error);
        setData(json.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to refresh");
      }
    });
  }

  // ─── Trigger manual sync ───────────────────────────────────────────────
  async function triggerSync() {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      await refreshData();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }

  const isLoading = isPending;
  const overallSyncStatus = data
    ? (Object.values(data.sync_status).some((s) => s?.status === "failed")
        ? "failed"
        : Object.values(data.sync_status).some((s) => s?.status === "running")
          ? "running"
          : "completed") as "failed" | "running" | "completed"
    : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Performance summary across all courses and batches
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sync status */}
          {data && (
            <SyncStatusBadge
              status={overallSyncStatus}
              lastSyncTime={data.last_sync_time}
            />
          )}

          {/* Refresh button */}
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600
                       border border-slate-200 rounded-lg bg-white hover:bg-slate-50
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>

          {/* Manual sync — admin only */}
          {isAdmin && (
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white
                         bg-blue-600 hover:bg-blue-700 rounded-lg
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Activity size={15} className={isSyncing ? "animate-pulse" : ""} />
              {isSyncing ? "Syncing…" : "Sync Now"}
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={refreshData} />}

      {/* KPI Cards */}
      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Courses"
            value={data?.total_courses ?? 0}
            icon={BookOpen}
            iconColor="text-blue-600"
            isLoading={isLoading && !data}
            subtitle="Active courses"
          />
          <KPICard
            title="Active Batches"
            value={data?.total_active_batches ?? 0}
            icon={GraduationCap}
            iconColor="text-violet-600"
            isLoading={isLoading && !data}
            subtitle="Currently running"
          />
          <KPICard
            title="Total Students"
            value={(data?.total_students ?? 0).toLocaleString()}
            icon={Users}
            iconColor="text-emerald-600"
            isLoading={isLoading && !data}
            subtitle="Enrolled and active"
          />
          <KPICard
            title="Total Mentors"
            value={data?.total_mentors ?? 0}
            icon={UserCheck}
            iconColor="text-amber-600"
            isLoading={isLoading && !data}
            subtitle="Active mentors"
          />
        </div>
      )}

      {/* Sync Status Grid — admin only */}
      {isAdmin && data && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Edmingle Sync Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(data.sync_status).map(([module, status]) => (
              <div
                key={module}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span className="text-xs font-medium text-slate-600 capitalize">
                  {module}
                </span>
                <SyncStatusBadge
                  status={status?.status ?? null}
                  lastSyncTime={status?.completed_at}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
