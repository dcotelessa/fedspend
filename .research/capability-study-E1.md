# Capability Study — E1

Auto-generated after each PASS. Source: `build-log.json`.

## Story: E1-S01
- **Tier reached: T4 (`zai-coding-plan/glm-4.7`)** — first cloud tier
- Local ladder (T1-T3) all failed at basic tool use:
  - T1 qwen3-16gb: 0 real tool calls, hallucinated country/emergency-app project
  - T2 qwen3-coder:30b: 0 real tool calls, hallucinated read_file/run_shell_command
  - T3 qwen3-coder-next: 1 real tool call (rejected on filePath vs path), reverted to run_shell_command hallucination
- T4 glm-4.7: clean execution on first attempt after 2 harness bugs fixed

## Failure pattern (local tiers)
All 3 local models failed at the same thing: **tool-call discipline**. They
fell back to Claude/ChatGPT-style tool names (read_file, run_shell_command)
instead of pi's actual tools (read, bash). They also hallucinated paths
(/home/user/, /testbed) instead of using the worktree path. None completed
even a single file write correctly.

## Harness bugs surfaced (now fixed)
1. `pnpm-workspace.yaml` had placeholder `unrs-resolver: set this to true or false` blocking postinstall → switched to `onlyBuildDependencies` array
2. Plan criteria used `pnpm test -- --testPathPattern=X` which made jest treat ALL post-`--` args as positional test paths → switched to `--testPathPatterns` (plural, no `--`)
3. `AGENTS.md` referenced `filePath` (opencode convention); pi uses `path` → fixed
4. pi `models.json` had `baseUrl: /api/paas/v4` (pay-as-you-go); coding plan requires `/api/coding/paas/v4` → fixed

## Implication for E1-S02..E1-S08
Recommendation: **skip T1-T3 for backend stories** and start at T4. The cloud
tier is cheap (coding-plan subscription) and reliable. Save local attempts
for simpler stories (frontend components, pipes) where tool-call discipline
matters less. Re-evaluate local tiers at E4 (Angular foundation).

## Tier distribution (E1 so far)
```
  T4: 1
```
