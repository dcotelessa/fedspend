# Capability Study — E1

## TL;DR (the big finding)

**The bottleneck was the serving backend (Ollama), not the model or harness.**

Three phases of discovery:
1. **Phase 1 (E1-S01):** qwen models failed in pi+Ollama (tool-call paralysis)
2. **Phase 2 (E1-S02/S03):** Aider bypassed Ollama's tool-call layer with diff-based editing — local models PASSED
3. **Phase 3 (E1-S04):** Replaced Ollama with llama.cpp (`--jinja`) — pi+qwen now produces perfect native OpenAI tool calls

The root cause: **Ollama's abstraction layer broke qwen's native tool-call formatting.** llama.cpp with `--jinja` uses the model's embedded Jinja chat template, which handles tool-call syntax correctly.

## E1-S01 — NestJS scaffold (complex)

- T1 qwen3-16gb: 0 real tool calls (pi+Ollama)
- T2 qwen3-coder:30b: 3 real reads, then explain-mode (pi+Ollama)
- T3 qwen3-coder-next: 1 real tool call (rejected on filePath vs path), then reverted to run_shell_command hallucination (pi+Ollama)
- T4 zai-coding-plan/glm-4.7: **PASS** (pi, after harness bugs fixed)

## E1-S02 — tsconfig edit + spec (simple)

- T1 qwen3-coder-next via Aider+Ollama: **PASS** (first local PASS)
  - Aider's SEARCH/REPLACE paradigm bypassed the tool-call weakness

## E1-S03 — TypeORM dual-DB config (medium)

LLM matrix tested 4 combinations:

| # | Model | Harness | Result | Failure mode |
|---|-------|---------|--------|--------------|
| 1 | gemma4:26b | Aider+Ollama | FAIL | configelseService typo + wrong import |
| 2 | qwen3-coder:30b | Aider+Ollama | FAIL | env pollution in spec + missing import |
| 3 | qwen3.6:35b | pi+Ollama | FAIL | empty tool_code blocks |
| 3b | qwen3.6:35b | pi+Ollama+pi-json-tools | FAIL | model couldn't self-correct to JSON |
| 4 | qwen3.6:35b | Aider+Ollama | **PASS** | all 7 criteria |

Key finding: qwen3.6:35b can code (Aider PASS) but cannot tool-call through Ollama+pi.

## E1-S04 — 6 module scaffolds (repetitive)

- T1 qwen3-coder:30b via **pi+llama.cpp**: **PASS** (9/9 criteria) — BREAKTHROUGH
  - First pi+local-model PASS with native tool calls
  - llama.cpp `--jinja` produces perfect OpenAI-compatible `tool_calls`
  - pi-safety-modes correctly intercepted `rm` operation
  - Inference: 71.8 tok/s (MoE, partial VRAM offload)

## E1 Result: 8/8 stories PASS

| Story | Tier | Model | Criteria |
|-------|------|-------|----------|
| E1-S01 (NestJS scaffold) | T4 cloud | glm-4.7 via pi | PASS |
| E1-S02 (@shared alias) | T1 local | qwen3-coder-next via Aider | PASS |
| E1-S03 (TypeORM config) | T1 local | qwen3.6:35b via Aider | PASS (7/7) |
| E1-S04 (6 module scaffolds) | T1 local | **qwen3-coder:30b via pi+llama.cpp** | PASS (9/9) |
| E1-S05 (5 TypeORM entities) | T1 local | qwen3-coder:30b via pi+llama.cpp | PASS (9/9) |
| E1-S06 (response wrapper) | T1 local | qwen3-coder:30b via pi+llama.cpp | PASS (6/6) |
| E1-S07 (CORS + health) | T1 local | qwen3-coder:30b via pi+llama.cpp | PASS (7/7) |
| E1-S08 (E2E verification) | T1 local | qwen3-coder:30b via pi+llama.cpp | PASS (5/5) |

S01-S03 were built before the llama.cpp breakthrough (using Aider+Ollama or cloud).
S04-S08 were all built with pi+llama.cpp+qwen3-coder:30b — the final stack.

## qwen3.6:35b Resolution

The Ollama GGUF for qwen3.6:35b was defective (3 rope dimension_sections instead
of 4, missing SSM tensors). Downloaded a proper Unsloth GGUF from HuggingFace:
`unsloth/Qwen3.6-35B-A3B-MTP-GGUF:UD-Q4_K_M` (22.7 GB). Loads cleanly with
vanilla llama.cpp (no patches needed). Tool calls verified at 59.0 tok/s.

## The Tool-Call Discovery (E1-S04)

### The curl test that proved it

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -d '{"messages":[...],"tools":[...],"tool_choice":"auto"}'
```

Response:
```json
{
  "finish_reason": "tool_calls",
  "message": {
    "tool_calls": [{
      "function": {
        "name": "read_file",
        "arguments": "{\"path\":\"/tmp/test.txt\"}"
      }
    }]
  }
}
```

Perfect OpenAI format. The model always could do tool calls — Ollama was mangling the format.

### Why llama.cpp works where Ollama didn't

| Aspect | Ollama | llama.cpp (--jinja) |
|--------|--------|-------------------|
| Chat template | Modelfile template (may not match model) | Model's embedded Jinja template (native) |
| Tool-call format | Ollama's own parsing layer | Native template → proper `tool_calls` array |
| Overhead | Daemon + REST API + inference engine | Direct inference server |

## Build infrastructure built during E1

1. CUDA 13.1 installed (sm_120 Blackwell) + rsqrt noexcept patch for glibc compat
2. llama.cpp compiled with `GGML_CUDA=ON` targeting sm_120 (`~/llama.cpp/`)
3. `~/start-llama.sh` — starts llama-server with qwen3-coder:30b on port 8080
4. pi-llama-cpp extension installed (auto-discovers models, thinking budgets)
5. pi-safety-modes confirmed working (file delete interception)
6. Ollama stopped + disabled (GGUF files retained in blob store)

## Recommended tier ladder (final)

| Tier | Harness | Model | When |
|------|---------|-------|------|
| T1 | pi+llama.cpp | qwen3-coder:30b | Primary — native tool calls, interactive |
| T2 | Aider+llama.cpp | qwen3-coder:30b | Fallback — diff-based for tool-call failures |
| T3 | opencode | glm-4.7 | Cloud escalation — cheapest |
| T4 | opencode | glm-5.1 | Cloud — mid-tier |
| T5 | opencode | glm-5.2 | Cloud — matches thinking tier |

## Harness comparison (final)

| Harness | Backend | Paradigm | Local model support | E1 outcome |
|---------|---------|----------|---------------------|------------|
| pi | llama.cpp | Tool-call (native Jinja) | qwen3-coder:30b | **PASS** (E1-S04) |
| Aider | llama.cpp | Diff-based (SEARCH/REPLACE) | Any model | **PASS** (E1-S02, E1-S03) |
| opencode | cloud | Tool-call (JSON) | GLM models | **PASS** (E1-S01) |
| pi | ~~Ollama~~ | ~~Tool-call~~ | ~~qwen~~ | **RETIRED** — broke tool calls |
