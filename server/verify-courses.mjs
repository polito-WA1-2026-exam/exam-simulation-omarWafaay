import { initDb, closeDb } from './db.js';
import { listCoursesForHomepage, getStudentByUsername } from './dao.js';
import { Course, Student } from './StudyPlanModels.js';

await initDb();
const courses = await listCoursesForHomepage();
const alice = await getStudentByUsername('alice');
await closeDb();

const checks = [];

checks.push({ name: '22 courses', ok: courses.length === 22, value: courses.length });

const names = courses.map((c) => c.name);
const sorted = [...names].sort((a, b) => a.localeCompare(b));
checks.push({
  name: 'sorted by name',
  ok: names.every((n, i) => n === sorted[i]),
});

const txy = courses.find((c) => c.code === '01TXYOV');
const urspd = courses.find((c) => c.code === '01URSPD');
checks.push({
  name: '01TXYOV enrolled 3',
  ok: txy?.enrolled === 3,
  value: txy?.enrolled,
});
checks.push({
  name: '01URSPD enrolled 2',
  ok: urspd?.enrolled === 2,
  value: urspd?.enrolled,
});

const bidov = courses.find((c) => c.code === '05BIDOV');
checks.push({
  name: '05BIDOV preparatoryCourse',
  ok: bidov?.preparatoryCourse === '02GOLOV',
  value: bidov?.preparatoryCourse,
});

const sqjov = courses.find((c) => c.code === '01SQJOV');
checks.push({
  name: '01SQJOV two incompatible',
  ok: sqjov?.incompatible?.length === 2,
  value: sqjov?.incompatible,
});

const leaked = JSON.stringify(courses).includes('password');
checks.push({ name: 'no password in JSON', ok: !leaked });

checks.push({
  name: 'Course model instances',
  ok: courses.every((c) => c instanceof Course),
});

checks.push({
  name: 'Student model for alice',
  ok:
    alice instanceof Student &&
    alice.email === 'alice' &&
    alice.planType === 'full',
  value: { email: alice?.email, planType: alice?.planType },
});

let failed = false;
for (const c of checks) {
  const status = c.ok ? 'OK' : 'FAIL';
  if (!c.ok) failed = true;
  console.log(
    `${status}: ${c.name}${c.value !== undefined ? ` (${JSON.stringify(c.value)})` : ''}`
  );
}

process.exit(failed ? 1 : 0);
