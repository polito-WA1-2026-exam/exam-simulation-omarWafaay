import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { initDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database.sqlite');

function openDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve(db)));
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

if (!fs.existsSync(dbPath)) {
  await initDb();
}

const db = await openDb();

const segments = await all(
  db,
  'SELECT station_a_id, station_b_id FROM segments'
);
const segmentSet = new Set(
  segments.map((s) => `${s.station_a_id}-${s.station_b_id}`)
);

function segmentKey(a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${lo}-${hi}`;
}

function hasSegment(a, b) {
  return segmentSet.has(segmentKey(a, b));
}

const lineMembership = await all(
  db,
  `SELECT l.id AS lineId, s.id AS stationId, sl.position
   FROM station_lines sl
   JOIN lines l ON l.id = sl.line_id
   JOIN stations s ON s.id = sl.station_id`
);

const stationLineCount = await all(
  db,
  `SELECT station_id AS id, COUNT(DISTINCT line_id) AS n
   FROM station_lines
   GROUP BY station_id`
);
const interchangeIds = new Set(
  stationLineCount.filter((r) => r.n > 1).map((r) => r.id)
);

const byLine = {};
for (const row of lineMembership) {
  if (!byLine[row.lineId]) byLine[row.lineId] = [];
  byLine[row.lineId].push(row);
}

function linesForSegment(fromId, toId) {
  const lo = Math.min(fromId, toId);
  const hi = Math.max(fromId, toId);
  const result = new Set();
  for (const lineId of Object.keys(byLine)) {
    const ordered = byLine[lineId].sort((x, y) => x.position - y.position);
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i].stationId;
      const b = ordered[i + 1].stationId;
      if (Math.min(a, b) === lo && Math.max(a, b) === hi) {
        result.add(Number(lineId));
      }
    }
  }
  return result;
}

function validateRoute(game) {
  const route = JSON.parse(game.route_json);
  const issues = [];

  if (route.length === 0) return ['empty route'];

  const [firstFrom] = route[0];
  const [, lastTo] = route[route.length - 1];
  if (firstFrom !== game.start_station_id) {
    issues.push(`starts at ${firstFrom}, expected ${game.start_station_id}`);
  }
  if (lastTo !== game.dest_station_id) {
    issues.push(`ends at ${lastTo}, expected ${game.dest_station_id}`);
  }

  const usedSegments = new Set();
  let prevTo = null;
  for (const leg of route) {
    const [from, to] = leg;
    if (!hasSegment(from, to)) issues.push(`unknown segment ${from}—${to}`);
    const key = segmentKey(from, to);
    if (usedSegments.has(key)) issues.push(`duplicate segment ${key}`);
    usedSegments.add(key);
    if (prevTo !== null && from !== prevTo) issues.push(`gap: expected ${prevTo}, got ${from}`);
    prevTo = to;
  }

  if (route.length < 3) issues.push(`only ${route.length} segments (need ≥3)`);

  for (let i = 0; i < route.length - 1; i++) {
    const [a1, b1] = route[i];
    const [a2, b2] = route[i + 1];
    if (a2 !== b1) continue;
    const shared = [...linesForSegment(a1, b1)].filter((lineId) =>
      linesForSegment(a2, b2).has(lineId)
    );
    if (shared.length === 0 && !interchangeIds.has(b1)) {
      issues.push(`illegal line change at station ${b1}`);
    }
  }

  return issues;
}

const stationCount = (await all(db, 'SELECT COUNT(*) AS n FROM stations'))[0].n;
const interchangeCount = interchangeIds.size;
const maxInterchanges = Math.floor(stationCount / 2);
if (interchangeCount > maxInterchanges) {
  console.log(
    `FAIL interchange cap: ${interchangeCount} interchanges > ${maxInterchanges} (half of ${stationCount})`
  );
} else {
  console.log(
    `OK interchange cap: ${interchangeCount} interchanges (max ${maxInterchanges} for ${stationCount} stations)`
  );
}

console.log('\n=== NETWORK ===\n');
let expectedCount = 0;
for (const lineId of Object.keys(byLine)) {
  const ordered = byLine[lineId].sort((x, y) => x.position - y.position);
  for (let i = 0; i < ordered.length - 1; i++) {
    expectedCount++;
    const a = ordered[i].stationId;
    const b = ordered[i + 1].stationId;
    if (!hasSegment(a, b)) console.log('FAIL missing segment:', a, '—', b);
  }
}
console.log(`Segments: ${segments.length} in DB, ${expectedCount} expected from line adjacency`);

console.log('\n=== ROUTES ===\n');
const games = await all(
  db,
  `SELECT g.*, u.username FROM games g JOIN users u ON u.id = g.user_id`
);
for (const game of games) {
  const issues = validateRoute(game);
  console.log(
    `${game.username} game #${game.id} (score ${game.final_score}):`,
    issues.length ? issues.join('; ') : 'OK'
  );
}

console.log('\n=== SCORES / STEPS ===\n');
for (const game of games) {
  const steps = await all(
    db,
    `SELECT gs.step_order, gs.coins_after, e.description, e.effect
     FROM game_steps gs
     JOIN events e ON e.id = gs.event_id
     WHERE gs.game_id = ?
     ORDER BY gs.step_order`,
    [game.id]
  );
  if (steps.length === 0) {
    console.log(`${game.username} game #${game.id}: no steps — score ${game.final_score} not verified`);
    continue;
  }
  let coins = 20;
  const issues = [];
  for (const step of steps) {
    coins += step.effect;
    if (coins !== step.coins_after) {
      issues.push(`step ${step.step_order}: math gives ${coins}, DB ${step.coins_after}`);
    }
  }
  if (coins !== game.final_score) {
    issues.push(`final_score ${game.final_score} ≠ computed ${coins}`);
  }
  const route = JSON.parse(game.route_json);
  if (steps.length !== route.length) {
    issues.push(`${steps.length} steps vs ${route.length} route segments`);
  }
  console.log(`${game.username} game #${game.id}:`, issues.length ? issues.join('; ') : `OK (${game.final_score})`);
}

db.close();
