/**
 * Build a valid route body for a game in planning and write route-body.json.
 *
 * Usage (server must be running so database.sqlite is up to date):
 *   node print-route-for-game.mjs <gameId>
 *
 * Then in test.http, the PUT /route request reads < route-body.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { attachToExistingDb, get } from './db.js';
import { findValidRouteSegments } from './services/routeValidator.js';

const gameId = Number.parseInt(process.argv[2], 10);
if (!Number.isInteger(gameId) || gameId < 1) {
  console.error('Usage: node print-route-for-game.mjs <gameId>');
  process.exit(1);
}

const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'route-body.json');

await attachToExistingDb();

const game = await get(
  `SELECT id, status, start_station_id, dest_station_id
   FROM games WHERE id = ?`,
  [gameId]
);

if (!game) {
  console.error(`Game #${gameId} not found`);
  process.exit(1);
}
if (game.status !== 'planning') {
  console.error(`Game #${gameId} is "${game.status}" — need status "planning"`);
  process.exit(1);
}

const segments = await findValidRouteSegments(
  game.start_station_id,
  game.dest_station_id
);

if (!segments) {
  console.error(`No valid route found for start=${game.start_station_id} dest=${game.dest_station_id}`);
  process.exit(1);
}

const body = { segments };
fs.writeFileSync(outPath, `${JSON.stringify(body, null, 2)}\n`);
console.log(`Wrote ${outPath} for game #${gameId}`);
console.log(`  start=${game.start_station_id} dest=${game.dest_station_id}`);
console.log(`  ${segments.length} legs`);
