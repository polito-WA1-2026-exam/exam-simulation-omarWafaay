/**
 * HTTP tests for auth APIs (stop nodemon on 3001 before running).
 * Usage: node verify-auth-api.mjs
 */
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const base = 'http://localhost:3001';
const cwd = path.dirname(fileURLToPath(import.meta.url));

function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return '';
  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
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

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  const setCookie = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie');
  return {
    status: res.status,
    json,
    cookie: parseCookies(setCookie),
  };
}

async function waitForServer(child, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch {
      /* not ready */
    }
    await delay(200);
    if (child.exitCode !== null) {
      throw new Error(`Server exited with code ${child.exitCode}`);
    }
  }
  throw new Error('Server did not start in time');
}

const child = spawn(process.execPath, ['index.js'], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let failed = false;
function fail(msg) {
  console.log('FAIL:', msg);
  failed = true;
}
function ok(msg) {
  console.log('OK:', msg);
}

try {
  await waitForServer(child);

  const health = await request('GET', '/api/health');
  if (health.status !== 200 || health.json?.ok !== true) {
    fail(`GET /api/health → ${health.status}`);
  } else {
    ok('GET /api/health');
  }

  const noAuth = await request('GET', '/api/db-check');
  if (noAuth.status !== 401) {
    fail(`GET /api/db-check without cookie → ${noAuth.status}, expected 401`);
  } else {
    ok('GET /api/db-check without cookie → 401');
  }

  const noSession = await request('GET', '/api/sessions/current');
  if (noSession.status !== 401) {
    fail(`GET /api/sessions/current without cookie → ${noSession.status}`);
  } else {
    ok('GET /api/sessions/current without cookie → 401');
  }

  const badLogin = await request('POST', '/api/sessions', {
    body: { username: 'player1', password: 'wrong' },
  });
  if (badLogin.status !== 401) {
    fail(`POST /api/sessions wrong password → ${badLogin.status}`);
  } else {
    ok('POST /api/sessions wrong password → 401');
  }

  const login = await request('POST', '/api/sessions', {
    body: { username: 'player1', password: 'password' },
  });
  if (login.status !== 201) {
    fail(`POST /api/sessions → ${login.status} ${JSON.stringify(login.json)}`);
  } else if (login.json?.username !== 'player1' || !login.json?.id) {
    fail(`POST /api/sessions body ${JSON.stringify(login.json)}`);
  } else {
    ok('POST /api/sessions → 201 + user');
  }

  if (!login.cookie) {
    fail('POST /api/sessions did not set session cookie');
  } else {
    ok('POST /api/sessions sets session cookie');
  }

  const current = await request('GET', '/api/sessions/current', {
    cookie: login.cookie,
  });
  if (current.status !== 200 || current.json?.username !== 'player1') {
    fail(
      `GET /api/sessions/current with cookie → ${current.status} ${JSON.stringify(current.json)}`
    );
  } else {
    ok('GET /api/sessions/current with cookie → user');
  }

  const dbAuth = await request('GET', '/api/db-check', { cookie: login.cookie });
  if (dbAuth.status !== 200 || dbAuth.json?.stations !== 12) {
    fail(`GET /api/db-check with cookie → ${dbAuth.status} ${JSON.stringify(dbAuth.json)}`);
  } else {
    ok('GET /api/db-check with cookie → 200');
  }

  const logout = await request('DELETE', '/api/sessions/current', {
    cookie: login.cookie,
  });
  if (logout.status !== 204) {
    fail(`DELETE /api/sessions/current → ${logout.status}`);
  } else {
    ok('DELETE /api/sessions/current → 204');
  }

  const afterLogout = await request('GET', '/api/sessions/current', {
    cookie: login.cookie,
  });
  if (afterLogout.status !== 401) {
    fail(`GET /api/sessions/current after logout → ${afterLogout.status}`);
  } else {
    ok('GET /api/sessions/current after logout → 401');
  }
} catch (err) {
  fail(err.message);
} finally {
  child.kill('SIGTERM');
  await delay(300);
}

process.exit(failed ? 1 : 0);
