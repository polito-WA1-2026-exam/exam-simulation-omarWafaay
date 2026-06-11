# Last Race — client code workbook

Your personal map of the React client. Use this when you want to change UI, text, or behaviour **without getting lost**.

**Run the client:** `cd client` → `npm run dev` → `http://localhost:5173`  
**Needs the server:** `cd server` → `nodemon index.js` → `http://localhost:3001`

---

## 1. File tree (what lives where)

```text
client/src/
  main.jsx                 Entry point — StrictMode, Router, AuthProvider
  App.jsx                  Routes + shell (navbar, background, pages)
  index.css                Global colours, fonts, headings
  layout.css               Almost all layout and page styles

  api/
    client.js              One function: apiFetch() — all HTTP goes through here
    gameApi.js             Game/network/ranking API calls (thin wrappers)

  auth/
    AuthContext.jsx        Login state + login/logout functions
    useAuth.js             Hook: const { user, login, logout } = useAuth()

  pages/
    InstructionsPage.jsx   /           — public rules (no game API)
    LoginPage.jsx          /login      — login form
    GamePage.jsx           /game       — orchestrates all game phases
    RankingPage.jsx        /ranking    — leaderboard table

  components/
    Navbar.jsx             Top bar links (changes when logged in/out)
    ProtectedRoute.jsx     Redirect to /login if not logged in
    GuestRoute.jsx         Redirect to /game if already logged in
    SubwayMapBackground.jsx  Decorative SVG behind pages
    GameRules.jsx          Sidebar on instructions page (static text)
    game/
      SetupPhase.jsx       Phase 1 — full map
      PlanningPhase.jsx    Phase 2 — timer + route builder
      ExecutionPhase.jsx   Phase 3 — step-by-step events
      ResultPhase.jsx      Phase 4 — final score
    ranking/
      RankingIcons.jsx     Gold/silver/bronze medals for top 3
    icons/
      CoinIcon.jsx         Gold coin (PNG from assets/coin.png)
      CoinAmount.jsx       Coin icon + number (reused everywhere)

  assets/
    coin.png, medal-*.png  Committed — used in components
    coin.svg, medal-*.svg  Local only (gitignored) — edit, then npm run export-icons

  utils/
    lineColor.js           "Red Line" → CSS class line-color-red
    segmentKey.js          Helper for duplicate segment check in planning
```

---

## 2. How the app boots

```text
main.jsx
  └─ BrowserRouter
       └─ AuthProvider          ← on load: GET /api/sessions/current
            └─ App.jsx
                 ├─ SubwayMapBackground
                 ├─ Navbar
                 └─ Routes → one Page per URL
```

**`AuthContext.jsx` gives you:**

| Field / function | Meaning |
|------------------|---------|
| `user` | `{ id, username }` or `null` |
| `loading` | `true` while checking session on first load |
| `login(username, password)` | `POST /api/sessions` |
| `logout()` | `DELETE /api/sessions/current` |

Use `useAuth()` in any component inside `AuthProvider`.

---

## 3. Routes

Defined in **`App.jsx`** only.

| URL | Page | Guard | Who can see it |
|-----|------|-------|----------------|
| `/` | InstructionsPage | none | everyone |
| `/login` | LoginPage | GuestRoute | logged-out only |
| `/game` | GamePage | ProtectedRoute | logged-in only |
| `/ranking` | RankingPage | ProtectedRoute | logged-in only |
| anything else | → redirect `/` | | |

**To add a new page:** create `pages/MyPage.jsx`, import in `App.jsx`, add `<Route path="/mine" element={...} />`, add a `NavLink` in `Navbar.jsx`.

---

## 4. HTTP layer

### `api/client.js`

- Base URL: `http://localhost:3001`
- Always sends `credentials: 'include'` (session cookie)
- Returns `{ ok, status, data }` — never throws on 4xx

**Change server port?** Edit `API_BASE` in `client.js`.

### `api/gameApi.js`

| Function | Method | Path | Used by |
|----------|--------|------|---------|
| `createGame()` | POST | `/api/games` | GamePage |
| `beginPlanning(id)` | POST | `/api/games/:id/planning` | GamePage |
| `submitRoute(id, segments)` | PUT | `/api/games/:id/route` | PlanningPhase |
| `fetchNetworkFull()` | GET | `/api/network?view=full` | GamePage (setup) |
| `fetchNetworkPlanning()` | GET | `/api/network?view=planning` | PlanningPhase |
| `fetchSegments()` | GET | `/api/segments` | PlanningPhase, SetupPhase |
| `fetchRanking()` | GET | `/api/ranking` | RankingPage |

Auth calls live in **`AuthContext.jsx`** (not in `gameApi.js`).

---

## 5. Game flow (most important)

**`GamePage.jsx`** is the boss. It does not render the map itself — it picks which phase component to show.

```text
GamePage mounts
  → createGame() + fetchNetworkFull()
  → phase = 'setup'     → SetupPhase
  → user clicks Start
  → beginPlanning()     → phase = 'planning'  → PlanningPhase
  → route submitted (manual or timer)
  → phase = 'execution' OR 'result'   (depends on valid + steps)
  → ExecutionPhase (if valid route with steps)
  → phase = 'result'    → ResultPhase
  → Play again → startNewGame() → back to setup
```

### State inside GamePage

| State | Type | Purpose |
|-------|------|---------|
| `phase` | string | `'loading' \| 'error' \| 'setup' \| 'planning' \| 'execution' \| 'result'` |
| `game` | object | Current game from server (`id`, `start`, `destination`, `planningDeadline`, …) |
| `network` | object | Full network for setup (`lines`, `segments`) |
| `routeResult` | object | Response from `PUT .../route` (`valid`, `finalScore`, `steps`) |
| `error` | string | Error message |
| `busy` | boolean | Disable buttons while waiting |

### Phase components (what to edit for game UI)

| File | Props in | Props out (callbacks) | API calls inside |
|------|----------|----------------------|------------------|
| SetupPhase | `network`, `onStart`, `starting` | `onStart()` | none |
| PlanningPhase | `game`, `onComplete`, `onError` | `onComplete(result)`, `onError(msg)` | planning network, segments, submit route |
| ExecutionPhase | `steps`, `onFinish` | `onFinish()` | none |
| ResultPhase | `result`, `game`, `onPlayAgain` | `onPlayAgain()` | none |

**Planning timer:** `PlanningPhase.jsx` — `WARNING_MS = 30000`, `URGENT_MS = 10000`. CSS classes: `timer-warning`, `timer-urgent` in `layout.css`.

**Auto-submit at 0:00:** same file, `useEffect` with `setInterval` calls `doSubmit(route)` when time runs out.

**Route format sent to server:** array of `[fromStationId, toStationId]` pairs — built in `PlanningPhase` state `route`.

---

## 6. Page-by-page cheat sheet

### Instructions (`InstructionsPage.jsx`)

- No game API — safe for anonymous users.
- Text: ordered list + `GameRules` sidebar.
- Button: “Log in to play” or “Go to Play” depending on `user`.

**Change rules text:** `InstructionsPage.jsx` + `GameRules.jsx`.

### Login (`LoginPage.jsx`)

- `DEMO_USERS` array — quick-fill buttons on login card.
- On success → `navigate('/game')`.
- Form state: `username`, `password`, `error`, `submitting`.

**Add/remove demo user button:** edit `DEMO_USERS` (must exist in server seed).

### Ranking (`RankingPage.jsx`)

- Loads once: `fetchRanking()` → `[{ username, bestScore }, ...]`.
- `RankingSummary` — small card for current user (hidden if user has no score).
- Table rows: medals top 3 via `RankPlace`, `data-place` attribute for row highlight CSS.
- `badge-you` on your row.

**Change table columns:** edit JSX in `RankingPage.jsx` + CSS `.ranking-table` in `layout.css`.

### Navbar (`Navbar.jsx`)

Logged in: Instructions · Play · Ranking · username · Logout  
Logged out: Instructions · Login

**Change link order:** reorder `NavLink` elements in `Navbar.jsx`.

---

## 7. CSS — where to change the look

| File | What it controls |
|------|------------------|
| `index.css` | CSS variables (`--line-red`, `--bg`, fonts), `body`, `h1` |
| `layout.css` | Everything else — search by section comment |

### `layout.css` sections (line numbers approximate)

| Section | Classes to know |
|---------|-----------------|
| Shell & header | `.app-shell`, `.app-header`, `.map-bg`, `.map-svg` |
| Panels & buttons | `.panel`, `.btn-primary`, `.btn-secondary`, `.btn-demo` |
| Instructions | `.instructions-page`, `.rules-sidebar` |
| Login | `.login-page`, `.login-card`, `.demo-box` |
| Line colors | `.line-color-red`, `.line-color-blue`, … |
| Game phases | `.game-phase`, `.setup-phase`, `.planning-phase`, … |
| Execution | `.execution-phase`, `.event-card`, `.route-progress` |
| Result | `.result-phase`, `.final-score` |
| Ranking | `.ranking-table`, `.ranking-summary`, `.ranking-row-self` |
| Coins | `.coin-amount`, `.coin-icon` |

**Change theme colours:** edit `:root` in `index.css` — components using `var(--line-red)` etc. update automatically.

**Background map strength:** `layout.css` → `.map-svg { opacity: 0.14 }`.

**Medal row colours:** `layout.css` → `.ranking-table tr[data-place='1']` etc.

---

## 8. Common edits (copy this list)

| I want to… | Edit this |
|------------|-----------|
| Change app title in header | `Navbar.jsx` — `LAST RACE` |
| Change login tagline | `LoginPage.jsx` — `.lead` paragraph |
| Change demo users on login | `LoginPage.jsx` — `DEMO_USERS` |
| Change instructions steps | `InstructionsPage.jsx` — `<ol className="instructions-list">` |
| Change quick rules sidebar | `GameRules.jsx` |
| Change setup button text | `SetupPhase.jsx` |
| Change 90s timer warning thresholds | `PlanningPhase.jsx` — `WARNING_MS`, `URGENT_MS` |
| Change timer colours | `layout.css` — `.timer-warning`, `.timer-urgent` |
| Change execution step speed | `ExecutionPhase.jsx` — only manual “Next” (no auto-advance) |
| Change result messages | `ResultPhase.jsx` |
| Change ranking title | `RankingPage.jsx` — `<h1>` |
| Change medal icons | `RankingIcons.jsx` |
| Change coin icon look | Edit local `assets/coin.svg` (gitignored), then `cd client` → `npm run export-icons`, commit the PNG |
| Change medal look | Same for `assets/medal-gold.svg` (etc.) — commit updated PNGs only |
| Add subway background lines | `SubwayMapBackground.jsx` — add `<path>` / `<circle>` |
| Block a route when logged out | `ProtectedRoute.jsx` (already redirects to `/login`) |
| Change where login sends you | `LoginPage.jsx` — `navigate('/game')` |
| Change API server URL | `api/client.js` — `API_BASE` |

---

## 9. Data shapes (what the server sends)

Keep this handy when you `console.log(res.data)`.

### After login — `user`

```json
{ "id": 1, "username": "Omar" }
```

### Game (setup / after planning)

```json
{
  "id": 3,
  "status": "setup",
  "start": "Green Park",
  "destination": "Notting Hill",
  "startStationId": 1,
  "destinationStationId": 9,
  "planningDeadline": "2026-06-05T12:01:30.000Z"
}
```

### Network full (`?view=full`)

```json
{
  "lines": [{ "id": 1, "name": "Red Line", "stations": [{ "id": 1, "name": "Green Park" }, ...] }],
  "segments": [{ "fromId": 1, "toId": 2, "from": "Green Park", "to": "Regent Street" }]
}
```

### Route submit response

```json
{
  "valid": true,
  "finalScore": 21,
  "steps": [
    {
      "order": 1,
      "from": "Green Park",
      "to": "Hyde Park Corner",
      "event": { "description": "Quiet journey", "effect": 0 },
      "coinsAfter": 20
    }
  ]
}
```

Invalid route: `valid: false`, `finalScore: 0`, usually no `steps`.

### Ranking row

```json
{ "username": "Omar", "bestScore": 22 }
```

Only users with at least one **completed** game appear.

---

## 10. React patterns used (exam-relevant)

| Pattern | Where | Why |
|---------|-------|-----|
| `useState` | All pages | Form fields, phase, lists |
| `useEffect` | GamePage, PlanningPhase, RankingPage, AuthContext | Load data on mount, timer |
| `useCallback` | GamePage, PlanningPhase, AuthContext | Stable functions for effects |
| `useMemo` | PlanningPhase (`nameById`), AuthContext (`value`) | Avoid recalculating maps |
| `useRef` | PlanningPhase | `autoSubmitted` — timer must not double-submit |
| Context | AuthContext + useAuth | Share user everywhere |
| React Router | App, Navbar, pages | URLs + `NavLink` active state |
| No DOM APIs | — | No `document.querySelector` — exam rule |

---

## 11. Debug checklist

1. Server running on 3001? Client on 5173?
2. Browser devtools → **Network** → calls go to `localhost:3001` with cookie?
3. **Console** errors? Note file name in stack trace → open that file from section 1.
4. Game stuck on loading? Check `GamePage` — `createGame` or `fetchNetworkFull` failed.
5. Ranking empty? Seed users need completed games (see server `seed.sql`).
6. Login works but game 401? Cookie not sent — check `credentials: 'include'` in `client.js`.

---

## 12. Related docs

| Doc | Use when |
|-----|----------|
| [LAST-RACE-API-PLAN.md](./LAST-RACE-API-PLAN.md) | Server endpoints and JSON shapes |
| [LAST-RACE-DATABASE.md](./LAST-RACE-DATABASE.md) | Seed users, scores, station names |
| [LAST-RACE-BACKLOG.md](./LAST-RACE-BACKLOG.md) | What’s done / Step 10 submission |
| [README.md](../README.md) | What examiners read |

---

*Last updated: after Steps 8–9 (game + ranking UI) and subway background.*
