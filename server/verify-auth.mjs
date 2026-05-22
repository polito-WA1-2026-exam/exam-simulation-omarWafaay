import { initDb, closeDb } from './db.js';
import { verifyStudentLogin } from './dao.js';
import { Student } from './StudyPlanModels.js';

await initDb();

const checks = [];

const alice = await verifyStudentLogin('alice', 'password');
checks.push({
  name: 'alice valid password',
  ok: alice instanceof Student && alice.planType === 'full',
});

const bad = await verifyStudentLogin('alice', 'wrong');
checks.push({ name: 'alice wrong password', ok: bad === false });

const missing = await verifyStudentLogin('nobody', 'password');
checks.push({ name: 'unknown user', ok: missing === false });

await closeDb();

let failed = false;
for (const c of checks) {
  const status = c.ok ? 'OK' : 'FAIL';
  if (!c.ok) failed = true;
  console.log(`${status}: ${c.name}`);
}

process.exit(failed ? 1 : 0);
