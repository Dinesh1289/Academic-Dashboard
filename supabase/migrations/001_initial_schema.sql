-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Academic Performance Dashboard — Sprint 1
-- =============================================================================

-- ─── Enable UUID extension ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'academic_team', 'support_team');
CREATE TYPE sync_status AS ENUM ('pending', 'running', 'completed', 'failed', 'partial');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE batch_status AS ENUM ('active', 'completed', 'cancelled');

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE: roles
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       user_role NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
  ('admin',         'Full system access including sync controls'),
  ('academic_team', 'View all reports and mentor performance'),
  ('support_team',  'View student and course data only')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- TABLE: users
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_uid  UUID UNIQUE,                          -- links to auth.users
  email         VARCHAR(255) NOT NULL UNIQUE,
  full_name     VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'support_team',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_users_supabase  ON users(supabase_uid);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE: courses
-- =============================================================================

CREATE TABLE IF NOT EXISTS courses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edmingle_course_id  VARCHAR(100) UNIQUE,
  name                VARCHAR(255) NOT NULL,
  short_name          VARCHAR(50),
  description         TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  edmingle_synced_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_edmingle_id ON courses(edmingle_course_id);
CREATE INDEX idx_courses_active      ON courses(is_active);

CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE: mentors
-- =============================================================================

CREATE TABLE IF NOT EXISTS mentors (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edmingle_mentor_id  VARCHAR(100) UNIQUE,
  full_name           VARCHAR(255) NOT NULL,
  email               VARCHAR(255) UNIQUE,
  contact_number      VARCHAR(30),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  edmingle_synced_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mentors_edmingle_id ON mentors(edmingle_mentor_id);
CREATE INDEX idx_mentors_email       ON mentors(email);

CREATE TRIGGER set_mentors_updated_at
  BEFORE UPDATE ON mentors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE: batches
-- =============================================================================

CREATE TABLE IF NOT EXISTS batches (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edmingle_batch_id  VARCHAR(100) UNIQUE,
  course_id          UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  mentor_id          UUID REFERENCES mentors(id) ON DELETE SET NULL,
  name               VARCHAR(100) NOT NULL,
  start_date         DATE,
  end_date           DATE,
  status             batch_status NOT NULL DEFAULT 'active',
  max_capacity       INTEGER,
  edmingle_synced_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_batches_edmingle_id  ON batches(edmingle_batch_id);
CREATE INDEX idx_batches_course_id    ON batches(course_id);
CREATE INDEX idx_batches_mentor_id    ON batches(mentor_id);
CREATE INDEX idx_batches_status       ON batches(status);
CREATE INDEX idx_batches_course_status ON batches(course_id, status);

CREATE TRIGGER set_batches_updated_at
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE: students
-- =============================================================================

CREATE TABLE IF NOT EXISTS students (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- internal_student_id
  edmingle_user_id    VARCHAR(100) UNIQUE,
  student_name        VARCHAR(255) NOT NULL,
  email               VARCHAR(255) NOT NULL UNIQUE,
  contact_number      VARCHAR(30),
  status              VARCHAR(20) NOT NULL DEFAULT 'active',         -- active | inactive | completed
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  edmingle_synced_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_students_email           ON students(email) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX idx_students_edmingle_id     ON students(edmingle_user_id) WHERE edmingle_user_id IS NOT NULL;
CREATE INDEX        idx_students_contact         ON students(contact_number) WHERE contact_number IS NOT NULL;
CREATE INDEX        idx_students_status          ON students(status);
-- GIN index for fast full-text search on student_name
CREATE INDEX        idx_students_name_trgm       ON students USING GIN (student_name gin_trgm_ops);

CREATE TRIGGER set_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE: enrollments
-- =============================================================================

CREATE TABLE IF NOT EXISTS enrollments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edmingle_enroll_id  VARCHAR(100),
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id            UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  status              enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  edmingle_synced_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A student can only have one active enrollment per batch
CREATE UNIQUE INDEX idx_enrollments_active
  ON enrollments(student_id, batch_id)
  WHERE status = 'active';

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_batch   ON enrollments(batch_id);
CREATE INDEX idx_enrollments_status  ON enrollments(status);

CREATE TRIGGER set_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE: attendance
-- =============================================================================

CREATE TABLE IF NOT EXISTS attendance (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id         UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id           UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  session_date       DATE NOT NULL,
  session_title      VARCHAR(255),
  is_present         BOOLEAN NOT NULL,
  edmingle_record_id VARCHAR(100),
  edmingle_synced_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate attendance entries
CREATE UNIQUE INDEX idx_attendance_unique
  ON attendance(student_id, batch_id, session_date);

CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_batch   ON attendance(batch_id);
CREATE INDEX idx_attendance_date    ON attendance(session_date);

-- =============================================================================
-- TABLE: assessments
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edmingle_assess_id    VARCHAR(100) UNIQUE,
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id              UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  assessment_name       VARCHAR(255),
  score                 NUMERIC(6, 2),
  max_score             NUMERIC(6, 2) NOT NULL DEFAULT 100,
  assessed_at           TIMESTAMPTZ,
  edmingle_synced_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_student ON assessments(student_id);
CREATE INDEX idx_assessments_batch   ON assessments(batch_id);

-- =============================================================================
-- TABLE: feedback
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edmingle_feedback_id VARCHAR(100) UNIQUE,
  mentor_id           UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  batch_id            UUID REFERENCES batches(id) ON DELETE SET NULL,
  student_id          UUID REFERENCES students(id) ON DELETE SET NULL,
  rating              NUMERIC(3, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment             TEXT,
  sentiment           VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edmingle_synced_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_mentor ON feedback(mentor_id);
CREATE INDEX idx_feedback_batch  ON feedback(batch_id);

-- =============================================================================
-- TABLE: sync_logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module           VARCHAR(50) NOT NULL, -- courses|batches|students|attendance|assessments|mentors|feedback
  sync_type        VARCHAR(20) NOT NULL DEFAULT 'delta', -- delta|full|manual
  status           sync_status NOT NULL DEFAULT 'pending',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  records_fetched  INTEGER DEFAULT 0,
  records_upserted INTEGER DEFAULT 0,
  records_failed   INTEGER DEFAULT 0,
  error_message    TEXT,
  cursor_value     VARCHAR(255), -- last updated_at cursor for delta sync
  triggered_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_module      ON sync_logs(module);
CREATE INDEX idx_sync_logs_status      ON sync_logs(status);
CREATE INDEX idx_sync_logs_started_at  ON sync_logs(started_at DESC);
CREATE INDEX idx_sync_logs_module_status ON sync_logs(module, status, started_at DESC);

-- =============================================================================
-- VIEWS: computed aggregates used by the dashboard
-- =============================================================================

-- Course summary view
CREATE OR REPLACE VIEW vw_course_summary AS
SELECT
  c.id,
  c.name,
  c.short_name,
  c.is_active,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active') AS total_active_batches,
  COUNT(DISTINCT b.id)                                     AS total_batches,
  COUNT(DISTINCT e.student_id) FILTER (WHERE e.status = 'active') AS total_students
FROM courses c
LEFT JOIN batches b ON b.course_id = c.id
LEFT JOIN enrollments e ON e.batch_id = b.id
GROUP BY c.id, c.name, c.short_name, c.is_active;

-- Batch summary view
CREATE OR REPLACE VIEW vw_batch_summary AS
SELECT
  b.id,
  b.name,
  b.course_id,
  b.mentor_id,
  b.status,
  b.start_date,
  b.end_date,
  c.name AS course_name,
  m.full_name AS mentor_name,
  COUNT(DISTINCT e.student_id) FILTER (WHERE e.status = 'active') AS student_count
FROM batches b
JOIN courses c ON c.id = b.course_id
LEFT JOIN mentors m ON m.id = b.mentor_id
LEFT JOIN enrollments e ON e.batch_id = b.id
GROUP BY b.id, b.name, b.course_id, b.mentor_id, b.status,
         b.start_date, b.end_date, c.name, m.full_name;

-- Last sync status per module
CREATE OR REPLACE VIEW vw_sync_status AS
SELECT DISTINCT ON (module)
  module,
  status,
  started_at,
  completed_at,
  records_upserted,
  error_message
FROM sync_logs
ORDER BY module, started_at DESC;

-- =============================================================================
-- RLS POLICIES (Row Level Security)
-- =============================================================================

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs    ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by API routes with service role key)
-- Authenticated users can read all non-sensitive tables
CREATE POLICY "Authenticated users can read courses"
  ON courses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read batches"
  ON batches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read students"
  ON students FOR SELECT TO authenticated USING (is_deleted = false);

CREATE POLICY "Authenticated users can read enrollments"
  ON enrollments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read attendance"
  ON attendance FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read assessments"
  ON assessments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read mentors"
  ON mentors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read feedback"
  ON feedback FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read sync_logs"
  ON sync_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT TO authenticated
  USING (supabase_uid = auth.uid());

CREATE POLICY "Service role has full access to users"
  ON users FOR ALL TO service_role USING (true);
