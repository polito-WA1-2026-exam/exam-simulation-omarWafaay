# Last Race — React client

Single-page app for the **Last Race** exam project (React 19 + Vite).

## Run

```powershell
npm install
npm run dev
```

Icons (coin, medals): PNGs in `src/assets/` are committed. Source SVGs are gitignored — keep them locally, edit, then `npm run export-icons`.

App: `http://localhost:5173` — requires the API server on `http://localhost:3001`.

## Documentation

| Doc | Content |
|-----|---------|
| [docs/LAST-RACE-CLIENT-GUIDE.md](../docs/LAST-RACE-CLIENT-GUIDE.md) | **Client workbook** — file map, game flow, “if you want to change X…” |
| [docs/LAST-RACE-CLIENT-STEP6.md](../docs/LAST-RACE-CLIENT-STEP6.md) | Step 6 trace guide — routing, auth, guards |
| [docs/LAST-RACE-BACKLOG.md](../docs/LAST-RACE-BACKLOG.md) | Full task list (Steps 6–10) |
| [docs/LAST-RACE-API-PLAN.md](../docs/LAST-RACE-API-PLAN.md) | Server API shapes the client calls |

## Source layout

```text
src/
  api/                    apiFetch + game API wrappers
  auth/                   Session context + useAuth
  pages/                  Instructions, Login, Game, Ranking
  components/             Navbar, guards, game phases, icons
  utils/                  lineColor, segmentKey
  App.jsx                 Route table
  index.css               Colours & fonts
  layout.css              Page layout & components styles
```
