import { initDb, closeDb } from './db.js';
import {
  getStudyPlanByUserId,
  createStudyPlan,
  deleteStudyPlan,
  addCourseToStudyPlan,
  removeCourseFromStudyPlan,
  saveStudyPlan,
  PlanRuleError,
} from './studyPlanDao.js';

await initDb();

const checks = [];
const bobId = 2;
const carolId = 3;

const carolSeedCourses = [
  '02LSEOV',
  '04GSPOV',
  '01TXYOV',
  '01SQOOV',
  '01TYDOV',
  '03UEWOV',
  '01URROV',
  '01OUZPD',
  '01SQMOV',
];

let carolPlan = await getStudyPlanByUserId(carolId);
if (!carolPlan) {
  await createStudyPlan(carolId, 'full');
}
await saveStudyPlan(carolId, carolSeedCourses);

await saveStudyPlan(bobId, ['01OTWOV', '01SQLOV', '01UDFOV', '01OUZPD']);

const bobPlan = await getStudyPlanByUserId(bobId);
checks.push({
  name: 'bob has part-time plan',
  ok: bobPlan?.planType === 'part' && bobPlan.totalCredits === 24,
  value: bobPlan?.totalCredits,
});

await addCourseToStudyPlan(bobId, '02GOLOV');
try {
  await addCourseToStudyPlan(bobId, '02LSEOV');
  checks.push({ name: 'add incompatible should fail', ok: false });
} catch (e) {
  checks.push({
    name: 'add incompatible should fail',
    ok: e instanceof PlanRuleError && e.body.error === 'INCOMPATIBLE',
  });
}
await removeCourseFromStudyPlan(bobId, '02GOLOV');

try {
  await addCourseToStudyPlan(bobId, '05BIDOV');
  checks.push({ name: 'add without preparatory should fail', ok: false });
} catch (e) {
  checks.push({
    name: 'add without preparatory should fail',
    ok: e instanceof PlanRuleError && e.body.error === 'PREPARATORY',
  });
}

try {
  await addCourseToStudyPlan(bobId, '01TXYOV');
  checks.push({ name: 'add at-cap course should fail', ok: false });
} catch (e) {
  checks.push({
    name: 'add at-cap course should fail',
    ok: e instanceof PlanRuleError && e.body.error === 'MAX_STUDENTS',
  });
}

await saveStudyPlan(bobId);
checks.push({ name: 'save valid part-time credits', ok: true });

await deleteStudyPlan(carolId);
const created = await createStudyPlan(carolId, 'full');
checks.push({
  name: 'create empty full-time plan',
  ok: created.planType === 'full' && created.courses.length === 0,
});

try {
  await createStudyPlan(carolId, 'part');
  checks.push({ name: 'duplicate plan should fail', ok: false });
} catch (e) {
  checks.push({
    name: 'duplicate plan should fail',
    ok: e instanceof PlanRuleError && e.body.error === 'PLAN_EXISTS',
  });
}

await saveStudyPlan(carolId, carolSeedCourses);

await closeDb();

let failed = false;
for (const c of checks) {
  const status = c.ok ? 'OK' : 'FAIL';
  if (!c.ok) failed = true;
  console.log(
    `${status}: ${c.name}${c.value !== undefined ? ` (${JSON.stringify(c.value)})` : ''}`
  );
}

process.exit(failed ? 1 : 0);
