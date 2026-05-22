import { all } from './db.js';

/**
 * Returns the full course catalog for the anonymous homepage.
 * Sorted by name; includes enrollment, caps, preparatory, and incompatibilities.
 */
export async function listCoursesForHomepage() {
  const courses = await all(
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

  return courses.map((row) => ({
    code: row.code,
    name: row.name,
    credits: row.credits,
    enrollment: row.enrollment,
    maxStudents: row.max_students ?? null,
    preparatoryCode: row.preparatory_code ?? null,
    incompatibleWith: incompatByCourse.get(row.code) ?? [],
  }));
}
