# Web project planning guide (general)

A repeatable method for Polito-style exams and any **React SPA + Node/Express + SQLite** assignment.

---

## 1. Read the spec three times (different lenses)

| Pass | Question you answer |
|------|---------------------|
| **1 — User stories** | Who uses the app? What do they see and click? What changes after login? |
| **2 — Data & rules** | What entities exist? What are the validation rules? What must be stored vs computed? |
| **3 — Grading & ops** | Folder layout, start commands, README, auth library, submission tag, what is *not* tested (refresh, direct URLs)? |

Highlight in three colors (mental or on paper):

- **Must implement** (functional requirements)
- **Must respect** (constraints, credits, caps, etc.)
- **Quality / architecture** (SPA, no DOM hacks, CORS, validation)

---

## 2. Break down requirements into buckets

Copy every bullet from the PDF into one table:

| ID | Requirement | Type | Layer |
|----|-------------|------|-------|
| R1 | Anonymous user sees all courses A–Z | read | DB + API + UI |
| R2 | Logged user creates study plan | write | API + UI + session |
| … | … | … | … |

**Types:**

- **read** — GET, display only
- **write** — POST/PUT/DELETE, changes DB
- **rule** — enforced on server (and optionally mirrored in UI)
- **session** — only when logged in
- **persist** — survives reload; vs **draft** — editing session only

If a requirement is vague, write your **interpretation** in README (one line). Examiners prefer a documented choice over silence.

---

## 3. Derive the data model before code

For each **noun** in the spec, ask:

1. Is it stored permanently? → **table**
2. Is it derived from others? → **query** or API field, not a table
3. Is it many-to-many? → **junction table**

**Example pattern (StudyPlan-like apps):**

```
Entity          →  Table(s)
Course          →  courses
Constraint      →  incompatibilities; preparatory_code on courses
User            →  users (hashed password)
User-owned set  →  study_plans + study_plan_courses
```

**Rules live on the server.** List each rule with:

- **When** it runs (on add / on remove / on save)
- **Input** (current plan + candidate course)
- **Failure message** the UI will show

Draw a quick ER diagram on paper (boxes + arrows). Only then write `schema.sql`.

---

## 4. Design APIs from screens, not from tables

Walk through each **screen** in order of difficulty:

1. Anonymous home (simplest reads)
2. Login / logout
3. Logged-in home (read plan + list)
4. Editing actions (add/remove/save/cancel/delete)

For each screen, list:

| Screen | Data needed | Endpoint(s) | Auth? |
|--------|-------------|-------------|-------|
| Anonymous courses | all courses + counts + constraints | `GET /api/courses` | no |
| Logged home | courses + my plan | `GET /api/courses`, `GET /api/study-plan` | yes |

**Principles:**

- One endpoint = one clear job.
- Return only what the UI needs (no password hashes, no other users’ data).
- Use HTTP status codes: `401` not logged in, `400` rule violation, `404` missing resource.
- Return **machine-readable** error codes for the UI (`INCOMPATIBLE`, `MAX_STUDENTS`, …).

Write the API list in README as you implement (not at the end).

---

## 5. Split implementation into vertical slices

Do **not** build “all of DB, then all of API, then all of React” without testing. Prefer **thin vertical slices**:

```
Slice 1: DB seed + GET /api/courses → JSON in browser
Slice 2: login + GET /api/study-plan (empty)
Slice 3: create plan + add one course
Slice 4: all constraints + remove rules
Slice 5: save/cancel/delete + credit validation
Slice 6: UI polish + README + screenshot
```

Each slice ends with a **demo you can click or curl**.

---

## 6. Order of work (default template)

| Step | What | Done when |
|------|------|-----------|
| 0 | Two servers, CORS, health route | Client fetches JSON |
| 1 | Schema + seed + init script | SQL checks pass |
| 2 | Public read APIs | Anonymous data correct |
| 3 | Auth (Passport + sessions) | Cookie login works |
| 4 | Protected write APIs | Rules enforced in Express |
| 5 | React router + layout | Routes without reload |
| 6 | Anonymous page | Matches spec layout/order |
| 7 | Logged-in flows | Edit, save, cancel, delete |
| 8 | Validation + UX + README | Clean console, submission ready |

Adjust order only if the spec forces it (e.g. auth before any private data).

---

## 7. Separate draft state from persistent state early

Many exams have **Save** and **Cancel**:

| | Draft | Persistent |
|---|--------|------------|
| When | While editing | After Save |
| Cancel | Discard draft | Unchanged |
| Delete | — | Remove all |

Decide upfront:

- **Server-side draft** (extra column/table), or
- **Client-side draft** (refetch on Cancel, PUT on Save)

Both are valid; document the choice.

---

## 8. React structure (exam-friendly)

**Routes** ≈ one per major “place” (often few routes; one home with conditional content).

**Components:**

- **Smart (container):** fetch data, hold draft state, call API.
- **Dumb (presentational):** props in, JSX out; no fetch.

**State:**

- Server data → `useState` + `useEffect` fetch (or context for user/session).
- Draft edits → local state until Save.
- Never mutate state in place; always new objects/arrays.

**Checklist:**

- [ ] `credentials: 'include'` on authenticated fetches
- [ ] No `document.getElementById` for app logic
- [ ] Strict Mode: watch double-fetch in dev

---

## 9. Verification plan (before you call it done)

**Database**

- [ ] Seed counts match spec (users, courses, edge cases)
- [ ] Edge cases in data (max enrollment, full vs part plans)

**API (curl or REST client)**

- [ ] Anonymous cannot access protected routes
- [ ] Each rule has one test that must fail with correct message
- [ ] Save with invalid credits fails

**UI (manual script)**

Write a 10-line script: “Login as X → create part-time → add course A → try B → expect message …”. Follow it exactly.

**Submission**

- [ ] Fresh folder: `git clone` → `npm install` → both servers start
- [ ] Linux case sensitivity on imports/file names
- [ ] Tag `final`, README complete

---

## 10. Requirement → task breakdown (worksheet)

Fill this for any new project:

### Actors

- Anonymous: can …
- Logged-in: can additionally …

### Entities & fields

| Entity | Fields | Notes |
|--------|--------|-------|
| | | |

### Business rules

| Rule | Trigger | Error to show |
|------|---------|---------------|
| | | |

### Screens / routes

| Route | Visible if | Main actions |
|-------|------------|--------------|
| | | |

### API sketch

| Method | Path | Body | Response |
|--------|------|------|----------|
| | | | |

### Open questions (answer in README)

1.
2.

---

## 11. Timeboxing (exam day)

| Block | Focus |
|-------|--------|
| 0:00–0:45 | Setup, schema, seed |
| 0:45–2:00 | All read APIs + course list UI |
| 2:00–3:30 | Auth + core write APIs |
| 3:30–5:00 | Logged-in editing + messages |
| 5:00–6:00 | Save/cancel/delete + credits |
| Last 30–60 min | README, screenshot, clean clone test |

If behind: ship **correct server rules** + minimal UI before polish.

---

## 12. Using AI without losing ownership

**Good uses:** explain Passport flow, why CORS fails, how to structure a junction table, interpret an error.

**Risky uses:** paste full spec → get full repo → submit unchanged.

**Process:** you implement slice → test → paste **error + your snippet** → adapt answer → re-test → note in disclosure.

---

## 13. One-page checklist (printable)

```
[ ] Requirements table (ID, layer, type)
[ ] ER diagram + schema.sql + seed.sql
[ ] API list in README
[ ] CORS + credentials
[ ] Auth on protected routes only
[ ] All rules on server
[ ] Draft vs persistent clear
[ ] React routes + components list in README
[ ] Manual test script executed
[ ] Clean clone + tag final
```

---

*Pair this guide with `LAST-RACE-DATABASE.md` (DB), `LAST-RACE-API-PLAN.md` (HTTP APIs), and `LAST-RACE-BACKLOG.md` (checklist). `STUDYPLAN-GUIDED-LAB.md` is only a generic phase reference (demo project).*
