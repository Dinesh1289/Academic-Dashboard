"use client";

import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/validators/env";

// ─── Singleton browser client ──────────────────────────────────────────────
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (client) return client;
  client = createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return client;
}
