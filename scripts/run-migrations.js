/**
 * Migration runner — applies SQL files in supabase/migrations/ in order.
 * Run via `npm run db:migrate`.
 *
 * Requires SUPABASE_DB_URL or uses the Supabase CLI under the hood.
 * For Sprint 1, the recommended approach is to use the Supabase CLI directly:
 *
 *   supabase link --project-ref <your-project-ref>
 *   supabase db push
 *
 * This script is a convenience wrapper for environments without the Supabase CLI.
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error("❌ SUPABASE_DB_URL is not set.");
    console.error("   Find this in Supabase Dashboard → Project Settings → Database → Connection String");
    console.error("   Alternatively, use the Supabase CLI: supabase db push");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log("📦 Connected to database. Running migrations…\n");

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`▶ Running ${file}…`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    try {
      await client.query(sql);
      console.log(`✓ ${file} applied successfully\n`);
    } catch (err) {
      console.error(`✗ ${file} failed:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  console.log("✅ All migrations applied successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Migration runner failed:", err);
  process.exit(1);
});
