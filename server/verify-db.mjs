import { initDb, get, all } from './db.js';

await initDb();

const lineCount = (await get('SELECT COUNT(*) AS n FROM lines')).n;
const stationCount = (await get('SELECT COUNT(*) AS n FROM stations')).n;
const segmentCount = (await get('SELECT COUNT(*) AS n FROM segments')).n;
const eventCount = (await get('SELECT COUNT(*) AS n FROM events')).n;
const userCount = (await get('SELECT COUNT(*) AS n FROM users')).n;

const interchanges = await all(
  `SELECT s.name, COUNT(DISTINCT sl.line_id) AS line_count
   FROM stations s
   JOIN station_lines sl ON sl.station_id = s.id
   GROUP BY s.id
   HAVING line_count > 1
   ORDER BY s.name`
);

const completedByUser = await all(
  `SELECT u.username, COUNT(g.id) AS games, MAX(g.final_score) AS best_score
   FROM users u
   LEFT JOIN games g ON g.user_id = u.id AND g.status = 'completed'
   GROUP BY u.id
   ORDER BY u.username`
);

const checks = [
  ['lines >= 4', lineCount >= 4, lineCount],
  ['stations >= 12', stationCount >= 12, stationCount],
  ['interchanges >= 3', interchanges.length >= 3, interchanges.length],
  ['segments > 0', segmentCount > 0, segmentCount],
  ['events >= 8', eventCount >= 8, eventCount],
  ['users >= 3', userCount >= 3, userCount],
];

let failed = false;
for (const [label, ok, value] of checks) {
  console.log(ok ? 'OK' : 'FAIL', `${label}:`, value);
  if (!ok) failed = true;
}

console.log('Interchange stations:', interchanges.map((r) => r.name).join(', '));
console.log('Users / games:', completedByUser);

const withWins = completedByUser.filter((r) => r.games >= 1);
if (withWins.length < 2) {
  console.log('FAIL: need at least 2 users with completed games');
  failed = true;
} else {
  console.log('OK: at least 2 users with completed games');
}

process.exit(failed ? 1 : 0);
