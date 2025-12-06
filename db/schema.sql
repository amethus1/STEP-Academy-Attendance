-- Enable WAL mode for better concurrent access
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  photo_url TEXT,
  custom_fields TEXT
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  school_year TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  grade_level TEXT NOT NULL,
  campus TEXT,
  status TEXT NOT NULL, -- 'Active', 'Withdrawn', 'Completed'
  sped_504 TEXT,
  drg_offense TEXT,
  days_assigned INTEGER DEFAULT 45,
  credit_days INTEGER DEFAULT 0,
  comments TEXT,
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  date TEXT NOT NULL,
  presence TEXT NOT NULL, -- 'Present', 'Absent', 'Tardy'
  FOREIGN KEY(student_id) REFERENCES students(id),
  FOREIGN KEY(enrollment_id) REFERENCES enrollments(id),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS holidays (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school_year TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_school_year ON enrollments(school_year);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_id ON attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_students_names ON students(last_name, first_name);


CREATE TABLE IF NOT EXISTS school_years (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_school_years_dates ON school_years(start_date, end_date);
