import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { initDb, get } from './db.js';
import { getUser } from './dao/userDao.js';
import { isLoggedIn } from './middleware/isLoggedIn.js';
import {
  getNetworkFull,
  getNetworkPlanning,
  listSegments,
} from './dao/networkDao.js';

const app = express();
const port = 3001;
const clientOrigin = 'http://localhost:5173';

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.use(
  session({
    secret: 'last-race-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    },
  })
);

passport.use(
  new LocalStrategy(async (username, password, cb) => {
    try {
      const user = await getUser(username, password);
      if (!user) {
        return cb(null, false, { message: 'Incorrect username or password.' });
      }
      return cb(null, user);
    } catch (err) {
      return cb(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.use(passport.authenticate('session'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

/** POST /api/sessions — login (Passport local + req.login for session cookie) */
app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      return res.status(201).json(user);
    });
  })(req, res, next);
});

/** GET /api/sessions/current */
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json(req.user);
  }
  return res.status(401).json({ error: 'UNAUTHORIZED' });
});

/** DELETE /api/sessions/current — logout */
app.delete('/api/sessions/current', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    return res.status(204).end();
  });
});

/** GET /api/network?view=full|planning */
app.get('/api/network', isLoggedIn, async (req, res, next) => {
  try {
    const view = req.query.view;
    if (view === 'full') {
      return res.json(await getNetworkFull());
    }
    if (view === 'planning') {
      return res.json(await getNetworkPlanning());
    }
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'view must be full or planning' });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/segments — all segment pairs for planning */
app.get('/api/segments', isLoggedIn, async (req, res, next) => {
  try {
    res.json(await listSegments());
  } catch (err) {
    return next(err);
  }
});

/** Dev helper — protected (tests auth) */
app.get('/api/db-check', isLoggedIn, async (req, res) => {
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
