import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import type { DashboardOverview } from "@/types";

// =============================================================================
// DashboardService — business logic for the overview dashboard
// =============================================================================

export class DashboardService {
  async getOverview(): Promise<DashboardOverview> {
    return dashboardRepository.getOverview();
  }
}

export const dashboardService = new DashboardService();
