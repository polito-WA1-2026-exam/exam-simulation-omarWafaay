import express from 'express';
import cors from 'cors';
import { initDb, get } from './db.js';

const app = express();
const port = 3001;
const clientOrigin = 'http://localhost:5173';

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

/** Dev helper — confirms DB seed after Step 1 */
app.get('/api/db-check', async (req, res) => {
  try {
    const [lines, stations, events, users, interchanges] = await Promise.all([
      get('SELECT COUNT(*) AS n FROM lines'),
      get('SELECT COUNT(*) AS n FROM stations'),
      get('SELECT COUNT(*) AS n FROM events'),
      get('SELECT COUNT(*) AS n FROM users'),
      get(
        `SELECT COUNT(*) AS n FROM (
           SELECT station_id FROM station_lines
           GROUP BY station_id HAVING COUNT(DISTINCT line_id) > 1
         )`
      ),
    ]);
    res.json({
      lines: lines.n,
      stations: stations.n,
      events: events.n,
      users: users.n,
      interchanges: interchanges.n,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  await initDb();
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
