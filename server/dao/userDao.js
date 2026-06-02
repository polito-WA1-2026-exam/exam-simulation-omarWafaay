import crypto from 'crypto';
import { promisify } from 'util';
import { get } from '../db.js';

const scrypt = promisify(crypto.scrypt);

/**
 * Verify credentials (WA1 week05 pattern: scrypt + per-user salt).
 * @returns {{ id: number, username: string } | false}
 */
export async function getUser(username, password) {
  const row = await get(
    'SELECT id, username, password, salt FROM users WHERE username = ?',
    [username]
  );
  if (row === undefined) {
    return false;
  }

  const hashedPassword = await scrypt(password, row.salt, 16);
  const stored = Buffer.from(row.password, 'hex');
  if (
    stored.length !== hashedPassword.length ||
    !crypto.timingSafeEqual(stored, hashedPassword)
  ) {
    return false;
  }

  return { id: row.id, username: row.username };
}
