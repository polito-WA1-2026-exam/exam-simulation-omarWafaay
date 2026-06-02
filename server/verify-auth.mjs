import { initDb } from './db.js';
import { getUser } from './dao/userDao.js';

await initDb();

let failed = false;

const okUser = await getUser('player1', 'password');
if (!okUser || okUser.username !== 'player1') {
  console.log('FAIL: player1/password should login');
  failed = true;
} else {
  console.log('OK: player1/password');
}

const bad = await getUser('player1', 'wrong');
if (bad !== false) {
  console.log('FAIL: wrong password should return false');
  failed = true;
} else {
  console.log('OK: wrong password rejected');
}

const missing = await getUser('nobody', 'password');
if (missing !== false) {
  console.log('FAIL: unknown user should return false');
  failed = true;
} else {
  console.log('OK: unknown user rejected');
}

process.exit(failed ? 1 : 0);
