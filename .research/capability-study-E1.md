# Capability Study — E1

## TL;DR (the big finding)

**Local LLMs CAN do agent work — when paired with a diff-based harness.**

qwen3-coder-next failed identically across two tool-call-based harnesses (pi,
opencode): it read context files correctly but then went into "explain mode"
instead of invoking tools. With Aider (which uses SEARCH/REPLACE text blocks
instead of tool calls), the same model completed E1-S02 first try.

The bottleneck was the **harness paradigm**, not the model.

## E1-S01 — NestJS scaffold (complex)

- T1 qwen3-16gb: 0 real tool calls (pi)
- T2 qwen3-coder:30b: 3 real reads, then explain-mode (pi)
- T3 qwen3-coder-next: 1 real tool call (rejected on filePath vs path), then
  reverted to run_shell_command hallucination (pi)
- T4 zai-coding-plan/glm-4.7: PASS (pi, after harness bugs fixed)

Scaffolding is uniquely hard: greenfield, CLI orchestration, multi-file
generation. Even cloud-tier glm-4.7 needed 2 harness bugs fixed before
succeeding.

## E1-S02 — tsconfig edit + spec (simple)

- T1 qwen3-coder-next via Aider: **PASS** (first local PASS)
  - Same model that failed in pi AND opencode
  - Aider's SEARCH/REPLACE paradigm bypassed the tool-call weakness
  - Out-of-scope change caught: aider auto-added .aider* to .gitignore, reverted
- T2/T3 not attempted — T1 succeeded

## Recommended tier ladder (revised)

For each story type, pick the cheapest tier that can plausibly work:

| Story type | Recommended starting tier | Rationale |
|------------|---------------------------|-----------|
| Simple edits, single file | **T1 qwen3-coder-next via Aider** | Proven on E1-S02 |
| Multi-file edits, entities, services | **T1 qwen3-coder-next via Aider** | Try local first; escalate on fail |
| Greenfield scaffolding (CLI orchestration) | **T4 glm-4.7 via opencode/pi** | Local cannot do tool orchestration |
| Sync pipeline (Fetch/Transform/Return) | **T1 qwen3-coder-next via Aider** | Try local; Aider handles code-heavy work well |

## Harness comparison

| Harness | Paradigm | Local model support | E1 outcome |
|---------|----------|---------------------|------------|
| pi | Tool-call (JSON) | Ollama | FAILED with all qwen tiers |
| opencode | Tool-call (JSON) | Ollama | FAILED with qwen3-coder-next (explain-mode) |
| Aider | Diff-based (SEARCH/REPLACE) | Ollama | **PASSED with qwen3-coder-next** |

## Tooling fixes landed during E1-S01/E1-S02

1. pnpm-workspace.yaml: `allowBuilds` placeholder → proper `onlyBuildDependencies` + `allowBuilds` map
2. AGENTS.md: `filePath` (opencode) vs `path` (pi) confusion resolved — opencode is the runtime
3. plan.json criteria: `pnpm test -- --testPathPattern=X` (made jest treat all args as positional) → `--testPathPatterns=X`
4. pi models.json: baseUrl `/api/paas/v4` (credit) → `/api/coding/paas/v4` (coding plan)
5. Harness switch: pi → opencode → Aider (for local); opencode remains thinking tier
