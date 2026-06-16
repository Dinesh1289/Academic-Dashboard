// =============================================================================
// Edmingle LMS API response types
// NOTE: These are inferred shapes — validate against actual Edmingle docs.
// All shapes are processed through DataMapper before entering our DB.
// =============================================================================

export interface EdmingleCourse {
  id: string;
  name: string;
  short_name?: string;
  description?: string;
  is_active?: boolean;
  updated_at?: string;
}

export interface EdmingleMentor {
  id: string;
  name: string;
  email?: string;
  contact_number?: string;
  role: string; // "mentor"
  is_active?: boolean;
  updated_at?: string;
}

export interface EdmingleBatch {
  id: string;
  course_id: string;
  mentor_id?: string;
  name: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  max_capacity?: number;
  updated_at?: string;
}

export interface EdmingleStudent {
  id: string;
  name: string;
  email: string;
  contact_number?: string;
  role: string; // "student"
  status?: string;
  updated_at?: string;
}

export interface EdmingleEnrollment {
  id: string;
  student_id: string;
  batch_id: string;
  enrolled_at?: string;
  status?: string;
  updated_at?: string;
}

export interface EdmingleAttendance {
  id: string;
  student_id: string;
  batch_id: string;
  session_date: string;
  session_title?: string;
  is_present: boolean;
  updated_at?: string;
}

export interface EdmingleAssessment {
  id: string;
  student_id: string;
  batch_id: string;
  name?: string;
  score?: number;
  max_score?: number;
  assessed_at?: string;
  updated_at?: string;
}

export interface EdmingleFeedback {
  id: string;
  mentor_id: string;
  batch_id?: string;
  student_id?: string;
  rating: number;
  comment?: string;
  submitted_at?: string;
  updated_at?: string;
}

// ─── Pagination wrapper ────────────────────────────────────────────────────
export interface EdminglePaginatedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
}

// ─── Sync module names ─────────────────────────────────────────────────────
export type SyncModule =
  | "courses"
  | "batches"
  | "students"
  | "enrollments"
  | "attendance"
  | "assessments"
  | "mentors"
  | "feedback";

export const SYNC_MODULES: SyncModule[] = [
  "courses",
  "mentors",
  "batches",
  "students",
  "enrollments",
  "attendance",
  "assessments",
  "feedback",
];
