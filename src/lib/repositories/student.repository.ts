import { BaseRepository } from "./base";
import type { StudentListItem, PaginationParams } from "@/types";

// =============================================================================
// StudentRepository
// =============================================================================

// Shape returned by the nested select() below — typed explicitly since we
// don't have generated Supabase types in Sprint 1 (no live project at build time).
interface StudentJoinRow {
  id: string;
  student_name: string;
  email: string;
  contact_number: string | null;
  status: string;
  enrollments:
    | {
        batch_id: string;
        status: string;
        batches: {
          name: string;
          courses: { name: string } | { name: string }[] | null;
        } | null;
      }[]
    | {
        batch_id: string;
        status: string;
        batches: {
          name: string;
          courses: { name: string } | { name: string }[] | null;
        } | null;
      }
    | null;
}

export class StudentRepository extends BaseRepository {
  async findAll(
    params: PaginationParams & { q?: string; batchId?: string; courseId?: string } = {},
  ): Promise<{ data: StudentListItem[]; total: number }> {
    const { page = 1, perPage = 20, q, batchId, courseId } = params;
    const { from, to } = this.buildPagination(page, perPage);

    // Join students with their active enrollment → batch → course
    let query = this.db
      .from("students")
      .select(
        `
        id,
        student_name,
        email,
        contact_number,
        status,
        enrollments!inner(
          batch_id,
          status,
          batches!inner(
            name,
            courses!inner(name)
          )
        )
      `,
        { count: "exact" },
      )
      .eq("is_deleted", false)
      .eq("enrollments.status", "active")
      .range(from, to)
      .order("student_name");

    if (q) {
      query = query.or(`student_name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    if (batchId) {
      query = query.eq("enrollments.batch_id", batchId);
    }

    if (courseId) {
      query = query.eq("enrollments.batches.course_id", courseId);
    }

    const { data, error, count } = await query;
    if (error) this.handleError(error, "StudentRepository.findAll");

    const rows = (data ?? []) as unknown as StudentJoinRow[];

    const items: StudentListItem[] = rows.map((row) => {
      const enrollment = Array.isArray(row.enrollments)
        ? row.enrollments[0]
        : row.enrollments;
      const batch = enrollment?.batches ?? null;
      const course = batch
        ? Array.isArray(batch.courses)
          ? batch.courses[0]
          : batch.courses
        : null;

      return {
        id: row.id,
        student_name: row.student_name,
        email: row.email,
        contact_number: row.contact_number,
        status: row.status,
        current_batch_name: batch?.name ?? null,
        current_course_name: course?.name ?? null,
      };
    });

    return { data: items, total: count ?? 0 };
  }

  async findById(id: string) {
    const { data, error } = await this.db
      .from("students")
      .select(
        `
        *,
        enrollments(
          *,
          batches(*, courses(*), mentors(*))
        )
      `,
      )
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error) return null;
    return data;
  }
}

export const studentRepository = new StudentRepository();
