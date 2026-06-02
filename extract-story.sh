#!/usr/bin/env bash
#
# extract-story.sh — pull ONE story out of plan.json into an isolated file.
#
# The point: a model that can only see one story cannot drift to others,
# cannot batch, cannot invent S01b. We remove the temptation rather than
# instruct against it.
#
# Usage:
#   ./extract-story.sh S03                 # -> /tmp/fedspend-story.json
#   ./extract-story.sh S03 ./out.json      # custom output path
#
# Exit 0 on success, 1 if story not found, 2 on bad input.

set -u

STORY="${1:-}"
OUT="${2:-/tmp/fedspend-story.json}"
PLAN=".research/plan.json"

if [[ -z "$STORY" ]]; then
  echo "Usage: $0 <STORY_ID> [output_path]"
  exit 2
fi
if [[ ! -f "$PLAN" ]]; then
  echo "FATAL: $PLAN not found. Run from repo root."
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "FATAL: jq not installed. sudo apt install jq"
  exit 2
fi

# plan.json may store stories at .stories[] or at the top level as an array.
# Try .stories[] first, fall back to .[].
STORY_JSON="$(jq --arg id "$STORY" '
  (.stories // .) as $arr
  | ($arr | if type=="array" then . else [.] end)
  | map(select(.id == $id))
  | first
  | select(. != null)
' "$PLAN" 2>/dev/null)"

if [[ -z "$STORY_JSON" || "$STORY_JSON" == "null" ]]; then
  echo "Story '$STORY' not found in $PLAN."
  echo "Available IDs:"
  jq -r '(.stories // .) | (if type=="array" then . else [.] end) | .[].id' "$PLAN" 2>/dev/null | sed 's/^/  /'
  exit 1
fi

echo "$STORY_JSON" > "$OUT"
echo "Wrote $STORY to $OUT"
echo "--- isolated story ---"
jq '{id, title, build, scope, acceptanceCriteria, dependencies, notes}' "$OUT"
