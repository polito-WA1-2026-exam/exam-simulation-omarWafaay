# Exam #N: "Exam Title"
## Student: s123456 LASTNAME FIRSTNAME 

## React Client Application Routes

- Route `/`: page content and purpose
- Route `/something/:param`: page content and purpose, param specification
- ...

## API Server

- POST `/api/something`
  - request parameters and request body content
  - response body content
- GET `/api/something`
  - request parameters
  - response body content
- POST `/api/something`
  - request parameters and request body content
  - response body content
- ...

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
