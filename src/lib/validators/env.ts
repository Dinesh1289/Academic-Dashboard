import { z } from "zod";

// ─── Server-side env schema ────────────────────────────────────────────────
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  EDMINGLE_API_KEY: z.string().min(1, "EDMINGLE_API_KEY is required"),
  EDMINGLE_ORG_ID: z.string().min(1, "EDMINGLE_ORG_ID is required"),
  EDMINGLE_BASE_URL: z.string().url("EDMINGLE_BASE_URL must be a valid URL"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// ─── Client-side env schema ────────────────────────────────────────────────
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// ─── Validate and export ───────────────────────────────────────────────────
function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    parsed.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    });
    throw new Error("Invalid environment variables. Check your .env file.");
  }
  return parsed.data;
}

function validateClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    console.error("❌ Invalid client environment variables:");
    parsed.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    });
    throw new Error("Invalid client environment variables.");
  }
  return parsed.data;
}

// Only validate server env on the server
export const serverEnv =
  typeof window === "undefined" ? validateServerEnv() : ({} as ReturnType<typeof validateServerEnv>);

export const clientEnv = validateClientEnv();
