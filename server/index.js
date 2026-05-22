import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { initDb, get, all } from './db.js';
import { listCoursesForHomepage, verifyStudentLogin } from './dao.js';
import {
  getStudyPlanByUserId,
  createStudyPlan,
  deleteStudyPlan,
  addCourseToStudyPlan,
  removeCourseFromStudyPlan,
  saveStudyPlan,
  PlanRuleError,
} from './studyPlanDao.js';

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
    secret: 'studyplan-session-secret',
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
      const student = await verifyStudentLogin(username, password);
      if (!student) {
        return cb(null, false, { message: 'Incorrect username or password.' });
      }
      return cb(null, student);
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

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Not authorized' });
};

app.get('/', (req, res) => {
  res.send('Hello from the server!');
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/courses', async (req, res) => {
  try {
    res.json(await listCoursesForHomepage());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/sessions — login (username + password in body) */
app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: info?.message ?? 'Invalid credentials' });
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      return res.status(201).json(user);
    });
  })(req, res, next);
});

/** GET /api/sessions/current — current logged-in student */
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json(req.user);
  }
  return res.status(401).json({ error: 'Not authenticated' });
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

function handlePlanError(err, res, next) {
  if (err instanceof PlanRuleError) {
    return res.status(err.status ?? 400).json(err.body);
  }
  return next(err);
}

/** GET /api/study-plan — saved plan or null */
app.get('/api/study-plan', isLoggedIn, async (req, res, next) => {
  try {
    const plan = await getStudyPlanByUserId(req.user.studentId);
    res.json(plan);
  } catch (err) {
    handlePlanError(err, res, next);
  }
});

/** POST /api/study-plan — create empty plan { mode: "full" | "part" } */
app.post('/api/study-plan', isLoggedIn, async (req, res, next) => {
  try {
    const plan = await createStudyPlan(req.user.studentId, req.body?.mode);
    res.status(201).json(plan);
  } catch (err) {
    handlePlanError(err, res, next);
  }
});

/** PUT /api/study-plan — save; optional body { courses: string[] } for cancel/save full list */
app.put('/api/study-plan', isLoggedIn, async (req, res, next) => {
  try {
    const courseCodes = req.body?.courses ?? null;
    const plan = await saveStudyPlan(req.user.studentId, courseCodes);
    res.json(plan);
  } catch (err) {
    handlePlanError(err, res, next);
  }
});

/** DELETE /api/study-plan */
app.delete('/api/study-plan', isLoggedIn, async (req, res, next) => {
  try {
    await deleteStudyPlan(req.user.studentId);
    res.status(204).end();
  } catch (err) {
    handlePlanError(err, res, next);
  }
});

/** POST /api/study-plan/courses — body { courseCode } */
app.post('/api/study-plan/courses', isLoggedIn, async (req, res, next) => {
  try {
    const courseCode = req.body?.courseCode;
    if (!courseCode) {
      return res.status(400).json({ error: 'MISSING_CODE', message: 'courseCode is required' });
    }
    const plan = await addCourseToStudyPlan(req.user.studentId, courseCode);
    res.json(plan);
  } catch (err) {
    handlePlanError(err, res, next);
  }
});

/** DELETE /api/study-plan/courses/:code */
app.delete('/api/study-plan/courses/:code', isLoggedIn, async (req, res, next) => {
  try {
    const plan = await removeCourseFromStudyPlan(
      req.user.studentId,
      req.params.code
    );
    res.json(plan);
  } catch (err) {
    handlePlanError(err, res, next);
  }
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
