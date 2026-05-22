# StudyPlan — Guided lab (exam simulation)

**Course:** Web Applications I — Polito 2025/2026  
**Goal:** Build the app **yourself**, step by step. Use this lab as a map; use AI only to clarify concepts and debug *your* code (then adapt and test).

**Stack:** `client/` (React + Vite, Strict Mode) + `server/` (Node + Express + SQLite + Passport). Two servers, CORS + `credentials: 'include'`.

---

## How to use this lab

1. Work **one phase at a time**. Do not skip to React until the API for that slice works (test with browser, curl, or Postman).
2. After each checkpoint, **commit** with a short message (e.g. `feat: seed courses table`).
3. When stuck: write what you expected vs what happened, paste the error, show **one** small code snippet — then ask for a hint, not a full file.
4. Keep a short log for your README / AI disclosure: what you built, what you verified manually.

---

## Phase 0 — Setup (30–45 min)

**Do:**

- Clone the simulation template from GitHub Classroom (or create `client/` + `server/` like the template).
- `npm install` in both folders; run `nodemon index.mjs` and `npm run dev`.
- Confirm CORS: server allows client origin, `credentials: true`; client uses `credentials: 'include'` on `fetch`.

**Checkpoint:**

- [ ] Both servers start with no crash.
- [ ] One public GET (e.g. `/api/health` or `/api/courses`) returns JSON from the client.

**Note:** `Cannot GET /` on the server root is normal — the server is an API, not the SPA.

---

## Phase 1 — Database design (1–2 h)

**Learn:** Relational model for courses, constraints, users, study plans.

**Tables to plan (minimum):**

| Table | Purpose |
|--------|---------|
| `users` | id, username, **hashed** password (salted) |
| `courses` | code (PK), name, credits, max_students (nullable), preparatory_code (nullable FK) |
| `incompatibilities` | course_code, incompatible_with |
| `study_plans` | user_id, mode (`full` / `part`) |
| `study_plan_courses` | plan_id, course_code |

**Seed data:**

- All courses from the exam spec table (22 courses).
- ≥5 users; ≥1 full-time plan, ≥1 part-time; ≥2 courses at max capacity in saved plans.

**Verification SQL:**

```sql
SELECT COUNT(*) FROM courses;   -- 22
SELECT code, name FROM courses ORDER BY name;
SELECT mode, COUNT(*) FROM study_plans GROUP BY mode;
```

**Data access:** use `sqlite3` with Promise wrappers around `db.run` / `db.get` / `db.all` (see `server/db.js` and Authentication lab `dao.js`).

**Checkpoint:**

- [ ] Courses ordered by name.
- [ ] Incompatibilities and preparatory query correctly.
- [ ] Enrollment counts match saved plans.
- [ ] At least two courses at max enrollment.

---

## Phase 2 — Public API: anonymous homepage (1–2 h)

**Learn:** REST design; do not leak internal fields.

| Method | Path | Who | Returns |
|--------|------|-----|---------|
| GET | `/api/courses` | anonymous | code, name, credits, enrollment, max_students, expandable metadata |

**Rules:**

- Sort by **name** (prefer SQL `ORDER BY name`).
- Do not expose password hashes or other users’ plans.

**Checkpoint:**

- [ ] Unauthenticated GET returns full catalog in correct order.
- [ ] Enrollment counts correct for capped courses.

---

## Phase 3 — Authentication (1–2 h)

**Learn:** Passport local strategy, sessions, protected routes.

**Do:**

- Login / logout with session cookies.
- Middleware `isLoggedIn` for protected APIs.
- Passwords: hash + salt in DB.

**Checkpoint:**

- [ ] Login sets cookie; logout clears session.
- [ ] Protected route returns 401 without session.
- [ ] No registration (not required).

Document in README: usernames/passwords of seeded users.

---

## Phase 4 — Study plan API (2–3 h)

**Learn:** Business rules on server; client stays thin.

**Suggested endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/study-plan` | Current user’s saved plan (or empty) |
| POST | `/api/study-plan` | Create empty plan (mode: full/part) |
| PUT | `/api/study-plan` | Save (validate credits) |
| DELETE | `/api/study-plan` | Delete entire plan |
| POST | `/api/study-plan/courses` | Add course |
| DELETE | `/api/study-plan/courses/:code` | Remove course |

**Server must enforce:**

1. **Credits on save:** full 60–80, part 20–40.
2. **Incompatible:** cannot add if incompatible course already in plan.
3. **Preparatory:** preparatory must already be in plan.
4. **Max students:** cannot add if enrollment ≥ max (be consistent; document in README).
5. **Remove:** cannot remove if another course depends on it as preparatory.

Return structured errors: `{ "error": "INCOMPATIBLE", "message": "..." }`.

**Draft vs saved:**

- **Option A:** Server keeps draft vs saved tables/columns.
- **Option B:** Client holds draft; Save sends full list; Cancel refetches saved.

**Checkpoint:**

- [ ] Create plan; add/remove with constraint failures and clear reasons.
- [ ] Save validates credits; Cancel does not change persistent copy.

---

## Phase 5 — React skeleton (1–2 h)

**Routes (example):**

| Route | Purpose |
|-------|---------|
| `/` | Home: anonymous or logged-in |
| `/login` | Login form (optional if modal on `/`) |

**Components (suggested):**

- `App`, `Layout`, `Navbar`
- `CourseList`, `CourseRow`
- `StudyPlanPanel`, `StudyPlanEditor`
- `LoginForm`
- `AuthContext` or session hook

**Checkpoint:**

- [ ] Strict Mode on.
- [ ] Internal navigation without full page reload.
- [ ] No errors/warnings in client console (except known library noise).

---

## Phase 6 — Anonymous UI (1 h)

**Do:**

- List all courses with code, name, credits, enrollment, max.
- Expand row: incompatible codes + preparatory code.

**Checkpoint:**

- [ ] Multiple rows expanded at once.
- [ ] Alphabetical by name.

---

## Phase 7 — Logged-in home + editing (3–4 h)

**Behavior:**

```
Logged in, no plan → create (full/part)
Logged in, has plan → show plan + full list
Editing → credits + min/max, add/remove, reasons when blocked
Save / Cancel / Delete → stay on logged-in home
```

**Checkpoint:**

- [ ] Part-time 20–40 / full-time 60–80 shown and enforced on save.
- [ ] Incompatible, preparatory, max-students rules in UI + server.
- [ ] Save persists; Cancel reverts draft; Delete removes plan.

---

## Phase 8 — Polish & submission (1–2 h)

- [ ] Validation in Express and React.
- [ ] APIs protected; minimal data to client.
- [ ] README: APIs, tables, routes, components, screenshot, credentials.
- [ ] Screenshot: logged-in home **during editing** (image in repo).
- [ ] No `node_modules` in git.
- [ ] Clean clone: `npm install` in client and server; tag `final`.

**Submission commands (exam):**

```bash
git tag final
git push origin --tags
```

---

## Constraint cheat sheet

| Rule | On add | On remove | On save |
|------|--------|-----------|---------|
| Credits range | — | — | sum ∈ [min,max] for mode |
| Incompatible | no incompatible in plan | — | — |
| Preparatory | preparatory in plan | no dependent in plan | — |
| Max students | count < max | — | — |

---

## Suggested schedule (simulation)

| Week | Phases |
|------|--------|
| 1 | 0–2 |
| 2 | 3–4 |
| 3 | 5–7 |
| 4 | 8 + dry-run submission |

---

## Mini exam drills (15 min each)

1. API: add course that violates preparatory → assert status and body.
2. UI: expand three courses independently.
3. Remove preparatory while dependent still in plan → fail with message.
4. Part-time 39 credits → Save OK; push over 40 → Save fails.

---

## AI disclosure template

> I used [tool] to clarify [topics] and debug [errors with my code]. I wrote all submitted code myself, tested with [commands/flows], and adapted or rejected suggestions that did not match the assignment.

---

## Help request template

```
Phase: N
Goal: ...
What I tried: ...
Error / behavior: ...
My hypothesis: ...
Code (10–20 lines max): ...
```
