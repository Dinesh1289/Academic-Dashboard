-- =============================================================================
-- Seed: 002_seed_dev_data.sql
-- Development seed data — DO NOT RUN IN PRODUCTION
-- =============================================================================

-- Courses
INSERT INTO courses (id, edmingle_course_id, name, short_name, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'EDM-C-001', 'Machine Learning',       'ML',      true),
  ('11111111-0000-0000-0000-000000000002', 'EDM-C-002', 'Full Stack Web Dev',     'FSWD',    true),
  ('11111111-0000-0000-0000-000000000003', 'EDM-C-003', 'Data Science',           'DS',      true)
ON CONFLICT (edmingle_course_id) DO NOTHING;

-- Mentors
INSERT INTO mentors (id, edmingle_mentor_id, full_name, email, is_active) VALUES
  ('22222222-0000-0000-0000-000000000001', 'EDM-M-001', 'Suresh Reddy',   'suresh@company.com',  true),
  ('22222222-0000-0000-0000-000000000002', 'EDM-M-002', 'Anita Verma',    'anita@company.com',   true),
  ('22222222-0000-0000-0000-000000000003', 'EDM-M-003', 'Kartik Nair',    'kartik@company.com',  true)
ON CONFLICT (edmingle_mentor_id) DO NOTHING;

-- Batches
INSERT INTO batches (id, edmingle_batch_id, course_id, mentor_id, name, start_date, end_date, status) VALUES
  ('33333333-0000-0000-0000-000000000001', 'EDM-B-001',
   '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
   'ML-JAN-2026', '2026-01-10', '2026-04-10', 'active'),
  ('33333333-0000-0000-0000-000000000002', 'EDM-B-002',
   '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'FSWD-JAN-2026', '2026-01-15', '2026-05-15', 'active'),
  ('33333333-0000-0000-0000-000000000003', 'EDM-B-003',
   '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003',
   'DS-FEB-2026', '2026-02-01', '2026-06-01', 'active')
ON CONFLICT (edmingle_batch_id) DO NOTHING;

-- Students (10 sample)
INSERT INTO students (id, edmingle_user_id, student_name, email, contact_number) VALUES
  ('44444444-0000-0000-0000-000000000001', 'EDM-S-001', 'Ravi Kumar',    'ravi@example.com',    '9876543210'),
  ('44444444-0000-0000-0000-000000000002', 'EDM-S-002', 'Priya Menon',   'priya@example.com',   '9876543211'),
  ('44444444-0000-0000-0000-000000000003', 'EDM-S-003', 'Amit Joshi',    'amit@example.com',    '9876543212'),
  ('44444444-0000-0000-0000-000000000004', 'EDM-S-004', 'Sara Thomas',   'sara@example.com',    '9876543213'),
  ('44444444-0000-0000-0000-000000000005', 'EDM-S-005', 'Deepak Rao',    'deepak@example.com',  '9876543214'),
  ('44444444-0000-0000-0000-000000000006', 'EDM-S-006', 'Neha Singh',    'neha@example.com',    '9876543215'),
  ('44444444-0000-0000-0000-000000000007', 'EDM-S-007', 'Karan Patel',   'karan@example.com',   '9876543216'),
  ('44444444-0000-0000-0000-000000000008', 'EDM-S-008', 'Divya Nair',    'divya@example.com',   '9876543217'),
  ('44444444-0000-0000-0000-000000000009', 'EDM-S-009', 'Rahul Sharma',  'rahul@example.com',   '9876543218'),
  ('44444444-0000-0000-0000-000000000010', 'EDM-S-010', 'Meera Iyer',    'meera@example.com',   '9876543219')
ON CONFLICT (email) DO NOTHING;

-- Enrollments
INSERT INTO enrollments (student_id, batch_id, status) VALUES
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'active'),
  ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'active'),
  ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'active'),
  ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000002', 'active'),
  ('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000002', 'active'),
  ('44444444-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000002', 'active'),
  ('44444444-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000003', 'active'),
  ('44444444-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000003', 'active'),
  ('44444444-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000003', 'active'),
  ('44444444-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000003', 'active')
ON CONFLICT DO NOTHING;
