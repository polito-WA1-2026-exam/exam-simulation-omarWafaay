import express from 'express';
import cors from 'cors';
import { initDb, get, all } from './db.js';

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

app.get('/api/db-check', async (req, res) => {
  try {
    const courseCount = (await get('SELECT COUNT(*) AS n FROM courses')).n;
    const coursesAtMaxEnrollment = await all(
      `SELECT c.code, c.max_students, COUNT(spc.course_code) AS enrollment
       FROM courses c
       LEFT JOIN study_plan_courses spc ON spc.course_code = c.code
       WHERE c.max_students IS NOT NULL
       GROUP BY c.code
       HAVING enrollment >= c.max_students`
    );
    res.json({ courseCount, coursesAtMaxEnrollment });
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
