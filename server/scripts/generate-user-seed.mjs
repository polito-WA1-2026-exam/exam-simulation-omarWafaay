/** One-off: print INSERT values for users (scrypt + salt, WA1 week05 style). */
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

for (const username of ['player1', 'player2', 'player3']) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt('password', salt, 16);
  console.log(
    `  ('${username}', '${hash.toString('hex')}', '${salt}'),`
  );
}
