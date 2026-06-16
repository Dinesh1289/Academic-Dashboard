import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEdmingleClient } from "@/lib/edmingle/client";
import {
  mapCourse, mapMentor, mapBatch, mapStudent,
  mapEnrollment, mapAttendance, mapAssessment, mapFeedback,
} from "@/lib/edmingle/mapper";
import type { SyncModule } from "@/types/edmingle";

// =============================================================================
// SyncEngine — orchestrates delta sync for all Edmingle modules
// =============================================================================

const UPSERT_BATCH_SIZE = 100;

interface SyncResult {
  module: SyncModule;
  status: "completed" | "failed" | "partial";
  records_fetched: number;
  records_upserted: number;
  records_failed: number;
  error_message: string | null;
  cursor_value: string | null;
}

// ─── ID resolution maps ────────────────────────────────────────────────────
async function buildIdMap(
  table: string,
  edmingleCol: string,
): Promise<Map<string, string>> {
  const supabase = createSupabaseAdminClient();
  // Dynamic column name in select() defeats Supabase's literal-string type
  // parser (it expects a compile-time constant query string). We select "*"
  // and narrow at runtime instead — the row shape is validated by our own
  // repository/service layer, not by Supabase's generated types (none exist
  // in Sprint 1 without a `supabase gen types` step).
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .not(edmingleCol, "is", null);

  if (error) throw new Error(`Failed to build ID map for ${table}: ${error.message}`);

  const rows = (data ?? []) as Record<string, unknown>[];
  const map = new Map<string, string>();
  for (const row of rows) {
    const key = row[edmingleCol];
    const id = row.id;
    if (typeof key === "string" && typeof id === "string") {
      map.set(key, id);
    }
  }
  return map;
}

// ─── Get cursor for delta sync ─────────────────────────────────────────────
async function getLastCursor(module: SyncModule): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("sync_logs")
    .select("cursor_value")
    .eq("module", module)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  return data?.cursor_value ?? null;
}

// ─── Create sync log entry ─────────────────────────────────────────────────
async function createSyncLog(
  module: SyncModule,
  syncType: "delta" | "full" | "manual",
  triggeredBy?: string,
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_logs")
    .insert({
      module,
      sync_type: syncType,
      status: "running",
      triggered_by: triggeredBy ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create sync log: ${error.message}`);
  const row = data as { id: string } | null;
  if (!row) throw new Error("Failed to create sync log: no row returned");
  return row.id;
}

// ─── Update sync log ───────────────────────────────────────────────────────
async function updateSyncLog(
  logId: string,
  result: Partial<SyncResult> & { status: string },
) {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("sync_logs")
    .update({
      status: result.status,
      completed_at: new Date().toISOString(),
      records_fetched: result.records_fetched ?? 0,
      records_upserted: result.records_upserted ?? 0,
      records_failed: result.records_failed ?? 0,
      error_message: result.error_message ?? null,
      cursor_value: result.cursor_value ?? null,
    })
    .eq("id", logId);
}

// ─── Generic upsert helper ─────────────────────────────────────────────────
async function upsertBatch(
  table: string,
  records: Record<string, unknown>[],
  conflictColumn: string,
): Promise<{ upserted: number; failed: number }> {
  const supabase = createSupabaseAdminClient();
  let upserted = 0;
  let failed = 0;

  // Process in batches of UPSERT_BATCH_SIZE
  for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
    const chunk = records.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, {
        onConflict: conflictColumn,
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`[Sync] Upsert error on ${table}: ${error.message}`);
      failed += chunk.length;
    } else {
      upserted += chunk.length;
    }
  }

  return { upserted, failed };
}

// =============================================================================
// Module sync functions
// =============================================================================

async function syncCourses(cursor: string | null): Promise<Omit<SyncResult, "module">> {
  const client = getEdmingleClient();
  const records: ReturnType<typeof mapCourse>[] = [];
  let fetched = 0;

  for await (const page of client.getCourses(cursor ?? undefined)) {
    fetched += page.length;
    records.push(...page.map(mapCourse));
  }

  const { upserted, failed } = await upsertBatch("courses", records, "edmingle_course_id");
  const cursorValue = new Date().toISOString();

  return {
    status: failed > 0 ? "partial" : "completed",
    records_fetched: fetched,
    records_upserted: upserted,
    records_failed: failed,
    error_message: failed > 0 ? `${failed} records failed to upsert` : null,
    cursor_value: cursorValue,
  };
}

async function syncMentors(cursor: string | null): Promise<Omit<SyncResult, "module">> {
  const client = getEdmingleClient();
  const records: ReturnType<typeof mapMentor>[] = [];
  let fetched = 0;

  for await (const page of client.getMentors(cursor ?? undefined)) {
    fetched += page.length;
    records.push(...page.map(mapMentor));
  }

  const { upserted, failed } = await upsertBatch("mentors", records, "edmingle_mentor_id");

  return {
    status: failed > 0 ? "partial" : "completed",
    records_fetched: fetched,
    records_upserted: upserted,
    records_failed: failed,
    error_message: failed > 0 ? `${failed} records failed` : null,
    cursor_value: new Date().toISOString(),
  };
}

async function syncBatches(cursor: string | null): Promise<Omit<SyncResult, "module">> {
  const client = getEdmingleClient();
  const courseIdMap = await buildIdMap("courses", "edmingle_course_id");
  const mentorIdMap = await buildIdMap("mentors", "edmingle_mentor_id");

  const records: Record<string, unknown>[] = [];
  let fetched = 0;

  for await (const page of client.getBatches(cursor ?? undefined)) {
    fetched += page.length;
    for (const raw of page) {
      try {
        const mapped = mapBatch(raw, courseIdMap);
        const { _edmingle_mentor_id, ...batchData } = mapped;
        const mentorId = _edmingle_mentor_id
          ? (mentorIdMap.get(_edmingle_mentor_id) ?? null)
          : null;
        records.push({ ...batchData, mentor_id: mentorId });
      } catch (err) {
        console.warn(`[Sync] Skipping batch: ${(err as Error).message}`);
      }
    }
  }

  const { upserted, failed } = await upsertBatch("batches", records, "edmingle_batch_id");

  return {
    status: failed > 0 ? "partial" : "completed",
    records_fetched: fetched,
    records_upserted: upserted,
    records_failed: failed,
    error_message: null,
    cursor_value: new Date().toISOString(),
  };
}

async function syncStudents(cursor: string | null): Promise<Omit<SyncResult, "module">> {
  const client = getEdmingleClient();
  const records: ReturnType<typeof mapStudent>[] = [];
  let fetched = 0;

  for await (const page of client.getStudents(cursor ?? undefined)) {
    fetched += page.length;
    records.push(...page.map(mapStudent));
  }

  const { upserted, failed } = await upsertBatch("students", records, "edmingle_user_id");

  return {
    status: failed > 0 ? "partial" : "completed",
    records_fetched: fetched,
    records_upserted: upserted,
    records_failed: failed,
    error_message: null,
    cursor_value: new Date().toISOString(),
  };
}

async function syncEnrollments(cursor: string | null): Promise<Omit<SyncResult, "module">> {
  const client = getEdmingleClient();
  const studentIdMap = await buildIdMap("students", "edmingle_user_id");
  const batchIdMap = await buildIdMap("batches", "edmingle_batch_id");

  const records: Record<string, unknown>[] = [];
  let fetched = 0;
  let skipped = 0;

  for await (const page of client.getEnrollments(cursor ?? undefined)) {
    fetched += page.length;
    for (const raw of page) {
      const mapped = mapEnrollment(raw, studentIdMap, batchIdMap);
      if (mapped) records.push(mapped);
      else skipped++;
    }
  }

  const { upserted, failed } = await upsertBatch("enrollments", records, "edmingle_enroll_id");

  return {
    status: failed > 0 ? "partial" : "completed",
    records_fetched: fetched,
    records_upserted: upserted,
    records_failed: failed + skipped,
    error_message: skipped > 0 ? `${skipped} records skipped (unresolved FK)` : null,
    cursor_value: new Date().toISOString(),
  };
}

async function syncAttendance(cursor: string | null): Promise<Omit<SyncResult, "module">> {
  const client = getEdmingleClient();
  const studentIdMap = await buildIdMap("students", "edmingle_user_id");
  const batchIdMap = await buildIdMap("batches", "edmingle_batch_id");

  const records: Record<string, unknown>[] = [];
  let fetched = 0;

  for await (const page of client.getAttendance(cursor ?? undefined)) {
    fetched += page.length;
    for (const raw of page) {
      const mapped = mapAttendance(raw, studentIdMap, batchIdMap);
      if (mapped) records.push(mapped);
    }
  }

  // Attendance uses composite unique key — use student_id+batch_id+session_date
  const supabase = createSupabaseAdminClient();
  let upserted = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
    const chunk = records.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabase
      .from("attendance")
      .upsert(chunk, { onConflict: "student_id,batch_id,session_date", ignoreDuplicates: true });

    if (error) { failed += chunk.length; }
    else { upserted += chunk.length; }
  }

  return {
    status: failed > 0 ? "partial" : "completed",
    records_fetched: fetched,
    records_upserted: upserted,
    records_failed: failed,
    error_message: null,
    cursor_value: new Date().toISOString(),
  };
}

async function syncAssessments(cursor: string | null): Promise<Omit<SyncResult, "module">> {
  const client = getEdmingleClient();
  const studentIdMap = await buildIdMap("students", "edmingle_user_id");
  const batchIdMap = await buildIdMap("batches", "edmingle_batch_id");

  const records: Record<string, unknown>[] = [];
  let fetched = 0;

  for await (const page of client.getAssessments(cursor ?? undefined)) {
    fetched += page.length;
    for (const raw of page) {
      const mapped = mapAssessment(raw, studentIdMap, batchIdMap);
      if (mapped) records.push(mapped);
    }
  }

  const { upserted, failed } = await upsertBatch("assessments", records, "edmingle_assess_id");

  return {
    status: failed > 0 ? "partial" : "completed",
    records_fetched: fetched,
    records_upserted: upserted,
    records_failed: failed,
    error_message: null,
    cursor_value: new Date().toISOString(),
  };
}

async function syncFeedback(cursor: string | null): Promise<Omit<SyncResult, "module">> {
  const client = getEdmingleClient();
  const mentorIdMap = await buildIdMap("mentors", "edmingle_mentor_id");
  const batchIdMap = await buildIdMap("batches", "edmingle_batch_id");
  const studentIdMap = await buildIdMap("students", "edmingle_user_id");

  const records: Record<string, unknown>[] = [];
  let fetched = 0;

  for await (const page of client.getFeedback(cursor ?? undefined)) {
    fetched += page.length;
    for (const raw of page) {
      const mapped = mapFeedback(raw, mentorIdMap, batchIdMap, studentIdMap);
      if (mapped) records.push(mapped);
    }
  }

  const { upserted, failed } = await upsertBatch("feedback", records, "edmingle_feedback_id");

  return {
    status: failed > 0 ? "partial" : "completed",
    records_fetched: fetched,
    records_upserted: upserted,
    records_failed: failed,
    error_message: null,
    cursor_value: new Date().toISOString(),
  };
}

// =============================================================================
// Public: runSync — runs a single module
// =============================================================================

const MODULE_SYNC_FNS: Record<SyncModule, (cursor: string | null) => Promise<Omit<SyncResult, "module">>> = {
  courses: syncCourses,
  mentors: syncMentors,
  batches: syncBatches,
  students: syncStudents,
  enrollments: syncEnrollments,
  attendance: syncAttendance,
  assessments: syncAssessments,
  feedback: syncFeedback,
};

export async function runModuleSync(
  module: SyncModule,
  options: { syncType?: "delta" | "full" | "manual"; triggeredBy?: string } = {},
): Promise<SyncResult> {
  const { syncType = "delta", triggeredBy } = options;
  const logId = await createSyncLog(module, syncType, triggeredBy);

  console.log(`[Sync] Starting ${syncType} sync for module: ${module}`);

  try {
    const cursor = syncType === "full" ? null : await getLastCursor(module);
    const syncFn = MODULE_SYNC_FNS[module];

    if (!syncFn) throw new Error(`No sync function for module: ${module}`);

    const result = await syncFn(cursor);

    await updateSyncLog(logId, { ...result, status: result.status });

    console.log(
      `[Sync] ✓ ${module}: fetched=${result.records_fetched} upserted=${result.records_upserted} failed=${result.records_failed}`,
    );

    return { module, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Sync] ✗ ${module} failed: ${message}`);

    await updateSyncLog(logId, {
      status: "failed",
      records_fetched: 0,
      records_upserted: 0,
      records_failed: 0,
      error_message: message,
      cursor_value: null,
    });

    return {
      module,
      status: "failed",
      records_fetched: 0,
      records_upserted: 0,
      records_failed: 0,
      error_message: message,
      cursor_value: null,
    };
  }
}

// =============================================================================
// Public: runFullSync — runs all modules in dependency order
// =============================================================================

export async function runFullSync(options: {
  syncType?: "delta" | "full" | "manual";
  triggeredBy?: string;
} = {}): Promise<SyncResult[]> {
  // Order matters: courses → mentors → batches → students → enrollments → attendance → assessments → feedback
  const orderedModules: SyncModule[] = [
    "courses",
    "mentors",
    "batches",
    "students",
    "enrollments",
    "attendance",
    "assessments",
    "feedback",
  ];

  const results: SyncResult[] = [];

  for (const moduleName of orderedModules) {
    const result = await runModuleSync(moduleName, options);
    results.push(result);

    // If a critical upstream module fails, stop (downstream will have FK errors)
    if (result.status === "failed" && ["courses", "students", "batches"].includes(moduleName)) {
      console.error(
        `[Sync] Critical module "${moduleName}" failed. Stopping full sync to prevent FK violations.`,
      );
      break;
    }
  }

  return results;
}
