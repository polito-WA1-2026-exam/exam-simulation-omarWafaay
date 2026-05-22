/* Data Access Object (DAO) for StudyPlan */

import bcrypt from 'bcrypt';
import { all, get } from './db.js';
import { Course, Student } from './StudyPlanModels.js';

/** COURSES */

/** Retrieve all courses for the anonymous homepage, ordered by name. */
export const listCoursesForHomepage = async () => {
  const rows = await all(
    `SELECT c.code, c.name, c.credits, c.max_students, c.preparatory_code,
            COUNT(spc.course_code) AS enrollment
     FROM courses c
     LEFT JOIN study_plan_courses spc ON spc.course_code = c.code
     GROUP BY c.code
     ORDER BY c.name`
  );

  const incompatRows = await all(
    'SELECT course_code, incompatible_with FROM incompatibilities'
  );

  const incompatByCourse = new Map();
  for (const row of incompatRows) {
    const list = incompatByCourse.get(row.course_code) ?? [];
    list.push(row.incompatible_with);
    incompatByCourse.set(row.course_code, list);
  }

  return rows.map((row) => {
    const course = new Course(
      row.code,
      row.name,
      row.credits,
      row.max_students ?? null,
      row.preparatory_code ?? null,
      row.enrollment
    );
    course.incompatible = incompatByCourse.get(row.code) ?? [];
    return course;
  });
};

/** STUDENTS */

/**
 * Retrieve a student by login id (stored as users.username), or false if not found.
 * email field uses username until a separate email column exists in the DB.
 */
export const getStudentByUsername = async (username) => {
  const row = await get(
    `SELECT u.id, u.username, sp.mode AS plan_type
     FROM users u
     LEFT JOIN study_plans sp ON sp.user_id = u.id
     WHERE u.username = ?`,
    [username]
  );
  if (row === undefined) {
    return false;
  }
  return new Student(
    row.id,
    row.username,
    '',
    '',
    row.plan_type ?? null
  );
};

/** Verify login; returns a Student or false. */
export const verifyStudentLogin = async (username, password) => {
  const row = await get(
    'SELECT id, username, password_hash FROM users WHERE username = ?',
    [username]
  );
  if (row === undefined) {
    return false;
  }
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return false;
  }
  return getStudentByUsername(username);
};
