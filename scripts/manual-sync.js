/**
 * Manual sync script — run via `npm run sync:manual`
 * Useful for testing the Edmingle sync engine locally without the UI.
 *
 * Usage:
 *   npm run sync:manual                 # full sync, all modules
 *   npm run sync:manual -- students     # sync only the students module
 */

require("dotenv").config({ path: ".env.local" });

async function main() {
  const moduleArg = process.argv[2];

  // Dynamic import since this is a CommonJS script calling TS/ESM modules
  const { runFullSync, runModuleSync } = await import("../src/lib/sync/engine.ts");

  if (moduleArg) {
    console.log(`Running manual sync for module: ${moduleArg}`);
    const result = await runModuleSync(moduleArg, { syncType: "manual" });
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("Running full manual sync (all modules)…");
    const results = await runFullSync({ syncType: "manual" });
    console.log(JSON.stringify(results, null, 2));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Sync script failed:", err);
  process.exit(1);
});
