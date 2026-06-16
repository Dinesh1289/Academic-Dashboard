import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/validators/env";

// ─── Admin client with service role — bypasses RLS ────────────────────────
// Use ONLY in API routes and server-side sync operations.
// Never expose to the browser.
//
// NOTE: We don't generate strict Supabase types from the live schema in
// Sprint 1 (no `supabase gen types` step wired into CI yet). Using the
// client without a Database generic causes some chained .insert()/.upsert()
// calls to infer as `never` on certain TS/lib combinations. We explicitly
// type the client as SupabaseClient (untyped schema = `any` row shapes)
// so application code controls the shape via our own repository types
// instead of relying on (currently absent) generated types.

let adminClient: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  adminClient = createClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return adminClient;
}
