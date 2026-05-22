# Exam #N: "Exam Title"
## Student: s123456 LASTNAME FIRSTNAME 

## React Client Application Routes

- Route `/`: page content and purpose
- Route `/something/:param`: page content and purpose, param specification
- ...

## API Server

- GET `/api/health`
  - No parameters. Response: `{ "ok": true }`
- GET `/api/courses` (anonymous)
  - No parameters. Response: JSON array of `Course` objects, sorted by `name`
  - Each object: `code`, `name`, `credits`, `maxStudents`, `preparatoryCourse`, `incompatible` (array), `enrolled` (count)
- POST `/api/sessions` (login)
  - Body: `{ "username": "...", "password": "..." }`. Response `201`: `Student` object; sets session cookie
- GET `/api/sessions/current`
  - Response: `Student` if logged in, else `401`
- DELETE `/api/sessions/current` (logout)
  - Clears session; response `204`
- GET `/api/study-plan` (protected)
  - Response: `StudyPlan` or `null` if none (`planType`, `courses[]`, `totalCredits`, `minCredits`, `maxCredits`)
- POST `/api/study-plan` (protected)
  - Body: `{ "mode": "full" | "part" }`. Creates empty plan; `409` if one exists
- PUT `/api/study-plan` (protected)
  - Save: validates credit range (full 60–80, part 20–40). Optional body `{ "courses": ["...", ...] }` replaces all courses (use to cancel edits)
- DELETE `/api/study-plan` (protected)
  - Deletes plan and courses; `204`
- POST `/api/study-plan/courses` (protected)
  - Body: `{ "courseCode": "..." }`. Returns updated plan; `400` with `{ "error": "INCOMPATIBLE" | "PREPARATORY" | "MAX_STUDENTS" | ... }`
- DELETE `/api/study-plan/courses/:code` (protected)
  - Removes course; `400` if preparatory dependency blocks removal

**Cancel (client):** keep snapshot from GET; on Cancel, `PUT` with original `courses` array (no server-side draft table).

## Server data models

- `Course` ([`server/StudyPlanModels.js`](server/StudyPlanModels.js)): code, name, credits, maxStudents, preparatoryCourse, incompatible[], enrolled
- `Student` ([`server/StudyPlanModels.js`](server/StudyPlanModels.js)): studentId, email, name, surname, planType
- `StudyPlan` ([`server/StudyPlanModels.js`](server/StudyPlanModels.js)): planId, planType, courses[], totalCredits, minCredits, maxCredits

## Database Tables

- Table `courses` — course catalog: code (PK), name, credits, optional max_students, optional preparatory_code (FK to courses)
- Table `incompatibilities` — pairs of courses that cannot be in the same plan
- Table `users` — username and bcrypt password_hash
- Table `study_plans` — one saved plan per user (mode: full or part)
- Table `study_plan_courses` — courses in each saved plan (enrollment counts derived from here)

## Main React Components

- `ListOfSomething` (in `List.js`): component purpose and main functionality
- `GreatButton` (in `GreatButton.js`): component purpose and main functionality
- ...

(only _main_ components, minor ones may be skipped)

## Screenshot

![Screenshot](./img/screenshot.jpg)

## Users Credentials

- alice, password (full-time study plan)
- bob, password (part-time study plan)
- carol, password (full-time; includes capped course 01TXYOV)
- dave, password (part-time; includes 01TXYOV and 01URSPD)
- eve, password (full-time; fills enrollment caps on 01TXYOV and 01URSPD)

## Use of AI Tools
Briefly describe whether you used any AI tools (e.g., ChatGPT, GitHub Copilot, Claude) while working on this project, for which purposes (e.g., clarifying concepts, debugging, generating code), and how you verified or adapted their output.
If you did not use any AI tools, simply state so.
