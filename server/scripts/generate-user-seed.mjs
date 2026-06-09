/** One-off: print INSERT values for users (scrypt + salt, WA1 week05 style). */
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

const USERS = ['Omar', 'Paolo', 'Francesca', 'Alice', 'Marco', 'Giulia'];

for (const username of USERS) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt('password', salt, 16);
  console.log(
    `  ('${username}', '${hash.toString('hex')}', '${salt}'),`
  );
}
