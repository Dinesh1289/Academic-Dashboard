// =============================================================================
// Core domain types — mirrors database schema
// =============================================================================

export type UserRole = "admin" | "academic_team" | "support_team";
export type SyncStatus = "pending" | "running" | "completed" | "failed" | "partial";
export type EnrollmentStatus = "active" | "completed" | "dropped";
export type BatchStatus = "active" | "completed" | "cancelled";

// ─── Database row types ────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  supabase_uid: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCourse {
  id: string;
  edmingle_course_id: string | null;
  name: string;
  short_name: string | null;
  description: string | null;
  is_active: boolean;
  edmingle_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMentor {
  id: string;
  edmingle_mentor_id: string | null;
  full_name: string;
  email: string | null;
  contact_number: string | null;
  is_active: boolean;
  edmingle_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBatch {
  id: string;
  edmingle_batch_id: string | null;
  course_id: string;
  mentor_id: string | null;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: BatchStatus;
  max_capacity: number | null;
  edmingle_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbStudent {
  id: string;
  edmingle_user_id: string | null;
  student_name: string;
  email: string;
  contact_number: string | null;
  status: string;
  is_deleted: boolean;
  edmingle_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbEnrollment {
  id: string;
  edmingle_enroll_id: string | null;
  student_id: string;
  batch_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  edmingle_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAttendance {
  id: string;
  student_id: string;
  batch_id: string;
  session_date: string;
  session_title: string | null;
  is_present: boolean;
  edmingle_record_id: string | null;
  created_at: string;
}

export interface DbAssessment {
  id: string;
  edmingle_assess_id: string | null;
  student_id: string;
  batch_id: string;
  assessment_name: string | null;
  score: number | null;
  max_score: number;
  assessed_at: string | null;
  created_at: string;
}

export interface DbFeedback {
  id: string;
  edmingle_feedback_id: string | null;
  mentor_id: string;
  batch_id: string | null;
  student_id: string | null;
  rating: number;
  comment: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  submitted_at: string;
  created_at: string;
}

export interface DbSyncLog {
  id: string;
  module: string;
  sync_type: string;
  status: SyncStatus;
  started_at: string;
  completed_at: string | null;
  records_fetched: number;
  records_upserted: number;
  records_failed: number;
  error_message: string | null;
  cursor_value: string | null;
  triggered_by: string | null;
  created_at: string;
}

// ─── View types ────────────────────────────────────────────────────────────

export interface CourseSummary {
  id: string;
  name: string;
  short_name: string | null;
  is_active: boolean;
  total_active_batches: number;
  total_batches: number;
  total_students: number;
}

export interface BatchSummary {
  id: string;
  name: string;
  course_id: string;
  course_name: string;
  mentor_id: string | null;
  mentor_name: string | null;
  status: BatchStatus;
  start_date: string | null;
  end_date: string | null;
  student_count: number;
}

export interface SyncStatusView {
  module: string;
  status: SyncStatus;
  started_at: string;
  completed_at: string | null;
  records_upserted: number;
  error_message: string | null;
}

// ─── API response types ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface DashboardOverview {
  total_courses: number;
  total_active_batches: number;
  total_students: number;
  total_mentors: number;
  last_sync_time: string | null;
  sync_status: Record<string, SyncStatusView | null>;
}

export interface StudentListItem {
  id: string;
  student_name: string;
  email: string;
  contact_number: string | null;
  status: string;
  current_batch_name: string | null;
  current_course_name: string | null;
}

export interface MentorListItem {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  courses_assigned: string[];
  batches_assigned: string[];
}

export type CourseListItem = CourseSummary;

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface SearchParams extends PaginationParams {
  q?: string;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}
