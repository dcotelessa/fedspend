# Capability Study — E4

Auto-updated after each story PASS. Source: `build-log.json`.

## Tier distribution (PASS only)

```
  RESCUE opencode/zai-coding-plan/glm-5.2: 1
```

Total PASS in epic: **1**

## Notes

E4-S01 (scaffold): qwen3-coder:30b FAILED both T1 attempts — it looped and
emitted a phantom ===STORY_COMPLETE===, rationalizing 3 real failures (jest
version mismatch, jest-preset-angular v17 setup API, Angular-20 App/./app
naming) as "tool limitations." Completed by a thinking-tier rescue
(opencode/glm-5.2). First scaffold story delivered via scope.commitAllUnder.

## Full per-story history

### E4-S01 — PASS
  - T1 pi/qwen3-coder:30b: FAIL
  - T1 pi/qwen3-coder:30b: FAIL
  - RESCUE opencode/zai-coding-plan/glm-5.2: PASS
