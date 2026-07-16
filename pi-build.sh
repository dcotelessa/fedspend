#!/usr/bin/env bash
# pi-build.sh — headless bridge invoked by the opencode `pi_build` custom tool.
# Wraps run-story.sh so all heavy build token consumption stays inside pi's own
# session against the local LLM; only the PASS/FAIL summary crosses back.
#
# Usage:
#   ./pi-build.sh <STORY_ID>                  # story's normal tier ladder, headless
#   ./pi-build.sh <STORY_ID> qwen3.6:35b      # force one model (benchmark)
#   ./pi-build.sh <STORY_ID> qwen3.6:35b high # force model + thinking level
#
# Optional [model]/[thinking] collapse run-story.sh to a single forced tier so a
# specific local model can be benchmarked for the build task. Results land in
# .research/build-log.json (model, thinking, result, tok/s) — the capability
# matrix that feeds .research/capability-study-E<N>.md.
set -euo pipefail

STORY="${1:-}"
MODEL="${2:-}"
THINKING="${3:-}"

if [[ -z "$STORY" ]]; then
  echo "Usage: $0 <STORY_ID> [model] [thinking]" >&2
  exit 2
fi

ARGS=(--headless)
[[ -n "$MODEL" ]]    && ARGS+=("--model" "$MODEL")
[[ -n "$THINKING" ]] && ARGS+=("--thinking" "$THINKING")
ARGS+=("$STORY")

exec ./run-story.sh "${ARGS[@]}"
