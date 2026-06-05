/**
 * HTTP tests for GET /api/ranking.
 * Usage: node verify-ranking.mjs
 */
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const base = 'http://localhost:3001';
const cwd = path.dirname(fileURLToPath(import.meta.url));

function parseCookies(setCookie) {
  if (!setCookie) return '';
  const headers = Array.isArray(setCookie) ? setCookie : [setCookie];
  return headers.map((h) => h.split(';')[0]).join('; ');
}

async function request(method, pathName, { body, cookie } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${base}${pathName}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  const setCookie = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie');
  return { status: res.status, json, cookie: parseCookies(setCookie) };
}

async function waitForServer(child) {
  for (let i = 0; i < 75; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {
      /* wait */
    }
    await delay(200);
    if (child.exitCode !== null) throw new Error('Server exited early');
  }
  throw new Error('Server timeout');
}

async function login(username) {
  const res = await request('POST', '/api/sessions', {
    body: { username, password: 'password' },
  });
  if (!res.cookie) throw new Error(`login failed for ${username}`);
  return res.cookie;
}

const child = spawn(process.execPath, ['index.js'], { cwd, stdio: 'ignore' });
let failed = false;
const fail = (m) => {
  console.log('FAIL:', m);
  failed = true;
};
const ok = (m) => console.log('OK:', m);

try {
  await waitForServer(child);

  // Exam: anonymous users cannot see ranking.
  const anon = await request('GET', '/api/ranking');
  if (anon.status !== 401 || anon.json?.error !== 'UNAUTHORIZED') {
    fail(`anonymous ranking → ${anon.status} / ${anon.json?.error}`);
  } else ok('GET /api/ranking without login → 401 UNAUTHORIZED');

  const cookie = await login('player1');
  const ranking = await request('GET', '/api/ranking', { cookie });

  if (ranking.status !== 200) fail(`ranking → ${ranking.status}`);
  else if (!Array.isArray(ranking.json)) fail('ranking must be a JSON array');
  else if (ranking.json.length !== 2) {
    fail(`expected 2 ranked users from seed, got ${ranking.json.length}`);
  } else if (ranking.json[0].username !== 'player2' || ranking.json[0].bestScore !== 22) {
    fail(`first place should be player2/22, got ${JSON.stringify(ranking.json[0])}`);
  } else if (ranking.json[1].username !== 'player1' || ranking.json[1].bestScore !== 21) {
    fail(`second place should be player1/21, got ${JSON.stringify(ranking.json[1])}`);
  } else if (ranking.json.some((r) => r.username === 'player3')) {
    fail('player3 has no completed games and should be omitted');
  } else ok('GET /api/ranking → player2 (22) above player1 (21)');
} catch (e) {
  fail(e.message);
} finally {
  child.kill('SIGTERM');
  await delay(300);
}

process.exit(failed ? 1 : 0);
