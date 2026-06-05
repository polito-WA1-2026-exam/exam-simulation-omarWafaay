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
import {
  beginPlanning,
  createGame,
  getGame,
  getRanking,
  submitRoute,
} from './dao/gameDao.js';

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

// --- Game flow: setup → planning (90s) → submit route → result ---
// Business logic is in gameDao + services; these handlers only parse HTTP and map errors.

// :id in the URL must be a positive integer.
function parseGameId(req) {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

// Body looks like { "segments": [[1, 6], [6, 7], ...] } — ids only, not station names.
function parseRouteBody(body) {
  if (!body || !Array.isArray(body.segments)) return null;
  const segments = [];
  for (const leg of body.segments) {
    if (!Array.isArray(leg) || leg.length !== 2) return null;
    const [fromId, toId] = leg;
    if (!Number.isInteger(fromId) || !Number.isInteger(toId)) return null;
    segments.push([fromId, toId]);
  }
  return segments;
}

// Player logged in, sees full map, has 20 coins — no start/dest yet.
app.post('/api/games', isLoggedIn, async (req, res, next) => {
  try {
    const game = await createGame(req.user.id);
    return res.status(201).json(game);
  } catch (err) {
    return next(err);
  }
});

// Player ready: server assigns start + destination and returns planningDeadline.
app.post('/api/games/:id/planning', isLoggedIn, async (req, res, next) => {
  try {
    const gameId = parseGameId(req);
    if (!gameId) return res.status(400).json({ error: 'BAD_REQUEST' });

    const outcome = await beginPlanning(gameId, req.user.id);
    if (outcome.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    if (outcome.error === 'INVALID_STATE') {
      return res.status(409).json({ error: 'INVALID_STATE' });
    }
    return res.json(outcome.game);
  } catch (err) {
    return next(err);
  }
});

// Submit route (manual or timer). One response: valid/invalid, score, and all steps if valid.
app.put('/api/games/:id/route', isLoggedIn, async (req, res, next) => {
  try {
    const gameId = parseGameId(req);
    if (!gameId) return res.status(400).json({ error: 'BAD_REQUEST' });

    const segments = parseRouteBody(req.body);
    if (segments === null) return res.status(400).json({ error: 'BAD_REQUEST' });

    const outcome = await submitRoute(gameId, req.user.id, segments);
    if (outcome.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    if (outcome.error === 'INVALID_STATE') {
      return res.status(409).json({ error: 'INVALID_STATE' });
    }
    if (outcome.error === 'PLANNING_EXPIRED') {
      return res.status(409).json({ error: 'PLANNING_EXPIRED' });
    }
    return res.json(outcome.result);
  } catch (err) {
    return next(err);
  }
});

// Leaderboard: each user's best completed game score, highest first.
app.get('/api/ranking', isLoggedIn, async (req, res, next) => {
  try {
    res.json(await getRanking());
  } catch (err) {
    return next(err);
  }
});

// Reload game state; only the owner gets 200 (others get 404).
app.get('/api/games/:id', isLoggedIn, async (req, res, next) => {
  try {
    const gameId = parseGameId(req);
    if (!gameId) return res.status(400).json({ error: 'BAD_REQUEST' });

    const outcome = await getGame(gameId, req.user.id);
    if (outcome.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    return res.json(outcome.game);
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
