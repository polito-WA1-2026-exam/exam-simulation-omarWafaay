import { all, get, run } from './db.js';
import { StudyPlan } from './StudyPlanModels.js';

const CREDIT_LIMITS = { full: [60, 80], part: [20, 40] };

export class PlanRuleError extends Error {
  constructor(code, message) {
    super(message);
    this.body = { error: code, message };
    this.status = 400;
  }
}

async function getPlanRow(userId) {
  return get('SELECT id, user_id, mode FROM study_plans WHERE user_id = ?', [
    userId,
  ]);
}

async function getPlanCourseCodes(planId) {
  const rows = await all(
    'SELECT course_code FROM study_plan_courses WHERE plan_id = ? ORDER BY course_code',
    [planId]
  );
  return rows.map((r) => r.course_code);
}

async function getTotalCredits(courseCodes) {
  if (courseCodes.length === 0) return 0;
  const placeholders = courseCodes.map(() => '?').join(',');
  const row = await get(
    `SELECT COALESCE(SUM(credits), 0) AS total FROM courses WHERE code IN (${placeholders})`,
    courseCodes
  );
  return row.total;
}

function creditBounds(mode) {
  const [minCredits, maxCredits] = CREDIT_LIMITS[mode];
  return { minCredits, maxCredits };
}

async function buildStudyPlan(planRow) {
  const courses = await getPlanCourseCodes(planRow.id);
  const totalCredits = await getTotalCredits(courses);
  const { minCredits, maxCredits } = creditBounds(planRow.mode);
  return new StudyPlan(
    planRow.id,
    planRow.mode,
    courses,
    totalCredits,
    minCredits,
    maxCredits
  );
}

async function getCourseRow(code) {
  return get(
    'SELECT code, name, credits, max_students, preparatory_code FROM courses WHERE code = ?',
    [code]
  );
}

async function getEnrollmentCount(courseCode) {
  const row = await get(
    'SELECT COUNT(*) AS n FROM study_plan_courses WHERE course_code = ?',
    [courseCode]
  );
  return row.n;
}

async function assertCanAddCourse(planId, courseCode, planCourseCodes) {
  const course = await getCourseRow(courseCode);
  if (!course) {
    throw new PlanRuleError('NOT_FOUND', `Unknown course ${courseCode}`);
  }
  if (planCourseCodes.includes(courseCode)) {
    throw new PlanRuleError('ALREADY_IN_PLAN', `${courseCode} is already in the study plan`);
  }

  if (course.max_students != null) {
    const enrolled = await getEnrollmentCount(courseCode);
    if (enrolled >= course.max_students) {
      throw new PlanRuleError(
        'MAX_STUDENTS',
        `${courseCode} has reached the maximum number of students`
      );
    }
  }

  if (course.preparatory_code && !planCourseCodes.includes(course.preparatory_code)) {
    throw new PlanRuleError(
      'PREPARATORY',
      `${courseCode} requires preparatory course ${course.preparatory_code} in the plan first`
    );
  }

  const incompatRows = await all(
    `SELECT incompatible_with FROM incompatibilities WHERE course_code = ?`,
    [courseCode]
  );
  for (const row of incompatRows) {
    if (planCourseCodes.includes(row.incompatible_with)) {
      throw new PlanRuleError(
        'INCOMPATIBLE',
        `${courseCode} is incompatible with ${row.incompatible_with} already in the plan`
      );
    }
  }
}

async function assertCanRemoveCourse(planId, courseCode, planCourseCodes) {
  if (!planCourseCodes.includes(courseCode)) {
    throw new PlanRuleError('NOT_IN_PLAN', `${courseCode} is not in the study plan`);
  }
  const dependents = await all(
    'SELECT code FROM courses WHERE preparatory_code = ?',
    [courseCode]
  );
  for (const dep of dependents) {
    if (planCourseCodes.includes(dep.code)) {
      throw new PlanRuleError(
        'PREPARATORY',
        `Cannot remove ${courseCode}: ${dep.code} depends on it as preparatory`
      );
    }
  }
}

function assertCreditRange(mode, totalCredits) {
  const [minCredits, maxCredits] = CREDIT_LIMITS[mode];
  if (totalCredits < minCredits || totalCredits > maxCredits) {
    throw new PlanRuleError(
      'CREDITS',
      `Total credits ${totalCredits} must be between ${minCredits} and ${maxCredits} for ${mode}-time plan`
    );
  }
}

/** GET study plan for user, or null if none. */
export const getStudyPlanByUserId = async (userId) => {
  const planRow = await getPlanRow(userId);
  if (!planRow) return null;
  return buildStudyPlan(planRow);
};

/** POST create empty plan. */
export const createStudyPlan = async (userId, mode) => {
  if (mode !== 'full' && mode !== 'part') {
    throw new PlanRuleError('INVALID_MODE', 'mode must be full or part');
  }
  const existing = await getPlanRow(userId);
  if (existing) {
    const err = new PlanRuleError('PLAN_EXISTS', 'Study plan already exists');
    err.status = 409;
    throw err;
  }
  const result = await run(
    'INSERT INTO study_plans (user_id, mode) VALUES (?, ?)',
    [userId, mode]
  );
  const planRow = await get('SELECT id, user_id, mode FROM study_plans WHERE id = ?', [
    result.lastID,
  ]);
  return buildStudyPlan(planRow);
};

/** DELETE entire plan. */
export const deleteStudyPlan = async (userId) => {
  const planRow = await getPlanRow(userId);
  if (!planRow) {
    const err = new PlanRuleError('NOT_FOUND', 'No study plan to delete');
    err.status = 404;
    throw err;
  }
  await run('DELETE FROM study_plans WHERE id = ?', [planRow.id]);
};

/** POST add one course (persists immediately). */
export const addCourseToStudyPlan = async (userId, courseCode) => {
  const planRow = await getPlanRow(userId);
  if (!planRow) {
    const err = new PlanRuleError('NOT_FOUND', 'Create a study plan first');
    err.status = 404;
    throw err;
  }
  const planCourseCodes = await getPlanCourseCodes(planRow.id);
  await assertCanAddCourse(planRow.id, courseCode, planCourseCodes);
  await run(
    'INSERT INTO study_plan_courses (plan_id, course_code) VALUES (?, ?)',
    [planRow.id, courseCode]
  );
  return buildStudyPlan(planRow);
};

/** DELETE remove one course. */
export const removeCourseFromStudyPlan = async (userId, courseCode) => {
  const planRow = await getPlanRow(userId);
  if (!planRow) {
    const err = new PlanRuleError('NOT_FOUND', 'No study plan found');
    err.status = 404;
    throw err;
  }
  const planCourseCodes = await getPlanCourseCodes(planRow.id);
  await assertCanRemoveCourse(planRow.id, courseCode, planCourseCodes);
  await run(
    'DELETE FROM study_plan_courses WHERE plan_id = ? AND course_code = ?',
    [planRow.id, courseCode]
  );
  return buildStudyPlan(planRow);
};

/**
 * PUT save: replace courses (optional body) and validate credit range.
 * Cancel on client: PUT with the course list from GET before editing.
 */
export const saveStudyPlan = async (userId, courseCodes = null) => {
  const planRow = await getPlanRow(userId);
  if (!planRow) {
    const err = new PlanRuleError('NOT_FOUND', 'No study plan to save');
    err.status = 404;
    throw err;
  }

  if (courseCodes !== null) {
    const unique = [...new Set(courseCodes)];
    await run('DELETE FROM study_plan_courses WHERE plan_id = ?', [planRow.id]);
    const built = [];
    for (const code of unique) {
      await assertCanAddCourse(planRow.id, code, built);
      await run(
        'INSERT INTO study_plan_courses (plan_id, course_code) VALUES (?, ?)',
        [planRow.id, code]
      );
      built.push(code);
    }
  }

  const plan = await buildStudyPlan(planRow);
  assertCreditRange(planRow.mode, plan.totalCredits);
  return plan;
};
