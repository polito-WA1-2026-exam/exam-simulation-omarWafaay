# Last Race — task backlog

**Exam:** Web Applications I 2025/26 — Exam #1 “Last Race”  
**Repo:** `E:\Polito\First Year\Semester II\Web Applications\exam`  
**Work branch:** `dev`  
**Submit on:** `main` + git tag `final` (deadline 2026-06-22)

**You stopped after:** Step 1 (database) + seed score fix. **Next up:** APIs — see [LAST-RACE-API-PLAN.md](./LAST-RACE-API-PLAN.md) (auth first, then reads, games, ranking).

---

## Progress at a glance

| Step | Topic | Status |
|------|--------|--------|
| 0 | Two servers, CORS, `/api/health` | ✅ Done |
| 1 | Schema, seed, `initDb`, docs | ✅ Done |
| 1b | Seed audit + player1 score fix (21) | ✅ Done |
| 2 | Passport login/logout | ⬜ Next |
| 3 | Read APIs (network, segments) | ⬜ |
| 4 | Game lifecycle APIs + route validation | ⬜ |
| 5 | Ranking API | ⬜ |
| 6 | React router + auth guard | ⬜ |
| 7 | Anonymous instructions (no map) | ⬜ |
| 8 | Game UI (setup → planning → execution → result) | ⬜ |
| 9 | Ranking page | ⬜ |
| 10 | README, screenshots, submission | ⬜ |

---

## Commits on `dev` (reference)

| Commit | What |
|--------|------|
| `36272d1` | Step 0 + Step 1: CORS, health, SQLite schema/seed, `LAST-RACE-DATABASE.md` |
| `512eafc` | Fix player1 best score 21; add `audit-seed.mjs` |

---

## Step 0 — Foundation ✅

- [x] `cors` + `credentials: true` for `http://localhost:5173`
- [x] `GET /api/health`
- [x] Client health fetch in `App.jsx` (`credentials: 'include'`)
- [x] React Strict Mode (template default)

**Verify:** both servers run; client shows “API connected”.

---

## Step 1 — Database ✅

- [x] `server/schema.sql` (8 tables)
- [x] `server/seed.sql` (4 lines, 12 stations, 7 interchanges, 8 events, 3 users)
- [x] `server/db.js` — recreate DB on startup
- [x] `docs/LAST-RACE-DATABASE.md`
- [x] `GET /api/db-check` (dev helper)
- [x] `server/verify-db.mjs`
- [x] `server/audit-seed.mjs` — routes + score math
- [x] player1 best game score aligned with events (**21**)

**Verify:** `node verify-db.mjs` and `node audit-seed.mjs` (restart server first if DB is stale).

**Users (seed):** `player1` / `player2` / `player3` — password `password`

---

## Step 2 — Authentication ⬜ **NEXT**

See [LAST-RACE-API-PLAN.md](./LAST-RACE-API-PLAN.md) §3–§10.

- [ ] `express-session` + Passport local strategy
- [ ] `POST /api/sessions` (login)
- [ ] `GET /api/sessions/current`
- [ ] `DELETE /api/sessions/current` (logout)
- [ ] `isLoggedIn` middleware
- [ ] bcrypt verify against `users.password_hash`
- [ ] `server/verify-auth.mjs` or `test.http`

**Done when:** cookie login works; protected routes return 401 when logged out.

---

## Step 3 — Read APIs ⬜

- [ ] `GET /api/network?view=full` — lines, stations, segments (setup)
- [ ] `GET /api/network?view=planning` — stations only
- [ ] `GET /api/segments` — all segment pairs
- [ ] `server/dao/networkDao.js`

**Done when:** curl with session returns correct JSON.

---

## Step 4 — Game APIs ⬜

- [ ] `POST /api/games` — new game (`status: setup`)
- [ ] `POST /api/games/:id/planning` — random start/dest (BFS, ≥3 hops)
- [ ] `PUT /api/games/:id/route` — validate + execute + score
- [ ] `routeValidator.js` + `gameEngine.js`
- [ ] `GET /api/games/:id`

**Done when:** full game loop testable via curl/Postman.

---

## Step 5 — Ranking ⬜

- [ ] `GET /api/ranking` — best score per user
- [ ] Seed: player2 (22) above player1 (21)

---

## Step 6 — React skeleton ⬜

- [ ] `react-router-dom`
- [ ] Routes: `/`, `/login`, `/game`, `/ranking` (adjust as needed)
- [ ] `Navbar`, auth context or session hook
- [ ] Redirect: anonymous → instructions; logged-in → game/home

---

## Step 7 — Anonymous UI ⬜

- [ ] Instructions page only — **no network map** for logged-out users
- [ ] Login form

---

## Step 8 — Game UI ⬜

- [ ] **Setup:** full map (lines + connections)
- [ ] **Planning:** map without lines; start/dest; segment list; **90s timer**; auto-submit on timeout
- [ ] **Execution:** one step at a time (event + coins)
- [ ] **Result:** final score; “new game”
- [ ] UI: only allow next segment connected to route end (document in README)

---

## Step 9 — Ranking page ⬜

- [ ] Table/list from `GET /api/ranking`
- [ ] Screenshot for README (ranking page)

---

## Step 10 — Submission ⬜

- [ ] Fill `README.md` (APIs, tables, routes, components, credentials, AI disclosure)
- [ ] Screenshot: ranking + game during play → `img/`
- [ ] Manual test script (10 steps) from planning guide
- [ ] Clean clone: `npm install` in `client` + `server`
- [ ] Merge `dev` → `main`
- [ ] `git tag final` + `git push origin --tags`

**Grader commands:** see exam PDF (clone, checkout `final`, `npm install`, `nodemon` + `npm run dev`).

---

## Design choices (document in README)

See [LAST-RACE-API-PLAN.md](./LAST-RACE-API-PLAN.md) §11. Summary:

| Topic | Choice |
|--------|--------|
| Route submit | **Station IDs** in `PUT /route`; responses include id + name |
| Segment pairs | Undirected; direction from route order + assigned start |
| `GET /api/segments` | **Yes** (exam requirement) |
| `GET /api/games` list | **No** |
| 90s planning | Client timer + server `planning_started_at` / deadline |
| Registration | None — seed users only |
| Negative score | Store and show as **0** |

---

## Helpful commands

```powershell
# Server
cd server
npm install
nodemon index.js

# Client
cd client
npm install
npm run dev

# Checks
cd server
node verify-db.mjs
node audit-seed.mjs
```

**Reminder:** Restart server after seed changes so `initDb()` rebuilds `database.sqlite`.

---

## References

- Exam spec: [Google Doc](https://docs.google.com/document/d/1BGYMlO-N-1K5XSe3Km8nR4JsYLAY6xPQkcvT8evvfoE/edit)
- **API plan:** `docs/LAST-RACE-API-PLAN.md`
- DB design: `docs/LAST-RACE-DATABASE.md`
- Method: `docs/WEB-PROJECT-PLANNING-GUIDE.md`

---

*Update the “Progress at a glance” table and checkboxes as you finish each step.*
