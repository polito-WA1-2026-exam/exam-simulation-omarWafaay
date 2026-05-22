import { initDb, closeDb } from './db.js';
import { listCoursesForHomepage } from './dao.js';

await initDb();
const courses = await listCoursesForHomepage();
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
  name: '01TXYOV enrollment 3',
  ok: txy?.enrollment === 3,
  value: txy?.enrollment,
});
checks.push({
  name: '01URSPD enrollment 2',
  ok: urspd?.enrollment === 2,
  value: urspd?.enrollment,
});

const bidov = courses.find((c) => c.code === '05BIDOV');
checks.push({
  name: '05BIDOV preparatoryCode',
  ok: bidov?.preparatoryCode === '02GOLOV',
  value: bidov?.preparatoryCode,
});

const sqjov = courses.find((c) => c.code === '01SQJOV');
checks.push({
  name: '01SQJOV two incompatibilities',
  ok: sqjov?.incompatibleWith?.length === 2,
  value: sqjov?.incompatibleWith,
});

const leaked = JSON.stringify(courses).includes('password');
checks.push({ name: 'no password in JSON', ok: !leaked });

let failed = false;
for (const c of checks) {
  const status = c.ok ? 'OK' : 'FAIL';
  if (!c.ok) failed = true;
  console.log(
    `${status}: ${c.name}${c.value !== undefined ? ` (${JSON.stringify(c.value)})` : ''}`
  );
}

process.exit(failed ? 1 : 0);
