# Last Race — React client: Step 6 trace guide

**Exam:** Web Applications I 2025/26 — Exam #1 “Last Race”  
**Branch:** `dev`  
**Scope:** Step 6 only (router + auth shell + placeholders)  
**Related:** [LAST-RACE-BACKLOG.md](./LAST-RACE-BACKLOG.md) · [LAST-RACE-API-PLAN.md](./LAST-RACE-API-PLAN.md)

Use this document to trace **what happens, in what order, and which file owns it**. Styling lives in `client/src/layout.css` and can be changed later without touching the logic described here.

---

## 1. What Step 6 added

Step 6 replaces the Vite demo with three building blocks:

1. **Routing** — URL → page (`react-router-dom`)
2. **Session awareness** — know if the user is logged in (Passport cookie via API)
3. **Access control** — block `/game` and `/ranking` when logged out

Game logic and ranking data are **not** implemented yet — only placeholders on `/game` and `/ranking`.

```text
main.jsx
  └─ BrowserRouter
       └─ AuthProvider          ← checks session on load
            └─ App.jsx
                 ├─ Navbar       ← links depend on user
                 └─ Routes        ← page + guards
```

---

## 2. Boot sequence

**File:** `client/src/main.jsx`

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```

| Wrapper | Role |
|---------|------|
| `StrictMode` | Exam requirement — React runs effects twice in dev |
| `BrowserRouter` | URL drives which page renders |
| `AuthProvider` | Loads session before routes decide access |

**Trace in DevTools:** refresh `http://localhost:5173` → Network tab should show:

```http
GET http://localhost:3001/api/sessions/current
```

That request is fired by `AuthProvider` on first paint.

---

## 3. Session loading (`AuthProvider`)

**Files:** `client/src/auth/AuthContext.jsx`, `client/src/auth/useAuth.js`, `client/src/api/client.js`

### On mount

1. `refreshUser()` calls `GET /api/sessions/current`
2. `200` → `user = { id, username }`
3. `401` → `user = null` (anonymous — not an error)
4. `loading = false` when done

While `loading` is true, guards show “Loading session…” so the app does not flash `/login` before the cookie check finishes.

### `apiFetch` — all HTTP from the client

```javascript
fetch(`${API_BASE}${path}`, {
  method,
  credentials: 'include',  // sends Passport session cookie
  ...
});
```

`credentials: 'include'` is required for the exam **two-servers** pattern (`localhost:5173` → `localhost:3001`). Server CORS was configured in Step 0.

### Login and logout

| Action | API | Client after success |
|--------|-----|----------------------|
| `login(username, password)` | `POST /api/sessions` → `201` | `setUser(data)` |
| `logout()` | `DELETE /api/sessions/current` → `204` | `setUser(null)` |

Any component calls `useAuth()` to read `{ user, loading, login, logout, refreshUser }`.

---

## 4. Routing (`App.jsx`)

**File:** `client/src/App.jsx`

| URL | Page | Guard |
|-----|------|-------|
| `/` | `InstructionsPage` | None (public) |
| `/login` | `LoginPage` | `GuestRoute` |
| `/game` | `GamePage` (placeholder) | `ProtectedRoute` |
| `/ranking` | `RankingPage` (placeholder) | `ProtectedRoute` |
| `*` | redirect to `/` | — |

**Exam alignment:** anonymous users never mount protected routes, so they do not trigger game or network API calls from those pages. Step 8 will fetch map data only inside `/game` when logged in.

---

## 5. Route guards

### `ProtectedRoute` — `/game`, `/ranking`

1. If `loading` → show loading message  
2. If `!user` → `<Navigate to="/login" />`  
3. Else → render children  

**Trace:** logged out, open `/game` → URL becomes `/login`, game page never mounts.

### `GuestRoute` — `/login`

If `user` already exists → `<Navigate to="/game" />`. Logged-in users skip the login form.

---

## 6. Navbar (`components/Navbar.jsx`)

Navbar mirrors auth state (exam: anonymous must not see Play / Ranking).

| Logged in | Anonymous |
|-----------|-------------|
| Play · Ranking · Instructions | Instructions · Login |
| `username` + Logout button | — |

**Logout flow:** `logout()` → `DELETE /api/sessions/current` → `navigate('/')` → anonymous nav returns.

---

## 7. Login flow (end-to-end)

1. User opens `/login`, submits credentials  
2. `LoginPage` → `login()` in `AuthContext`  
3. `POST /api/sessions` with `{ username, password }`  
4. Server responds `201` and sets session cookie  
5. Context sets `user`  
6. `navigate('/game')`  
7. `ProtectedRoute` allows `GamePage`  
8. Navbar shows logged-in links  

**After login:** refresh the page — `GET /api/sessions/current` should still return `200` (cookie persisted).

---

## 8. Pages in Step 6

| Page | File | API calls | Notes |
|------|------|-----------|--------|
| Instructions | `pages/InstructionsPage.jsx` | **None** | Static rules; exam: no map for anonymous |
| Login | `pages/LoginPage.jsx` | `POST /api/sessions` | Form + error on `401` |
| Game | `pages/GamePage.jsx` | **None yet** | Step 8: setup → planning → execution → result |
| Ranking | `pages/RankingPage.jsx` | **None yet** | Step 9: `GET /api/ranking` |

---

## 9. Styling vs logic

| File | Safe to restyle later? |
|------|-------------------------|
| `client/src/layout.css` | Yes — header, cards, spacing |
| `client/src/index.css` | Yes — global tokens |
| `pages/*.jsx`, `components/*.jsx` | Keep structure + class names; change CSS freely |

Step 6 behavior does not depend on mockup colors or layout details.

---

## 10. Manual verification checklist

Start both servers:

```powershell
cd server
nodemon index.js

cd client
npm run dev
```

Then trace:

- [ ] Open `/` — Instructions; `GET /api/sessions/current` (401 or 200)  
- [ ] Navbar (anonymous) — Instructions + Login only  
- [ ] Visit `/game` — redirect to `/login`  
- [ ] Visit `/ranking` — redirect to `/login`  
- [ ] Login `Paolo` / `password` — `POST /api/sessions` → `201`; land on `/game`  
- [ ] Navbar (logged in) — Play, Ranking, Instructions, Logout  
- [ ] `/game` and `/ranking` — placeholders; no game API calls yet  
- [ ] Refresh while logged in — session still valid  
- [ ] Logout — `DELETE /api/sessions/current`; return to `/`  
- [ ] `/game` after logout — redirect to `/login`  
- [ ] Browser console — no errors  

---

## 11. File map

```text
client/src/
  main.jsx                        StrictMode + Router + AuthProvider
  App.jsx                         Shell + route table
  api/client.js                   fetch wrapper (credentials: 'include')
  auth/AuthContext.jsx            user state, login, logout, refresh
  auth/useAuth.js                 hook for context
  components/Navbar.jsx           Navigation from auth state
  components/ProtectedRoute.jsx   Logged-in only
  components/GuestRoute.jsx         Login page when logged out
  pages/InstructionsPage.jsx      Public rules (no map API)
  pages/LoginPage.jsx             Login form
  pages/GamePage.jsx                Step 8 — game phases
  pages/RankingPage.jsx             Step 9 — leaderboard
  layout.css                      Layout / skin (restyle here)
  index.css                       Global base styles
```

---

## 12. Oral prep one-liners

- **Why `AuthProvider`?** Single source of truth for session; Navbar and guards share it without prop drilling.  
- **Why guards and Navbar?** Exam: anonymous users cannot play or see ranking; guards enforce URLs, Navbar hides links.  
- **Why `credentials: 'include'`?** Passport session cookie must be sent on every API call between client and server ports.  
- **Why placeholders?** Step 6 is the skeleton; game flow (Step 8) and ranking table (Step 9) plug into existing routes.  

---

## 13. What Step 8 will reuse

Most new work goes into `GamePage` and child components (`SetupPhase`, `PlanningPhase`, etc.). These Step 6 pieces should change little:

- `AuthProvider` / `useAuth`  
- `ProtectedRoute` on `/game`  
- `api/client.js` for all fetches  
- `Navbar` links  

---

*Update this doc when Step 7–9 add pages or change routes.*
