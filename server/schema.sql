-- StudyPlan exam simulation — enable FK enforcement in application code:
-- PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS courses (
  code TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  max_students INTEGER CHECK (max_students IS NULL OR max_students > 0),
  preparatory_code TEXT,
  FOREIGN KEY (preparatory_code) REFERENCES courses (code)
);

CREATE TABLE IF NOT EXISTS incompatibilities (
  course_code TEXT NOT NULL,
  incompatible_with TEXT NOT NULL,
  PRIMARY KEY (course_code, incompatible_with),
  FOREIGN KEY (course_code) REFERENCES courses (code),
  FOREIGN KEY (incompatible_with) REFERENCES courses (code)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_plans (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK (mode IN ('full', 'part')),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_plan_courses (
  plan_id INTEGER NOT NULL,
  course_code TEXT NOT NULL,
  PRIMARY KEY (plan_id, course_code),
  FOREIGN KEY (plan_id) REFERENCES study_plans (id) ON DELETE CASCADE,
  FOREIGN KEY (course_code) REFERENCES courses (code)
);
