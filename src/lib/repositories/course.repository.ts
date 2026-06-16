import { BaseRepository } from "./base";
import type { CourseSummary, BatchSummary, PaginationParams } from "@/types";

// =============================================================================
// CourseRepository
// =============================================================================

export class CourseRepository extends BaseRepository {
  async findAll(params: PaginationParams & { q?: string } = {}): Promise<{
    data: CourseSummary[];
    total: number;
  }> {
    const { page = 1, perPage = 20, q } = params;
    const { from, to } = this.buildPagination(page, perPage);

    let query = this.db
      .from("vw_course_summary")
      .select("*", { count: "exact" })
      .range(from, to)
      .order("name");

    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    const { data, error, count } = await query;
    if (error) this.handleError(error, "CourseRepository.findAll");

    return { data: (data ?? []) as CourseSummary[], total: count ?? 0 };
  }

  async findById(id: string): Promise<CourseSummary | null> {
    const { data, error } = await this.db
      .from("vw_course_summary")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as CourseSummary;
  }

  async findBatches(
    courseId: string,
    params: PaginationParams & { status?: string } = {},
  ): Promise<{ data: BatchSummary[]; total: number }> {
    const { page = 1, perPage = 20, status } = params;
    const { from, to } = this.buildPagination(page, perPage);

    let query = this.db
      .from("vw_batch_summary")
      .select("*", { count: "exact" })
      .eq("course_id", courseId)
      .range(from, to)
      .order("name");

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;
    if (error) this.handleError(error, "CourseRepository.findBatches");

    return { data: (data ?? []) as BatchSummary[], total: count ?? 0 };
  }
}

export const courseRepository = new CourseRepository();
