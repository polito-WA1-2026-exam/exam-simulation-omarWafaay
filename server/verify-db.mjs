import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, get, all, closeDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'studyplan.sqlite');

await closeDb();
if (fs.existsSync(DB_PATH)) {
  try {
    fs.unlinkSync(DB_PATH);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn('DB file locked (close IDE connection); verifying existing data.');
    } else {
      throw err;
    }
  }
}

await initDb();

const checks = [];

const courseCount = (await get('SELECT COUNT(*) AS n FROM courses')).n;
checks.push({ name: '22 courses', ok: courseCount === 22, value: courseCount });

const modes = await all('SELECT mode, COUNT(*) AS n FROM study_plans GROUP BY mode');
const hasFull = modes.some((r) => r.mode === 'full' && r.n >= 1);
const hasPart = modes.some((r) => r.mode === 'part' && r.n >= 1);
checks.push({ name: 'full-time plan seeded', ok: hasFull });
checks.push({ name: 'part-time plan seeded', ok: hasPart });

const atMax = await all(
  `SELECT c.code, c.max_students, COUNT(spc.course_code) AS enrollment
   FROM courses c
   LEFT JOIN study_plan_courses spc ON spc.course_code = c.code
   WHERE c.max_students IS NOT NULL
   GROUP BY c.code
   HAVING enrollment >= c.max_students`
);
checks.push({
  name: 'at least 2 courses at max enrollment',
  ok: atMax.length >= 2,
  value: atMax.map((r) => r.code),
});

const prepOnCourses = (
  await get('SELECT COUNT(*) AS n FROM courses WHERE preparatory_code IS NOT NULL')
).n;
checks.push({ name: '3 preparatory_code values', ok: prepOnCourses === 3, value: prepOnCourses });

const incompatCount = (await get('SELECT COUNT(*) AS n FROM incompatibilities')).n;
checks.push({
  name: '16 incompatibilities (both directions)',
  ok: incompatCount === 16,
  value: incompatCount,
});

const userCount = (await get('SELECT COUNT(*) AS n FROM users')).n;
checks.push({ name: '5 users', ok: userCount >= 5, value: userCount });

const creditRanges = await all(
  `SELECT sp.id, sp.mode, SUM(c.credits) AS total
   FROM study_plans sp
   JOIN study_plan_courses spc ON spc.plan_id = sp.id
   JOIN courses c ON c.code = spc.course_code
   GROUP BY sp.id`
);
for (const row of creditRanges) {
  const ok =
    row.mode === 'full'
      ? row.total >= 60 && row.total <= 80
      : row.total >= 20 && row.total <= 40;
  checks.push({
    name: `plan ${row.id} (${row.mode}) credits ${row.total}`,
    ok,
  });
}

let failed = false;
for (const c of checks) {
  const status = c.ok ? 'OK' : 'FAIL';
  if (!c.ok) failed = true;
  console.log(
    `${status}: ${c.name}${c.value !== undefined ? ` (${JSON.stringify(c.value)})` : ''}`
  );
}

process.exit(failed ? 1 : 0);
