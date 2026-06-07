/**
 * Checks GET /api/segments data: real line edges, names, match with full network.
 * Usage: node verify-segments-list.mjs
 */
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { segmentKey } from './services/routeValidator.js';

const base = 'http://localhost:3001';
const cwd = path.dirname(fileURLToPath(import.meta.url));

async function login() {
  const res = await fetch(`${base}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: 'Omar', password: 'password' }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie');
  const headers = Array.isArray(setCookie) ? setCookie : [setCookie ? [setCookie] : []].flat();
  return headers.map((h) => h.split(';')[0]).join('; ');
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
  const cookie = await login();

  const [segRes, fullRes] = await Promise.all([
    fetch(`${base}/api/segments`, { headers: { Cookie: cookie, Accept: 'application/json' } }),
    fetch(`${base}/api/network?view=full`, { headers: { Cookie: cookie, Accept: 'application/json' } }),
  ]);
  const segJson = await segRes.json();
  const fullJson = await fullRes.json();
  const segments = segJson.segments ?? [];
  const fullSegments = fullJson.segments ?? [];

  if (segments.length !== 14) fail(`expected 14 segments, got ${segments.length}`);
  else ok(`segment count ${segments.length}`);

  const fullKeys = new Set(fullSegments.map((s) => segmentKey(s.fromId, s.toId)));
  const listKeys = new Set(segments.map((s) => segmentKey(s.fromId, s.toId)));
  if (fullKeys.size !== listKeys.size || [...fullKeys].some((k) => !listKeys.has(k))) {
    fail('GET /api/segments differs from view=full segments');
  } else ok('segments list matches full network segments');

  const lineEdges = new Set();
  for (const line of fullJson.lines ?? []) {
    const sts = line.stations ?? [];
    for (let i = 0; i < sts.length - 1; i++) {
      lineEdges.add(segmentKey(sts[i].id, sts[i + 1].id));
    }
  }

  for (const seg of segments) {
    const key = segmentKey(seg.fromId, seg.toId);
    if (!lineEdges.has(key)) {
      fail(`segment not on any line: ${seg.from} — ${seg.to} (${key})`);
    }
    if (seg.fromId >= seg.toId) {
      fail(`segment should be stored with fromId < toId: ${key}`);
    }
    if (!seg.from || !seg.to) fail(`segment missing names: ${key}`);
  }
  if (!failed) ok('every listed segment is a consecutive pair on some line');

  const stationIds = new Set((fullJson.lines ?? []).flatMap((l) => l.stations.map((s) => s.id)));
  for (const seg of segments) {
    if (!stationIds.has(seg.fromId) || !stationIds.has(seg.toId)) {
      fail(`segment references unknown station: ${seg.from} — ${seg.to}`);
    }
  }
  if (!failed) ok('segment endpoints are real stations');

  console.log('\nSegments shown in planning:');
  for (const s of segments) {
    console.log(`  ${s.fromId}—${s.toId}: ${s.from} — ${s.to}`);
  }
} catch (e) {
  fail(e.message);
} finally {
  child.kill('SIGTERM');
  await delay(300);
}

process.exit(failed ? 1 : 0);
