import type {
  EdmingleCourse,
  EdmingleMentor,
  EdmingleBatch,
  EdmingleStudent,
  EdmingleEnrollment,
  EdmingleAttendance,
  EdmingleAssessment,
  EdmingleFeedback,
} from "@/types/edmingle";

// =============================================================================
// DataMapper
// Transforms Edmingle API response shapes into our normalized DB upsert objects.
// All type coercion and field renaming is isolated in this file.
// If Edmingle changes their API shape, only this file needs updating.
// =============================================================================

const now = () => new Date().toISOString();

// ─── Sentiment classification (keyword-based for MVP) ─────────────────────
function classifySentiment(
  rating: number,
  comment?: string,
): "positive" | "neutral" | "negative" {
  if (rating >= 4) return "positive";
  if (rating <= 2) return "negative";

  // Rating = 3: use comment keywords
  const text = (comment ?? "").toLowerCase();
  const positiveKeywords = ["great", "good", "excellent", "amazing", "helpful", "clear", "enjoyed"];
  const negativeKeywords = ["bad", "poor", "confusing", "unclear", "boring", "disappointing"];

  if (positiveKeywords.some((k) => text.includes(k))) return "positive";
  if (negativeKeywords.some((k) => text.includes(k))) return "negative";
  return "neutral";
}

// ─── Course mapper ─────────────────────────────────────────────────────────
export function mapCourse(raw: EdmingleCourse) {
  return {
    edmingle_course_id: String(raw.id),
    name: raw.name ?? "Unnamed Course",
    short_name: raw.short_name ?? null,
    description: raw.description ?? null,
    is_active: raw.is_active !== false,
    edmingle_synced_at: now(),
  };
}

// ─── Mentor mapper ─────────────────────────────────────────────────────────
export function mapMentor(raw: EdmingleMentor) {
  return {
    edmingle_mentor_id: String(raw.id),
    full_name: raw.name ?? "Unknown Mentor",
    email: raw.email ?? null,
    contact_number: raw.contact_number ?? null,
    is_active: raw.is_active !== false,
    edmingle_synced_at: now(),
  };
}

// ─── Batch mapper ──────────────────────────────────────────────────────────
export function mapBatch(raw: EdmingleBatch, courseIdMap: Map<string, string>) {
  const internalCourseId = courseIdMap.get(String(raw.course_id));
  if (!internalCourseId) {
    throw new Error(
      `Batch "${raw.name}" references unknown course_id "${raw.course_id}". Ensure courses are synced first.`,
    );
  }

  return {
    edmingle_batch_id: String(raw.id),
    course_id: internalCourseId,
    name: raw.name ?? "Unnamed Batch",
    start_date: raw.start_date ?? null,
    end_date: raw.end_date ?? null,
    status: (raw.status as "active" | "completed" | "cancelled") ?? "active",
    max_capacity: raw.max_capacity ?? null,
    edmingle_synced_at: now(),
    // mentor_id resolved in sync engine after mentor sync
    _edmingle_mentor_id: raw.mentor_id ? String(raw.mentor_id) : null,
  };
}

// ─── Student mapper ────────────────────────────────────────────────────────
export function mapStudent(raw: EdmingleStudent) {
  return {
    edmingle_user_id: String(raw.id),
    student_name: raw.name ?? "Unknown Student",
    email: raw.email,
    contact_number: raw.contact_number ?? null,
    status: raw.status ?? "active",
    edmingle_synced_at: now(),
  };
}

// ─── Enrollment mapper ─────────────────────────────────────────────────────
export function mapEnrollment(
  raw: EdmingleEnrollment,
  studentIdMap: Map<string, string>,
  batchIdMap: Map<string, string>,
) {
  const studentId = studentIdMap.get(String(raw.student_id));
  const batchId = batchIdMap.get(String(raw.batch_id));

  if (!studentId || !batchId) return null; // skip if FK not resolved

  return {
    edmingle_enroll_id: String(raw.id),
    student_id: studentId,
    batch_id: batchId,
    status: (raw.status as "active" | "completed" | "dropped") ?? "active",
    enrolled_at: raw.enrolled_at ?? now(),
    edmingle_synced_at: now(),
  };
}

// ─── Attendance mapper ────────────────────────────────────────────────────
export function mapAttendance(
  raw: EdmingleAttendance,
  studentIdMap: Map<string, string>,
  batchIdMap: Map<string, string>,
) {
  const studentId = studentIdMap.get(String(raw.student_id));
  const batchId = batchIdMap.get(String(raw.batch_id));

  if (!studentId || !batchId) return null;

  return {
    student_id: studentId,
    batch_id: batchId,
    session_date: raw.session_date,
    session_title: raw.session_title ?? null,
    is_present: raw.is_present,
    edmingle_record_id: String(raw.id),
    edmingle_synced_at: now(),
  };
}

// ─── Assessment mapper ────────────────────────────────────────────────────
export function mapAssessment(
  raw: EdmingleAssessment,
  studentIdMap: Map<string, string>,
  batchIdMap: Map<string, string>,
) {
  const studentId = studentIdMap.get(String(raw.student_id));
  const batchId = batchIdMap.get(String(raw.batch_id));

  if (!studentId || !batchId) return null;

  return {
    edmingle_assess_id: String(raw.id),
    student_id: studentId,
    batch_id: batchId,
    assessment_name: raw.name ?? null,
    score: raw.score ?? null,
    max_score: raw.max_score ?? 100,
    assessed_at: raw.assessed_at ?? null,
    edmingle_synced_at: now(),
  };
}

// ─── Feedback mapper ──────────────────────────────────────────────────────
export function mapFeedback(
  raw: EdmingleFeedback,
  mentorIdMap: Map<string, string>,
  batchIdMap: Map<string, string>,
  studentIdMap: Map<string, string>,
) {
  const mentorId = mentorIdMap.get(String(raw.mentor_id));
  if (!mentorId) return null;

  return {
    edmingle_feedback_id: String(raw.id),
    mentor_id: mentorId,
    batch_id: raw.batch_id ? (batchIdMap.get(String(raw.batch_id)) ?? null) : null,
    student_id: raw.student_id ? (studentIdMap.get(String(raw.student_id)) ?? null) : null,
    rating: raw.rating,
    comment: raw.comment ?? null,
    sentiment: classifySentiment(raw.rating, raw.comment),
    submitted_at: raw.submitted_at ?? now(),
    edmingle_synced_at: now(),
  };
}
