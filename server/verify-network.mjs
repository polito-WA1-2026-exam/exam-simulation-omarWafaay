/**
 * HTTP tests for network read APIs. Stop server on 3001 first.
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

  const res = await fetch(`${base}${pathName}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
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

const child = spawn(process.execPath, ['index.js'], { cwd, stdio: 'ignore' });
let failed = false;
const fail = (m) => {
  console.log('FAIL:', m);
  failed = true;
};
const ok = (m) => console.log('OK:', m);

try {
  await waitForServer(child);

  const anon = await request('GET', '/api/network?view=full');
  if (anon.status !== 401) fail(`anonymous network → ${anon.status}`);
  else ok('GET /api/network without login → 401');

  const login = await request('POST', '/api/sessions', {
    body: { username: 'player1', password: 'password' },
  });
  if (!login.cookie) fail('login cookie missing');

  const full = await request('GET', '/api/network?view=full', { cookie: login.cookie });
  if (full.status !== 200) fail(`full network → ${full.status}`);
  else if (full.json?.lines?.length !== 4) fail(`expected 4 lines, got ${full.json?.lines?.length}`);
  else if (full.json?.segments?.length !== 15) fail(`expected 15 segments, got ${full.json?.segments?.length}`);
  else if (!full.json.lines[0].stations?.length) fail('line missing stations');
  else ok('GET /api/network?view=full');

  const planning = await request('GET', '/api/network?view=planning', { cookie: login.cookie });
  if (planning.status !== 200) fail(`planning network → ${planning.status}`);
  else if (planning.json?.lines) fail('planning must not include lines');
  else if (planning.json?.segments) fail('planning must not include segments');
  else if (planning.json?.stations?.length !== 12) fail(`expected 12 stations, got ${planning.json?.stations?.length}`);
  else ok('GET /api/network?view=planning');

  const badView = await request('GET', '/api/network?view=invalid', { cookie: login.cookie });
  if (badView.status !== 400) fail(`bad view → ${badView.status}`);
  else ok('GET /api/network bad view → 400');

  const segments = await request('GET', '/api/segments', { cookie: login.cookie });
  if (segments.status !== 200) fail(`segments → ${segments.status}`);
  else if (segments.json?.segments?.length !== 15) fail(`segments count ${segments.json?.segments?.length}`);
  else if (!segments.json.segments[0].fromId || !segments.json.segments[0].from) {
    fail('segment missing id or name');
  } else ok('GET /api/segments');
} catch (e) {
  fail(e.message);
} finally {
  child.kill('SIGTERM');
  await delay(300);
}

process.exit(failed ? 1 : 0);
