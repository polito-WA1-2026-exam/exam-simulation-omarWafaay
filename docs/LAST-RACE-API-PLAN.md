# Last Race — HTTP API plan

**Exam:** Web Applications I 2025/26 — Exam #1 “Last Race”  
**Branch:** `dev`  
**Spec:** [Google Doc](https://docs.google.com/document/d/1BGYMlO-N-1K5XSe3Km8nR4JsYLAY6xPQkcvT8evvfoE/edit)  
**Related:** [LAST-RACE-DATABASE.md](./LAST-RACE-DATABASE.md) · [LAST-RACE-BACKLOG.md](./LAST-RACE-BACKLOG.md)

This document is the **implementation plan** for the server APIs. The official `README.md` in the repo root will list the **final** endpoints when you submit; use this file while building.

**Status:** Steps 0–1 done · **Next:** implement APIs starting with auth (see §7).

---

## Table of contents

1. [What the exam requires](#1-what-the-exam-requires)
2. [Implementation order](#2-implementation-order)
3. [Endpoint list](#3-endpoint-list)
4. [Request / response shapes](#4-request--response-shapes)
5. [Game flow](#5-game-flow)
6. [Server file layout](#6-server-file-layout)
7. [Route validation rules](#7-route-validation-rules)
8. [Start/dest & scoring](#8-startdest--scoring)
9. [HTTP status codes](#9-http-status-codes)
10. [Implementation slices](#10-implementation-slices)
11. [Agreed design decisions](#11-agreed-design-decisions)
12. [Out of scope for API phase](#12-out-of-scope-for-api-phase)

---

## 1. What the exam requires

| Rule | API implication |
|------|------------------|
| Anonymous: instructions only, **no map**, no play | Network, segments, games, ranking → **401 without session** |
| Logged-in: full game + ranking | All game and map data behind Passport |
| Network and events live on the **server** | Client fetches topology; never hard-code the metro in React |
| Phases: setup → planning (90s) → execution → result | Server stores `games.status`; client runs the timer |
| Invalid or incomplete route → **0 coins**, no execution | One validation path on submit |
| Valid route → random event **per leg on server** | Client only **displays** steps returned by the API |
| Final score = coins left; negative → **0** | Clamp before saving `games.final_score` |
| No user registration | No `POST /api/users`; seed users only |
| Do not leak data | No `password_hash`, no other users’ games |

---

## 2. Implementation order

Read APIs must be **protected**, so implement **auth before** map endpoints.

| Order | Topic | Backlog step |
|-------|--------|--------------|
| 1 | Auth (Passport + sessions) | Step 3 |
| 2 | Network reads (`/api/network`, `/api/segments`) | Step 2 |
| 3 | Game lifecycle | Step 4 |
| 4 | Ranking | Step 5 |
| 5 | React UI | Steps 6–9 |

Steps 0–1 (CORS, health, database) are already done on `dev`.

---

## 3. Endpoint list

### Public (no login)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check — `{ "ok": true }` |
| `POST` | `/api/sessions` | Login — sets session cookie |
| `GET` | `/api/sessions/current` | Current user or `401` |

Game **instructions** for anonymous users can live only in React (no API required).

### Protected (login required)

| Method | Path | Description |
|--------|------|-------------|
| `DELETE` | `/api/sessions/current` | Logout — `204` |
| `GET` | `/api/network` | Metro map — query `?view=full` or `?view=planning` |
| `GET` | `/api/segments` | All segment pairs for the planning list |
| `POST` | `/api/games` | Start a new game (`status: setup`) |
| `POST` | `/api/games/:id/planning` | Begin planning — random start/dest |
| `PUT` | `/api/games/:id/route` | Submit route — validate, execute, score |
| `GET` | `/api/games/:id` | Current game state |
| `GET` | `/api/ranking` | Leaderboard — best score per user |

### Dev only (optional)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/db-check` | Row counts after seed — remove or document as dev-only before submit |

### Not planned

| Endpoint | Reason |
|----------|--------|
| `GET /api/games` | Exam does not require game history UI; use `GET /api/games/:id` + ranking |
| `GET /api/events` | Events are chosen server-side at execution; no UI need to list them |
| `POST /api/games/:id/execute` | Merged into `PUT .../route` |
| `GET /` on server | API-only server; `Cannot GET /` is normal |

---

## 4. Request / response shapes

### User (in session)

```json
{ "id": 1, "username": "player1" }
```

### `POST /api/sessions`

**Body:** `{ "username": "...", "password": "..." }`  
**Success:** `201` + user object + session cookie  
**Failure:** `401`

### `GET /api/network?view=full` (setup)

```json
{
  "lines": [
    {
      "id": 1,
      "name": "Red Line",
      "stations": [
        { "id": 1, "name": "Centrale", "isInterchange": true },
        { "id": 2, "name": "Porta Velaria", "isInterchange": true }
      ]
    }
  ],
  "segments": [
    { "fromId": 1, "toId": 2, "from": "Centrale", "to": "Porta Velaria" }
  ]
}
```

`from` / `to` names are for display; use **`fromId` / `toId`** when building or submitting routes.

### `GET /api/network?view=planning`

Stations only — **no lines**, no segments in this response.

```json
{
  "stations": [
    { "id": 1, "name": "Centrale", "isInterchange": true }
  ]
}
```

Segment pairs for planning come from `GET /api/segments`.

### `GET /api/segments`

```json
{
  "segments": [
    {
      "fromId": 1,
      "toId": 6,
      "from": "Centrale",
      "to": "Fontana Oscura"
    }
  ]
}
```

Sort by `fromId`, then `toId`. Include **names** for the planning list UI; client submits **IDs** only (see `PUT /route`).

### `POST /api/games` → `201`

```json
{
  "id": 4,
  "status": "setup",
  "coins": 20
}
```

### `POST /api/games/:id/planning` → `200`

Server picks start and destination (reachable, **at least 3 legs** on shortest path).

```json
{
  "id": 4,
  "status": "planning",
  "coins": 20,
  "startStationId": 1,
  "destinationStationId": 9,
  "start": "Centrale",
  "destination": "Viale dei Mosaici",
  "planningDeadline": "2026-05-31T12:01:30.000Z"
}
```

`planningDeadline` = `planning_started_at` + 90s (ISO string). Client uses it for the timer; server enforces on `PUT /route`.

### `PUT /api/games/:id/route`

**Body — station IDs only** (avoids string typos):

```json
{
  "segments": [
    [1, 6],
    [6, 7],
    [7, 8],
    [8, 9]
  ]
}
```

Each pair is `[fromStationId, toStationId]` in travel order.

**Invalid route** (wrong order, bad segment, wrong start/end, illegal line change):

```json
{
  "valid": false,
  "finalScore": 0,
  "status": "completed"
}
```

**Valid route:**

```json
{
  "valid": true,
  "status": "completed",
  "finalScore": 21,
  "steps": [
    {
      "order": 1,
      "fromStationId": 1,
      "toStationId": 6,
      "from": "Centrale",
      "to": "Fontana Oscura",
      "event": { "description": "Quiet journey", "effect": 0 },
      "coinsAfter": 20
    }
  ]
}
```

Execution responses include **IDs + names** so the UI can label steps without extra lookups.

The client shows execution **one step at a time** from `steps[]`; no separate execute endpoint.

### `GET /api/games/:id`

Return the fields needed for the current phase. Only the owner may access the game (`404` otherwise).

### `GET /api/ranking`

```json
[
  { "username": "player2", "bestScore": 22 },
  { "username": "player1", "bestScore": 21 }
]
```

Users with no completed games are omitted. Sort by `bestScore` descending.

---

## 5. Game flow

```
Login
  → POST /api/games                    (status: setup)
  → GET  /api/network?view=full        (setup map)
  → POST /api/games/:id/planning       (status: planning, start + dest)
  → GET  /api/network?view=planning
  → GET  /api/segments
  → [90s timer — client auto-submits on timeout]
  → PUT  /api/games/:id/route          (validate + score + steps)
  → [client animates steps]
  → result screen → optional GET /api/ranking
  → new game → POST /api/games again
```

**90s timeout:** the client calls `PUT .../route` before `planningDeadline` with the partial route built so far. The server uses the same validation; incomplete routes → `valid: false`, `finalScore: 0`.

**Server deadline:** reject `PUT` if now is **more than ~5s after** `planningDeadline` (abuse / forgot to submit) → `409` `{ "error": "PLANNING_EXPIRED" }`. Submissions within the window (including at 90s) are processed normally.

---

## 6. Server file layout

| File | Role |
|------|------|
| `server/index.js` | Express, CORS, session, routes |
| `server/middleware/isLoggedIn.js` | Return `401` if not authenticated |
| `server/dao/userDao.js` | bcrypt login |
| `server/LastRaceModels.js` | `User`, `Station`, `Segment`, `Line`, `Game`, … (WA1 constructor style) |
| `server/dao/networkDao.js` | Full/planning network, segment list |
| `server/dao/gameDao.js` | Games CRUD, ranking query |
| `server/services/routeValidator.js` | Validate submitted route |
| `server/services/gameEngine.js` | Random events, `game_steps`, final score |
| `server/services/startDestPicker.js` | Random start/dest with BFS (≥ 3 hops) |

Keep business rules in **services**, not in route handlers.

---

## 7. Route validation rules

**Input:** `startStationId`, `destinationStationId`, ordered `segments` as `[fromId, toId]` arrays.

| Check | If it fails |
|--------|-------------|
| `PUT` after planning deadline + grace | `409 PLANNING_EXPIRED` |
| Route non-empty (for “complete” intent) | `valid: false` |
| First leg `fromId === startStationId` | `valid: false` |
| Last leg `toId === destinationStationId` | `valid: false` |
| Each pair exists in `segments` table (by station ids) | `valid: false` |
| Legs connect (`leg[i][1] === leg[i+1][0]`) | `valid: false` |
| Line change only at interchange | `valid: false` |

Validator works on **IDs** internally; adapt logic from `server/audit-seed.mjs` (update audit to use ids when seed migrates).

**README note:** segment pairs are **undirected** in the DB; direction comes from order and assigned start. In planning, the UI should only allow segments whose `fromId` matches the **current route end**; the server still re-validates the full route.

---

## 8. Start/dest & scoring

### Start / destination (`startDestPicker`)

1. Build graph from `segments`.
2. Random `start` and `dest` (`start ≠ dest`).
3. BFS shortest path length in edges; require **≥ 3**.
4. Retry until valid (seed network is connected enough).

Save `start_station_id`, `dest_station_id`, and `planning_started_at` when entering `planning`.

### Execution (`gameEngine`)

1. Start with **20** coins.
2. For each leg: pick random event (`ORDER BY RANDOM() LIMIT 1`), apply `effect`, insert `game_steps`.
3. `final_score = max(0, coins)`.
4. Set `status = completed`, store `route_json` as `[[fromId,toId],...]`.

**Invalid route:** no `game_steps`, `final_score = 0`, `status = completed`.

---

## 9. HTTP status codes

| Situation | Status | Body example |
|-----------|--------|----------------|
| Not logged in | `401` | `{ "error": "UNAUTHORIZED" }` |
| Wrong credentials | `401` | `{ "error": "INVALID_CREDENTIALS" }` |
| Game not found / not owner | `404` | `{ "error": "NOT_FOUND" }` |
| Wrong game phase (e.g. planning twice) | `409` | `{ "error": "INVALID_STATE" }` |
| `PUT /route` after deadline + grace | `409` | `{ "error": "PLANNING_EXPIRED" }` |
| Malformed body (non-integer ids) | `400` | `{ "error": "BAD_REQUEST" }` |
| Invalid route on submit | `200` | `{ "valid": false, "finalScore": 0, ... }` |

Use `200` + `valid: false` for bad routes so the client can show “score 0” without treating it as a server error.

---

## 10. Implementation slices

| Slice | Build | How to test |
|-------|--------|-------------|
| **A** | Auth + `express.json()` | Login `player1` / `password`, cookie, `GET /api/sessions/current` |
| **B** | `GET /api/network`, `GET /api/segments` | `401` when logged out; JSON when logged in |
| **C** | `POST /api/games`, `POST .../planning` | New game; start/dest at least 3 hops apart |
| **D** | `routeValidator` + `PUT .../route` | Valid route → `steps`; bad route → `finalScore: 0` |
| **E** | `GET /api/games/:id`, `GET /api/ranking` | Ranking: player2 (22) above player1 (21) |
| **F** | `server/test.http` | Repeatable manual checks |

One commit per slice on `dev`.

### Seed users (testing)

| Username | Password |
|----------|----------|
| `player1` | `password` |
| `player2` | `password` |
| `player3` | `password` |

---

## 11. Agreed design decisions

| # | Topic | Decision |
|---|--------|----------|
| 1 | Setup → planning | `POST /api/games/:id/planning` |
| 2 | Execution | Single `PUT /route` returns all `steps` |
| 3 | Multiple in-progress games | Always allow new `POST /api/games` |
| 4 | Network query | `?view=full` and `?view=planning` |
| 5 | Route submission | **Station IDs only** in `PUT /route` body |
| 6 | API responses | **IDs + names** for display (network, segments, steps) |
| 7 | `GET /api/segments` | **Required** (exam: list all segment pairs) |
| 8 | `GET /api/games` (history) | **Not implemented** |
| 9 | 90s planning | Client timer + `planning_started_at` / `planningDeadline`; server rejects late `PUT` after ~5s grace |
| 10 | `GET /api/db-check` | Dev-only until submit |

### Schema change when implementing games (Step 4)

Add to `games` table:

```sql
planning_started_at TEXT  -- ISO datetime, set when entering planning
```

Migrate `route_json` in seed to ID pairs `[[1,6],[6,7],...]` and update `audit-seed.mjs` accordingly.

---

## 12. Out of scope for API phase

- React components and map drawing
- Instructions page copy
- Submission screenshots

---

## Quick commands

```powershell
cd server
nodemon index.js

cd client
npm run dev

cd server
node verify-db.mjs
node audit-seed.mjs
```

Restart the server after `seed.sql` changes so `initDb()` rebuilds the database.

---

*When APIs are implemented, copy the final endpoint list into the root `README.md` for graders.*
