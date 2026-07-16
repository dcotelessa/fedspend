#!/usr/bin/env bash
# pi-plan.sh — headless planning/research bridge for the opencode `pi_plan` tool.
# Runs the local thinking model via `pi -p` against a topic + attached files, so
# deep reasoning happens in pi's own session (not opencode's context window).
#
# Usage:
#   ./pi-plan.sh --topic "Decompose epic 3 into stories" \
#                --files docs/epic-3.md docs/data-model.md \
#                [--model qwen3.6:35b] [--thinking high]
#
# Default model is qwen3.6:35b (the local reasoning GGUF). Cloud models
# (zai-coding-plan/*, openrouter/*) skip the llama-server health check; local
# models require ~/start-llama.sh to have loaded the matching GGUF.
set -euo pipefail

TOPIC=""
MODEL="qwen3.6:35b"
THINKING="high"
FILES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --topic)    TOPIC="$2"; shift 2 ;;
    --files)
      shift
      while [[ $# -gt 0 && "$1" != --* ]]; do FILES+=("$1"); shift; done
      ;;
    --model)    MODEL="$2"; shift 2 ;;
    --thinking) THINKING="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 --topic '...' [--files a b ...] [--model X] [--thinking high]"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$TOPIC" ]] || { echo "--topic is required" >&2; exit 2; }

case "$MODEL" in
  zai-coding-plan/*|openrouter/*) : ;;
  *)
    if ! curl -s "http://127.0.0.1:8080/health" >/dev/null 2>&1; then
      arg="thinking"
      case "$MODEL" in
        *coder*|qwen3-coder*) arg="coder" ;;
        *flash*)              arg="flash" ;;
        *ornith*9b*)          arg="ornith9b" ;;
        *ornith*35b*)         arg="ornith35b" ;;
      esac
      echo "ERROR: local model '$MODEL' needs llama-server running. Start: ~/start-llama.sh $arg" >&2
      exit 1
    fi
    ;;
esac

ATTACH=()
for f in "${FILES[@]}"; do
  [[ -f "$f" ]] && ATTACH+=("@$f")
done

exec pi -p --model "$MODEL" --thinking "$THINKING" "${ATTACH[@]}" "$TOPIC"
