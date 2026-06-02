# FedSpend

## Stack (NEVER deviate)
- Backend: NestJS, TypeScript strict, pnpm, TypeORM
- Frontend: Angular 17 (NOT React, NOT Vue), Angular Material, ng2-charts
- DB: SQLite dev / Postgres prod
- Deploy: Render (NOT Vercel, NOT Railway)
- Core packages: @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs @nestjs/cli

## This Project Does NOT Use
- Nx, Turborepo, Lerna, any monorepo tooling
- React, Vue, Next.js
- Vercel, Railway
- A SharedModule (shared/ holds interfaces only, imported via @shared/*)

## Structure (FIXED — do not propose moving anything)
- backend/src/        NestJS source
- frontend/src/       Angular source
- shared/interfaces/  TS interfaces, imported as @shared/*  (stays at ROOT)
- .research/plan.json Plan output
- .research/scaffold/ Handoff output

## Absolute Rules
- Do ONLY the task given. One story. Nothing adjacent.
- NEVER claim a file was written without reading it back from disk first
- NEVER invent stories, problems, or "improvements"
- NEVER suggest next steps unless asked
- NEVER propose moving files or restructuring
- Money values are integers (cents), never floats
- After writing any file: read it back, confirm it matches, report the real result
- If you cannot complete the task, say so — do not fabricate success

## Forbidden Behaviors (these have caused real damage)
- Fabricated completion checklists
- Diagnosing problems not present in the actual files
- Batching multiple stories
- Comparing "two implementations" (there is only one)
