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

const stations = await all(db, 'SELECT id, name FROM stations');
const nameToId = Object.fromEntries(stations.map((s) => [s.name, s.id]));
const idToName = Object.fromEntries(stations.map((s) => [s.id, s.name]));

const segments = await all(
  db,
  `SELECT seg.station_a_id, seg.station_b_id, s1.name AS a, s2.name AS b
   FROM segments seg
   JOIN stations s1 ON s1.id = seg.station_a_id
   JOIN stations s2 ON s2.id = seg.station_b_id`
);
const segmentSet = new Set(
  segments.map((s) => `${s.station_a_id}-${s.station_b_id}`)
);

function hasSegment(a, b) {
  const idA = nameToId[a];
  const idB = nameToId[b];
  const lo = Math.min(idA, idB);
  const hi = Math.max(idA, idB);
  return segmentSet.has(`${lo}-${hi}`);
}

const lineMembership = await all(
  db,
  `SELECT l.name AS line, s.name AS station, sl.position
   FROM station_lines sl
   JOIN lines l ON l.id = sl.line_id
   JOIN stations s ON s.id = sl.station_id`
);

const stationLines = {};
for (const row of lineMembership) {
  if (!stationLines[row.station]) stationLines[row.station] = new Set();
  stationLines[row.station].add(row.line);
}

function isInterchange(stationName) {
  return (stationLines[stationName]?.size ?? 0) > 1;
}

function linesForSegment(a, b) {
  const target = [a, b].sort().join('|'); // names for line adjacency pairs
  const result = new Set();
  const byLine = {};
  for (const row of lineMembership) {
    if (!byLine[row.line]) byLine[row.line] = [];
    byLine[row.line].push(row);
  }
  for (const line of Object.keys(byLine)) {
    const ordered = byLine[line].sort((x, y) => x.position - y.position);
    for (let i = 0; i < ordered.length - 1; i++) {
      const pair = [ordered[i].station, ordered[i + 1].station].sort().join('|');
      if (pair === target) result.add(line);
    }
  }
  return [...result];
}

function validateRoute(game) {
  const route = JSON.parse(game.route_json);
  const issues = [];
  const startName = idToName[game.start_station_id];
  const destName = idToName[game.dest_station_id];

  if (route.length === 0) return ['empty route'];

  const [firstFrom] = route[0];
  const [, lastTo] = route[route.length - 1];
  if (firstFrom !== startName) issues.push(`starts at ${firstFrom}, expected ${startName}`);
  if (lastTo !== destName) issues.push(`ends at ${lastTo}, expected ${destName}`);

  let prevTo = null;
  for (let i = 0; i < route.length; i++) {
    const [from, to] = route[i];
    if (!hasSegment(from, to)) issues.push(`unknown segment ${from}—${to}`);
    if (i > 0 && from !== prevTo) issues.push(`gap: expected ${prevTo}, got ${from}`);
    prevTo = to;
  }

  if (route.length < 3) issues.push(`only ${route.length} segments (need ≥3)`);

  for (let i = 0; i < route.length - 1; i++) {
    const [a1, b1] = route[i];
    const [a2, b2] = route[i + 1];
    if (a2 !== b1) continue;
    const shared = linesForSegment(a1, b1).filter((l) => linesForSegment(a2, b2).includes(l));
    if (shared.length === 0 && !isInterchange(b1)) {
      issues.push(`illegal line change at ${b1}`);
    }
  }

  return issues;
}

console.log('=== NETWORK ===\n');
const byLine = {};
for (const row of lineMembership) {
  if (!byLine[row.line]) byLine[row.line] = [];
  byLine[row.line].push(row);
}
let expectedCount = 0;
for (const line of Object.keys(byLine)) {
  const ordered = byLine[line].sort((x, y) => x.position - y.position);
  for (let i = 0; i < ordered.length - 1; i++) {
    expectedCount++;
    const [a, b] = [ordered[i].station, ordered[i + 1].station];
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
