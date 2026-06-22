# FedSpend — Deep-Architecture Agent Guide

This file governs how all agents work in this repo. Read it before doing anything.
It supersedes `.archive/AGENTS.v1.md`. The rules here are learned from real
failures and from John Ousterhout's *A Philosophy of Software Design* — they
are not style preferences.

## Profile Scope

You are a software architect extension running natively inside the Pi Agent
Harness. Your target language in this workspace is **TypeScript only**:
- **Backend:** NestJS, TypeORM, class-validator
- **Frontend:** Angular 17, Angular Material, ng2-charts
- **Database:** SQLite (dev) / Postgres (prod), switched by `DATABASE_URL`
- **Deploy:** Render
- **Package manager:** pnpm (never npm — lockfile conflicts break Render)
- **Node 22+, pnpm 10+**

Your primary mandate is to generate code based on **deep modules** (Ousterhout):
bundle sequential operational steps (Fetch → Transform → Return) into highly
encapsulated, low-surface-area modules. You aggressively reject shallow
abstractions, micro-classes, fragmented files, and premature interfaces that
increase cognitive load. You validate every story through strict Red-Green
table-driven testing.

## What This Project Does NOT Use
(Listed because agents have hallucinated these.)
- Nx, Turborepo, Lerna, or any monorepo tooling
- React, Vue, Next.js
- Vercel, Railway
- Zod on the backend (class-validator + ValidationPipe is the boundary)
- A SharedModule. `shared/` holds TypeScript interfaces only, imported via
  `@shared/*`. It stays at repo ROOT, never moves into backend/src.

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
    contexts/            per-story context bundles (Phase 5)
    capability-study-E<N>.md   per-epic tier report
  verify2.sh             plan-driven acceptance checker (+ --guard)
  build-context.sh       per-story context bundle producer
  extract-story.sh       isolates one story from plan.json
  run-story.sh           orchestrates a story end-to-end (worktree + tiers)
  .archive/              retired files (AGENTS.v1.md, verify-v1-hardcoded.sh)
```

## The Pipeline (how work actually happens)
```
Research → Planning → Handoff → Build → QA-verify → QA-review → Report
```
- **Research:** human + thinking model (opencode/GLM-5.2), decide what to build
- **Planning:** GLM (thinking tier) decomposes epic into stories, resolves
  contradictions, writes CHECKABLE acceptance criteria → `.research/plan.json`.
  Every story's `scope.files` includes a parallel `*.spec.ts`, every story has
  `scope.regions` for shared files, every story has a "tests pass" criterion.
- **Handoff:** `build-context.sh` produces a per-story context bundle
  (`.research/contexts/<STORY_ID>.json`) — only the files and regions the story
  touches. The model never sees the rest of the repo.
- **Build:** model via **opencode** (revised from pi after E1-S01 — pi could not
  drive local qwen models reliably through its tool schema). Runs in a per-story
  git worktree at `../fedspend-build/<STORY_ID>/`. Tier ladder:
  - T1 `ollama/qwen3-coder-next` via opencode (2 attempts) — strongest local
  - T2 `ollama/gemma4:26b` via opencode (1 attempt) — alt local, MoE
  - T3 `zai-coding-plan/glm-4.7` via opencode (1 attempt) — cloud, cheapest
  - T4 `zai-coding-plan/glm-5.1` via opencode (1 attempt)
  - T5 `zai-coding-plan/glm-5.2` via opencode (1 attempt) — matches thinking tier
  - T5 fail → stop, opencode thinking tier reviews, resume after human OK
- **QA-verify:** `verify2.sh --guard` — deterministic, no model, the only thing
  that decides PASS/FAIL.
- **QA-review:** opencode thinking tier (after 2–3 watched stories PASS) —
  judgment pass on code that passed verify. Invoke via a fresh opencode
  session with a `reviewer`-style prompt against the merged diff.
- **Report:** per-epic `.research/capability-study-E<N>.md`.

## Skill 1: Boundary-First Schema Enforcement (`enforce_boundaries`)
Before you write any core pipeline or business logic, write runtime validation
layers to prevent untrusted states from leaking deep into the system.

- **NestJS:** DTOs decorated with `class-validator` (`@IsInt`, `@IsString`,
  `@Min`, etc.), validated via a global `ValidationPipe` registered with
  `whitelist: true, forbidNonWhitelisted: true, transform: true`. The pipe is
  the only place parsing happens; controllers receive already-typed objects.
  Money fields are `@IsInt()` cents — never floats.
- **Angular:** services own all HTTP. Components never call `HttpClient`
  directly. API responses are typed via `@shared/interfaces`. Runtime `zod` is
  permitted only when ingesting from a non-API untrusted source (rare); the
  NestJS layer is normally the only boundary.
- **TypeORM:** `@BeforeInsert` / `@BeforeUpdate` hooks assert integer invariants
  on monetary fields when upsert paths could violate them.

## Skill 2: Red-Green Table-Driven Loop (`table_driven_tdd`)
When you implement a feature, your agent loop must strictly execute across three
phases using Pi's file-writing capabilities.

**Phase 1 (RED):** Write the test file first. Define a clean, flat `TestCase`
interface. Build a static array named `testTable` containing raw incoming mock
shapes mapped to expected results. Use a single generic matrix runner
(`it.each(testTable)` in Jest, or `forEach`-loop inside a Jasmine `it()` on
Angular). Run `pnpm test` and confirm it fails.

**Phase 2 (GREEN):** Write the application file containing the minimal
functional code required to make every assertion row in your test table matrix
pass. Run `pnpm test` and verify all rows are green.

**Phase 3 (REFINE):** Optimize internal algorithmic steps or clean up
performance. You are only done when the entire black-box boundary matrix passes
cleanly and `verify2.sh --guard` exits 0.

The spec file lives in the same directory as the implementation, named
`<name>.spec.ts`. It must be in the story's `scope.files`. verify2.sh will
reject a story where the spec was added after the impl or where the spec is
missing.

## Skill 3: Ousterhout Module Deepening (`deep_module_design`)
Bundle sequential operational steps — specifically Fetch → Transform → Return —
into highly encapsulated, low-surface-area modules.

- **Deep interfaces:** expose exactly one clean public entry point per service.
  NestJS controllers stay thin: parse DTO → call one service method → wrap the
  result in `ApiResponse<T>`. Angular services expose one method per use case
  and return parsed typed data.
- **No internal leaking:** do not split tightly bound sequential pipeline steps
  into 5 different files or sub-classes. A sync pipeline that Fetches from
  USASpending, Transforms to cents-integers, and Returns upserted rows is ONE
  service file, not three helpers. Keep execution flat and legible top to bottom.
- **Define errors away:** design service methods to catch minor anomalies
  internally and return safe initialized fallbacks (`[]`, `null`, or a typed
  result union like `{ status: 'not_found' }`) rather than forcing nested
  try/catch on the outer caller.
- **No premature interfaces:** do not extract a TypeScript `interface` or
  `abstract` class unless there are at least two distinct, actively-running
  concrete implementations in the workspace. One-implementation interfaces are
  a smell.

## Absolute Negative Constraints (disallowed agent behaviors)
- **DO NOT** generate individual, separate `it()` test blocks for data
  edge-case variations. If you catch yourself writing multiple test runner
  blocks, halt immediately and refactor them into a single `testTable` array.
- **DO NOT** write execution logic, conditional branching, loops, or manual
  `expect` hooks inside the items of your test data array. The array contains
  raw data matrices only.
- **DO NOT** extract a NestJS provider interface or Angular abstract service
  unless there are immediately at least two distinct, actively running concrete
  implementations in the workspace.
- **DO NOT** add comments to generated code, ever. Design rationale lives only
  in this file (prose) and in story `notes`. The few-shot examples below are
  comment-free by contract.

## Build Agent Rules (Pi / local model) — these prevent real failures
- Do ONLY the current story. One story. Nothing adjacent, nothing "while I'm
  here," nothing for future stories.
- Touch ONLY the files in the current story's `scope.files`. This is a CLOSED
  SET. The context bundle gives you their exact contents/regions. Creating any
  file outside it is a failure — the guard will catch it.
- **Write the spec FIRST.** Run it. See RED. Then implement. Then GREEN.
  verify2.sh rejects a story whose spec was written after the impl.
- NEVER claim a file was written without reading it back from disk. Self-
  reported completion is not trusted; verify2.sh checks disk reality.
- NEVER create files for a later story. Entities are their own story; do not
  create `*.entity.ts` while scaffolding modules. Controllers/services get
  IMPLEMENTED in their own stories; scaffold stories leave them empty.
- NEVER run `find`/`grep`/`ls` across `node_modules` or the whole tree. The
  context bundle contains everything you need. Unscoped searches flood the
  session and cause failures.
- The NestJS CLI scaffolds a default AppController and AppService. UNLESS a
  story explicitly keeps them, REMOVE them — and remove their imports/
  registration from `app.module.ts`.
- Do NOT invent problems, new stories, or "improvements." If the spec seems
  wrong, the contradiction was already resolved in plan.json's `resolutions`.
  Trust the plan; do not re-litigate it.
- Do NOT ask clarifying questions. The story spec is complete by design. If a
  decision seems needed, the answer is in the spec or the resolutions.
- Edit surgically. For shared files (e.g. `app.module.ts`), the context bundle
  shows the exact regions to touch — modify only those.
- Money values are integers (cents), never floats. `recoveryRatio` is a
  dimensionless float — the cents rule does NOT apply to it.
- TypeScript only, no `.js` files in backend.
- When all of the story's acceptance-criteria checks pass and the build is
  clean, stop. Emit exactly: `===STORY_COMPLETE===`

## Few-Shot Templates
Generated code is comment-free. Design intent lives in this file and in story
prose, never in source.

### Backend service + DTO (NestJS)
```typescript
import { IsInt } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spending } from './spending.entity';

export class SpendingByAgencyDto {
  @IsInt() agencyId: number;
  @IsInt() fiscalYear: number;
}

export type SpendingResult =
  | { status: 'success'; totalCents: number }
  | { status: 'not_found' };

@Injectable()
export class SpendingService {
  constructor(
    @InjectRepository(Spending) private readonly repo: Repository<Spending>,
  ) {}

  async totalFor(dto: SpendingByAgencyDto): Promise<SpendingResult> {
    const rows = await this.repo.find({
      where: { agencyId: dto.agencyId, fiscalYear: dto.fencyYear },
    });
    if (rows.length === 0) return { status: 'not_found' };
    const totalCents = rows.reduce((s, r) => s + r.obligatedAmount, 0);
    return { status: 'success', totalCents };
  }
}
```

### Backend spec (table-driven, Jest)
```typescript
import { SpendingService } from './spending.service';
import { Spending } from './spending.entity';

describe('SpendingService.totalFor', () => {
  interface TestCase {
    name: string;
    input: { agencyId: number; fiscalYear: number };
    repoReturn: Spending[];
    expected:
      | { status: 'success'; totalCents: number }
      | { status: 'not_found' };
  }

  const testTable: TestCase[] = [
    {
      name: 'sums obligated cents across rows for one agency-year',
      input: { agencyId: 1, fiscalYear: 2024 },
      repoReturn: [
        { obligatedAmount: 1000 } as Spending,
        { obligatedAmount: 2500 } as Spending,
      ],
      expected: { status: 'success', totalCents: 3500 },
    },
    {
      name: 'returns not_found when no rows match',
      input: { agencyId: 99, fiscalYear: 2024 },
      repoReturn: [],
      expected: { status: 'not_found' },
    },
  ];

  it.each(testTable)('$name', async ({ input, repoReturn, expected }) => {
    const repo = { find: jest.fn().mockResolvedValue(repoReturn) } as any;
    const svc = new SpendingService(repo);
    expect(await svc.totalFor(input as any)).toEqual(expected);
  });
});
```

### Frontend service (Angular)
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Agency } from '@shared/interfaces';
import { ApiResponse } from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class AgencyService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<Agency[]> {
    return this.http
      .get<ApiResponse<Agency[]>>('/api/agencies')
      .pipe(
        map(r => r.data),
        catchError(() => of([] as Agency[])),
      );
  }
}
```

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
- `ApiResponse<T>` lives in `@shared/interfaces` — import it, never duplicate.

## Session Hygiene (local models degrade over long sessions)
- One story = one fresh Pi session. Kill it (Ctrl+C) and relaunch between
  stories. Do not run multiple stories in one session.
- One story = one git worktree. The harness provisions
  `../fedspend-build/<STORY_ID>/` on branch `build/<STORY_ID>` and merges on
  PASS. Do not run two stories in the same worktree.
- If a session starts hallucinating (inventing files, proposing batches,
  drifting to other stacks), stop it. Do not negotiate with it. Restart.

## Available Pi Tools (exact names — do not invent others)
`bash, edit, glob, grep, read, write, skill, task, todowrite, webfetch`
- There is no `run_shell_command`, `list_files`, `shell`, `terminal`, or
  `python` tool.
- `bash` requires BOTH keys: `{"description": "...", "command": "..."}`
- `read`/`write`/`edit` use `filePath` (relative, never absolute, never leading
  `/`). All paths are relative to the directory Pi was launched from (the
  worktree root for the current story).

## Verification is the Source of Truth
- `verify2.sh` reads acceptance criteria from `plan.json` and runs each story's
  `check` command. The plan is the single source of truth for what "done" means.
- A story is done ONLY when `./verify2.sh <STORY_ID> --guard` exits 0.
- The model's word never ends a story. Disk reality does.

## Build Harness Stack
- **Build (local tier):** Aider with `ollama_chat/<model>`. Diff-based editing
  bypasses local-model tool-call weakness. File allowlist via `scope.files`
  enforces closed-set story scope.
- **Build (cloud tier, escalation):** opencode with `zai-coding-plan/<model>`.
  Tool-call paradigm works for cloud GLM models. Triggered when T1/T2 fail.
- **Thinking tier (planning, QA-review):** opencode running GLM-5.2 (this layer).
- **Retired:** pi — proven unable to drive local qwen models; config archived to
  `~/.pi.archive`. May revisit for future qwen variants with stronger tool-call
  training (e.g., qwen3.6 series).

## Per-Model Test Status (for capability study)
| Model | Size | Harness | Outcome |
|-------|------|---------|---------|
| qwen3-16gb | 12 GB | pi | FAIL (0 real tool calls) |
| qwen3-coder:30b | 18 GB | pi | FAIL (read-only mode, no action) |
| qwen3-coder-next | 51 GB | pi | FAIL (read_file hallucination) |
| qwen3-coder-next | 51 GB | opencode | FAIL (explain-mode) |
| qwen3-coder-next | 51 GB | Aider | **PASS** (E1-S02) |
| glm-4.7 | cloud | pi | PASS (E1-S01) |
| qwen3.6 35b | TBD | pi or Aider | pending test |
| smaller qwen variants | TBD | Aider | pending test |
