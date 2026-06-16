import { courseRepository } from "@/lib/repositories/course.repository";
import type { CourseSummary, BatchSummary, PaginationParams } from "@/types";

// =============================================================================
// CourseService
// =============================================================================

export class CourseService {
  async listCourses(
    params: PaginationParams & { q?: string } = {},
  ): Promise<{ data: CourseSummary[]; total: number }> {
    return courseRepository.findAll(params);
  }

  async getCourse(id: string): Promise<CourseSummary | null> {
    return courseRepository.findById(id);
  }

  async getBatchesForCourse(
    courseId: string,
    params: PaginationParams & { status?: string } = {},
  ): Promise<{ data: BatchSummary[]; total: number }> {
    return courseRepository.findBatches(courseId, params);
  }
}

export const courseService = new CourseService();
