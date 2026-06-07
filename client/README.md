# Last Race — React client

Single-page app for the **Last Race** exam project (React 19 + Vite).

## Run

```powershell
npm install
npm run dev
```

App: `http://localhost:5173` — requires the API server on `http://localhost:3001`.

## Documentation

| Doc | Content |
|-----|---------|
| [docs/LAST-RACE-CLIENT-STEP6.md](../docs/LAST-RACE-CLIENT-STEP6.md) | **Step 6 trace guide** — routing, auth, guards, how to verify |
| [docs/LAST-RACE-BACKLOG.md](../docs/LAST-RACE-BACKLOG.md) | Full task list (Steps 6–10) |
| [docs/LAST-RACE-API-PLAN.md](../docs/LAST-RACE-API-PLAN.md) | Server API shapes the client will call |

## Source layout (Step 6)

```text
src/
  api/client.js           HTTP helper (credentials: 'include')
  auth/                   Session context + useAuth
  components/             Navbar, ProtectedRoute, GuestRoute
  pages/                  One file per route
  App.jsx                 Route table
  layout.css              Layout styles (restyle without touching logic)
```

Steps 8–9 will extend `pages/GamePage.jsx` and `pages/RankingPage.jsx`.
