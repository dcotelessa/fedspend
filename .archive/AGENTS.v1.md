# FedSpend — Agent Guide

This file governs how all agents (Pi, opencode) work in this repo. Read it
before doing anything. The rules here were learned from real failures — they
are not style preferences.

## What This Project Is
A federal-spending visualizer: NestJS backend + Angular frontend, data from
USASpending.gov and OpenFEMA, for six tracked agencies (NASA, GSA, OPM, LOC,
HHS, FDIC). Built epic-by-epic, story-by-story, through a verification pipeline.

## Stack — do not deviate
- Backend: NestJS, TypeScript (strict), TypeORM, pnpm
- Frontend: Angular 17, Angular Material, ng2-charts  (NOT React, NOT Vue)
- Database: SQLite (dev) / Postgres (prod), switched by DATABASE_URL
- Deploy: Render  (NOT Vercel, NOT Railway)
- Node 22+, pnpm 10+
- Core NestJS packages: @nestjs/common @nestjs/core @nestjs/platform-express
  reflect-metadata rxjs @nestjs/cli

## What This Project Does NOT Use
(Listed because agents have hallucinated these.)
- Nx, Turborepo, Lerna, or any monorepo tooling
- React, Vue, Next.js
- Vercel, Railway
- A SharedModule. `shared/` holds TypeScript interfaces only, imported via
  `@shared/*`. It stays at repo ROOT, never moves into backend/src.

## Package Manager — settled
- Use pnpm for everything. `approve-builds=true` handles native modules
  (better-sqlite3). Do NOT fall back to npm — it causes lockfile conflicts
  that break Render deployment in Epic 9.

## Repo Structure (fixed — never propose restructuring)
```
fedspend/
  docs/                  epic plans + data model (source of truth for specs)
  shared/interfaces/     TS interfaces, imported as @shared/*  (ROOT, stays here)
  backend/src/           NestJS source
  frontend/src/          Angular source (later epics)
  .research/
    plan.json            Planout output — the spec all stories execute against
    build-log.json       per-story run history (tracked in git)
  verify2.sh             plan-driven acceptance checker (+ --guard)
  extract-story.sh       isolates one story from plan.json
  run-story.sh           orchestrates a story end-to-end
```

## The Pipeline (how work actually happens)
```
Research → Planning → Handoff → Build → QA-verify → QA-review → Report
```
- Research:   human + strong model, decide what to build
- Planning:   GLM-5.1, decompose epic into stories, resolve contradictions,
              write CHECKABLE acceptance criteria → .research/plan.json
- Handoff:    mechanical scaffolding (scripted/templated where possible)
- Build:      local model (qwen3-coder-next) via Pi, mechanical execution
- QA-verify:  verify2.sh — deterministic, no model, the only thing that
              decides PASS/FAIL
- QA-review:  (later) judgment pass on code that passed verify
- Report:     summarize build-log.json — what passed, what escalated

## Build Agent Rules (Pi / local model) — these prevent real failures
- Do ONLY the current story. One story. Nothing adjacent, nothing "while I'm
  here," nothing for future stories.
- Touch ONLY the files in the current story's `scope.files`. This is a CLOSED
  SET. Creating any file outside it is a failure — the guard will catch it.
- NEVER claim a file was written without reading it back from disk. Self-
  reported completion is not trusted; verify2.sh checks disk reality.
- NEVER create files for a later story. Entities are their own story; do not
  create *.entity.ts while scaffolding modules. Controllers/services get
  IMPLEMENTED in their own stories; scaffold stories leave them empty.
- NEVER run find/grep/ls across node_modules or the whole tree. The files you
  need are in the story's scope.files. Read those directly. Unscoped searches
  flood the session and cause failures.
- The NestJS CLI scaffolds a default AppController and AppService. UNLESS a
  story explicitly keeps them, REMOVE them — and remove their imports/
  registration from app.module.ts.
- Do NOT invent problems, new stories, or "improvements." If the spec seems
  wrong, the contradiction was already resolved in plan.json's `resolutions`.
  Trust the plan; do not re-litigate it.
- Do NOT ask clarifying questions. The story spec is complete by design. If a
  decision seems needed, the answer is in the spec or the resolutions.
- Read each file before editing. Edit surgically — do not rewrite a whole file
  to change one line (this drops other stories' contributions to shared files
  like app.module.ts).
- When all of the story's acceptance-criteria checks pass and the build is
  clean, stop. Emit exactly: ===STORY_COMPLETE===

## Data Conventions (from plan.json resolutions — do not contradict)
- All MONETARY values are integers (cents), never floats. This includes
  perCapita (stored as cents-per-person).
- recoveryRatio is a dimensionless ratio (fedSpending/fema) — store as
  float/decimal. The cents-integer rule does NOT apply to it.
- TypeORM entity glob: `__dirname + '/../**/*.entity{.ts,.js}'` is correct.
  At runtime config compiles to dist/config/, so ../ reaches dist/.
- The TypeORM config factory must `mkdirSync('data', { recursive: true })`
  before returning SQLite config — better-sqlite3 won't create the dir.
- sync module: module + service only, NO controller in Epic 1.
- health module: module + controller only, NO service.
- ApiResponse<T> lives in @shared/interfaces — import it, never duplicate.

## Session Hygiene (local models degrade over long sessions)
- One story = one fresh Pi session. Kill it (Ctrl+C) and relaunch between
  stories. Do not run multiple stories in one session.
- If a session starts hallucinating (inventing files, proposing batches,
  drifting to other stacks), stop it. Do not negotiate with it. Restart.

## Available Pi Tools (exact names — do not invent others)
bash, edit, glob, grep, read, write, skill, task, todowrite, webfetch
- There is no run_shell_command, list_files, shell, terminal, or python tool.
- bash requires BOTH keys: {"description": "...", "command": "..."}
- read/write/edit use "filePath" (relative, never absolute, never leading /).
- All paths are relative to the directory Pi was launched from (repo root).

## Verification is the Source of Truth
- verify2.sh reads acceptance criteria from plan.json and runs them. The plan
  is the single source of truth for what "done" means.
- A story is done ONLY when `./verify2.sh <STORY> --guard` exits 0.
- The model's word never ends a story. Disk reality does.
