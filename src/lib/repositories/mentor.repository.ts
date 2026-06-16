import { BaseRepository } from "./base";
import type { MentorListItem, PaginationParams } from "@/types";

// =============================================================================
// MentorRepository
// =============================================================================

export class MentorRepository extends BaseRepository {
  async findAll(
    params: PaginationParams & { q?: string } = {},
  ): Promise<{ data: MentorListItem[]; total: number }> {
    const { page = 1, perPage = 20, q } = params;
    const { from, to } = this.buildPagination(page, perPage);

    let query = this.db
      .from("mentors")
      .select(
        `
        id,
        full_name,
        email,
        is_active,
        batches(
          id,
          name,
          status,
          courses(name)
        )
      `,
        { count: "exact" },
      )
      .eq("is_active", true)
      .range(from, to)
      .order("full_name");

    if (q) {
      query = query.ilike("full_name", `%${q}%`);
    }

    const { data, error, count } = await query;
    if (error) this.handleError(error, "MentorRepository.findAll");

    const items: MentorListItem[] = (data ?? []).map((row) => {
      const batches = (row.batches ?? []) as Array<{
        id: string;
        name: string;
        status: string;
        courses: { name: string } | { name: string }[] | null;
      }>;

      const activeBatches = batches.filter((b) => b.status === "active");
      const courseNames = [
        ...new Set(
          activeBatches
            .map((b) => {
              const c = Array.isArray(b.courses) ? b.courses[0] : b.courses;
              return c?.name ?? null;
            })
            .filter(Boolean) as string[],
        ),
      ];

      return {
        id: row.id as string,
        full_name: row.full_name as string,
        email: (row.email as string | null) ?? null,
        is_active: row.is_active as boolean,
        courses_assigned: courseNames,
        batches_assigned: activeBatches.map((b) => b.name),
      };
    });

    return { data: items, total: count ?? 0 };
  }

  async findById(id: string) {
    const { data, error } = await this.db
      .from("mentors")
      .select(
        `
        *,
        batches(*, courses(*)),
        feedback(rating, comment, sentiment, submitted_at)
      `,
      )
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  }
}

export const mentorRepository = new MentorRepository();
