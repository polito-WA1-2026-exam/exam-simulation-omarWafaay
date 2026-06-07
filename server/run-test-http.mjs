/**
 * Runs server/test.http requests in order (same flow as REST Client).
 * Starts its own server on 3001 — stop nodemon first if port is busy.
 */
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { attachToExistingDb } from './db.js';
import { findValidRouteSegments } from './services/routeValidator.js';

const base = 'http://localhost:3001';
const cwd = path.dirname(fileURLToPath(import.meta.url));

function parseCookies(setCookie) {
  if (!setCookie) return '';
  const headers = Array.isArray(setCookie) ? setCookie : [setCookie];
  return headers.map((h) => h.split(';')[0]).join('; ');
}

async function request(method, pathName, { body, cookie, label } = {}) {
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
  return { label, status: res.status, json, cookie: parseCookies(setCookie) };
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

  let cookie = '';

  const steps = [
    { label: 'GET /api/health', run: () => request('GET', '/api/health') },
    {
      label: 'GET /api/db-check (no login) → 401',
      run: () => request('GET', '/api/db-check'),
      expect: (r) => r.status === 401,
    },
    {
      label: 'POST /api/sessions (Paolo)',
      run: () =>
        request('POST', '/api/sessions', {
          body: { username: 'Paolo', password: 'password' },
        }),
      expect: (r) => r.status === 201 && r.cookie,
      after: (r) => {
        cookie = r.cookie;
      },
    },
    {
      label: 'GET /api/sessions/current',
      run: () => request('GET', '/api/sessions/current', { cookie }),
      expect: (r) => r.status === 200 && r.json?.username === 'Paolo',
    },
    {
      label: 'GET /api/db-check (with session)',
      run: () => request('GET', '/api/db-check', { cookie }),
      expect: (r) => r.status === 200,
    },
    {
      label: 'GET /api/network?view=full',
      run: () => request('GET', '/api/network?view=full', { cookie }),
      expect: (r) => r.status === 200 && r.json?.lines?.length === 4,
    },
    {
      label: 'GET /api/network?view=planning',
      run: () => request('GET', '/api/network?view=planning', { cookie }),
      expect: (r) => r.status === 200 && r.json?.stations?.length === 12,
    },
    {
      label: 'GET /api/segments',
      run: () => request('GET', '/api/segments', { cookie }),
      expect: (r) => r.status === 200 && r.json?.segments?.length === 14,
    },
    {
      label: 'POST /api/games',
      run: () => request('POST', '/api/games', { cookie }),
      expect: (r) => r.status === 201 && r.json?.status === 'setup',
      after: (r) => {
        globalThis.gameId = r.json.id;
      },
    },
    {
      label: 'POST /api/games/:id/planning',
      run: () => request('POST', `/api/games/${globalThis.gameId}/planning`, { cookie }),
      expect: (r) => r.status === 200 && r.json?.status === 'planning',
      after: (r) => {
        globalThis.planning = r.json;
      },
    },
    {
      label: 'PUT /api/games/:id/route (valid route for planning start/dest)',
      run: async () => {
        await attachToExistingDb();
        const segments = await findValidRouteSegments(
          globalThis.planning.startStationId,
          globalThis.planning.destinationStationId
        );
        if (!segments) throw new Error('findValidRouteSegments returned null');
        return request('PUT', `/api/games/${globalThis.gameId}/route`, {
          cookie,
          body: { segments },
        });
      },
      expect: (r) => r.status === 200 && r.json?.valid === true && Array.isArray(r.json?.steps),
    },
    {
      label: 'GET /api/games/:id',
      run: () => request('GET', `/api/games/${globalThis.gameId}`, { cookie }),
      expect: (r) => r.status === 200 && r.json?.status === 'completed',
    },
    {
      label: 'GET /api/ranking',
      run: () => request('GET', '/api/ranking', { cookie }),
      expect: (r) => {
        if (r.status !== 200 || !Array.isArray(r.json) || r.json.length < 1) return false;
        if (r.json[0].username !== 'Paolo' || typeof r.json[0].bestScore !== 'number') {
          return false;
        }
        for (let i = 1; i < r.json.length; i++) {
          if (r.json[i].bestScore > r.json[i - 1].bestScore) return false;
        }
        return !r.json.some((row) => row.username === 'Francesca');
      },
    },
    {
      label: 'DELETE /api/sessions/current',
      run: () => request('DELETE', '/api/sessions/current', { cookie }),
      expect: (r) => r.status === 204,
      after: () => {
        cookie = '';
      },
    },
    {
      label: 'GET /api/sessions/current after logout → 401',
      run: () => request('GET', '/api/sessions/current'),
      expect: (r) => r.status === 401,
    },
  ];

  for (const step of steps) {
    const res = await step.run();
    const warn = step.warnIf?.();
    if (warn) console.log('NOTE:', warn);

    if (step.expect) {
      if (!step.expect(res)) {
        fail(`${step.label} → status ${res.status} ${JSON.stringify(res.json)}`);
      } else {
        ok(step.label);
      }
    } else {
      if (res.status >= 200 && res.status < 300) ok(step.label);
      else fail(`${step.label} → status ${res.status}`);
    }
    step.after?.(res);
  }
} catch (e) {
  fail(e.message);
} finally {
  child.kill('SIGTERM');
  await delay(300);
}

process.exit(failed ? 1 : 0);
