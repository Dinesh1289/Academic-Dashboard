import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// BaseRepository — shared patterns for all repositories
// =============================================================================

export abstract class BaseRepository {
  protected get db(): SupabaseClient {
    return createSupabaseAdminClient();
  }

  protected handleError(error: { message: string } | null, context: string): never {
    throw new Error(`[${context}] ${error?.message ?? "Unknown database error"}`);
  }

  protected buildPagination(page: number = 1, perPage: number = 20) {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    return { from, to, perPage };
  }
}
