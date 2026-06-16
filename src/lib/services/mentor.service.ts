import { mentorRepository } from "@/lib/repositories/mentor.repository";
import type { MentorListItem, PaginationParams } from "@/types";

// =============================================================================
// MentorService
// =============================================================================

export class MentorService {
  async listMentors(
    params: PaginationParams & { q?: string } = {},
  ): Promise<{ data: MentorListItem[]; total: number }> {
    return mentorRepository.findAll(params);
  }

  async getMentor(id: string) {
    const mentor = await mentorRepository.findById(id);
    if (!mentor) return null;

    // Compute feedback summary
    const feedbackItems = (mentor.feedback ?? []) as Array<{
      rating: number;
      comment: string | null;
      sentiment: string | null;
      submitted_at: string;
    }>;

    const totalFeedback = feedbackItems.length;
    const avgRating =
      totalFeedback > 0
        ? feedbackItems.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
        : null;

    const sentimentCounts = feedbackItems.reduce(
      (acc, f) => {
        const s = f.sentiment ?? "neutral";
        acc[s as keyof typeof acc] = (acc[s as keyof typeof acc] ?? 0) + 1;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 },
    );

    return {
      ...mentor,
      feedback_summary: {
        total_count: totalFeedback,
        avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        positive_count: sentimentCounts.positive,
        neutral_count: sentimentCounts.neutral,
        negative_count: sentimentCounts.negative,
        positive_pct:
          totalFeedback > 0
            ? Math.round((sentimentCounts.positive / totalFeedback) * 100)
            : 0,
      },
    };
  }
}

export const mentorService = new MentorService();
