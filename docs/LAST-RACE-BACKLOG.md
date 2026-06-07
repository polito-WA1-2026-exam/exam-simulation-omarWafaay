# Last Race — task backlog

**Exam:** Web Applications I 2025/26 — Exam #1 “Last Race”  
**Repo:** `E:\Polito\First Year\Semester II\Web Applications\exam`  
**Work branch:** `dev`  
**Submit on:** `main` + git tag `final` (deadline 2026-06-22)

**You stopped after:** Step 9 (ranking page). **Next up:** Step 10 (README, screenshots, submission).

---

## Progress at a glance

| Step | Topic | Status |
|------|--------|--------|
| 0 | Two servers, CORS, `/api/health` | ✅ Done |
| 1 | Schema, seed, `initDb`, docs | ✅ Done |
| 1b | Seed audit + player1 score fix (21) | ✅ Done |
| 2 | Passport login/logout | ✅ Done |
| 3 | Read APIs (network, segments) | ✅ Done |
| 4 | Game lifecycle APIs + route validation | ✅ |
| 5 | Ranking API | ✅ Done |
| 6 | React router + auth guard | ✅ Done |
| 7 | Anonymous instructions (no map) | ✅ Done |
| 8 | Game UI (setup → planning → execution → result) | ✅ Done |
| 9 | Ranking page | ✅ Done |
| 10 | README, screenshots, submission | ⬜ Next |

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
- [x] `server/seed.sql` (4 lines, 12 stations, 6 interchanges ≤50%, 8 events, 3 users)
- [x] `server/db.js` — recreate DB on startup
- [x] `docs/LAST-RACE-DATABASE.md`
- [x] `GET /api/db-check` (dev helper)
- [x] `server/verify-db.mjs`
- [x] `server/audit-seed.mjs` — routes + score math
- [x] player1 best game score aligned with events (**21**)

**Verify:** `node verify-db.mjs` and `node audit-seed.mjs` (restart server first if DB is stale).

**Users (seed):** `player1` / `player2` / `player3` — password `password`

---

## Step 2 — Authentication ✅

See [LAST-RACE-API-PLAN.md](./LAST-RACE-API-PLAN.md) §3–§10.

- [x] `express-session` + Passport local strategy
- [x] `POST /api/sessions` (login)
- [x] `GET /api/sessions/current`
- [x] `DELETE /api/sessions/current` (logout)
- [x] `isLoggedIn` middleware (`/api/db-check` protected)
- [x] scrypt + salt in `dao/userDao.js` (WA1 week05)
- [x] `server/verify-auth.mjs` (DAO) + `server/verify-auth-api.mjs` (HTTP) + `server/test.http`

**Done when:** cookie login works; protected routes return 401 when logged out.

---

## Step 3 — Read APIs ✅

- [x] `GET /api/network?view=full` — lines, stations, segments (setup)
- [x] `GET /api/network?view=planning` — stations only
- [x] `GET /api/segments` — all segment pairs
- [x] `server/dao/networkDao.js`
- [x] `server/verify-network.mjs`

**Done when:** curl with session returns correct JSON.

---

## Step 4 — Game APIs ✅

- [x] `POST /api/games` — new game (`status: setup`)
- [x] `POST /api/games/:id/planning` — random start/dest (BFS, ≥3 hops)
- [x] `PUT /api/games/:id/route` — validate + execute + score
- [x] `routeValidator.js` + `gameEngine.js` + `startDestPicker.js` + `gameDao.js`
- [x] `GET /api/games/:id`
- [x] `planning_started_at` in schema; seed `route_json` as ID pairs
- [x] `server/verify-games.mjs`

**Done when:** full game loop testable via curl/Postman.

---

## Step 5 — Ranking ✅

- [x] `GET /api/ranking` — best score per user
- [x] Seed: player2 (22) above player1 (21)
- [x] `server/verify-ranking.mjs`

---

## Step 6 — React skeleton ✅

- [x] `react-router-dom`
- [x] Routes: `/`, `/login`, `/game`, `/ranking`
- [x] `Navbar`, `AuthProvider` + `useAuth`
- [x] `ProtectedRoute` / `GuestRoute` guards
- [x] Placeholder `GamePage` + `RankingPage`
- [x] `api/client.js` with `credentials: 'include'`

**Verify:** login `player2`/`password` → Play + Ranking; logout → Login only; `/game` redirects when logged out.

**Trace guide:** [LAST-RACE-CLIENT-STEP6.md](./LAST-RACE-CLIENT-STEP6.md)

---

## Step 7 — Anonymous UI ✅

- [x] Instructions page — static rules + phases; **no** `GET /api/network` (exam: anonymous no map)
- [x] `GameRules` sidebar — exam rules (20 coins, segments once, 90s, etc.)
- [x] CTA: anonymous → Log in; logged-in → Go to Play
- [x] Login form — controlled inputs, client + server validation, demo credentials hint
- [x] Link back to instructions from login

**Verify:** logged out on `/` — no network requests except `GET /api/sessions/current`; map never shown.

---

## Step 8 — Game UI ✅

- [x] **Setup:** `GET /api/network?view=full` — lines + segment list
- [x] **Planning:** stations only; start/dest; segment picker; **90s timer**; auto-submit at deadline
- [x] **Execution:** one step at a time from `steps[]`
- [x] **Result:** final score; invalid → 0; Play again + link to ranking
- [x] Route builder: immutable array updates; duplicate segments disabled in UI (server still validates)

**Verify:** full play on `/game` — setup → planning → submit → execution → result.

---

## Step 9 — Ranking page ✅

- [x] Table from `GET /api/ranking` (#, username, bestScore)
- [x] Current user row highlighted; empty + error states
- [ ] Screenshot for README (ranking page) — Step 10

**Verify:** login → `/ranking` → player2 (22) above player1 (21); no player3.

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
| 90s planning | Client timer + server `planning_started_at` / deadline; no grace after 90s |
| Registration | None — seed users only |
| Negative score | Store and show as **0** |
| Segment reuse | Each undirected segment **at most once**; same station may repeat (exam 2026-06-05) |
| Route validity timing | Checked on `PUT /route` at submit / timeout, not during planning |

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
- **Client Step 6 guide:** `docs/LAST-RACE-CLIENT-STEP6.md`
- DB design: `docs/LAST-RACE-DATABASE.md`
- Method: `docs/WEB-PROJECT-PLANNING-GUIDE.md`

---

*Update the “Progress at a glance” table and checkboxes as you finish each step.*
