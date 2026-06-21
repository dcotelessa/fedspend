#!/usr/bin/env bash
#
# build-context.sh — produces a per-story context bundle JSON.
#
# Reads .research/plan.json for the story's scope.files + scope.regions,
# inlines the relevant file contents (full or sliced), and writes
# .research/contexts/<STORY_ID>.json. The build prompt inlines this so
# the model never needs to explore the repo.
#
# Usage:
#   ./build-context.sh E1-S01
#
# Requires: jq. Run from repo root.

set -u

PLAN=".research/plan.json"
OUT_DIR=".research/contexts"

RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'; CYAN='\033[36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}▶${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
error()   { echo -e "${RED}✗${RESET} $*"; }

STORY="${1:-}"
if [[ -z "$STORY" ]]; then
  echo "Usage: $0 <STORY_ID>"; exit 2
fi

[[ -f "$PLAN" ]] || { error "$PLAN not found."; exit 2; }
command -v jq >/dev/null 2>&1 || { error "jq required."; exit 2; }

mkdir -p "$OUT_DIR"

STORY_JSON="$(jq --arg id "$STORY" '.stories[] | select(.id==$id)' "$PLAN")"
if [[ -z "$STORY_JSON" ]]; then
  error "Story $STORY not in $PLAN."
  exit 1
fi

TMP="$(mktemp)"; echo "$STORY_JSON" > "$TMP"

TITLE="$(jq -r '.title' "$TMP")"
GOAL="$(jq -r '.goal // ""' "$TMP")"
EPIC="$(echo "$STORY" | grep -oE '^E[0-9]+')"
NOTES="$(jq -r '.notes // ""' "$TMP")"
DEPS="$(jq -r '(.dependencies // []) | join(", ")' "$TMP")"
CRITERIA_JSON="$(jq -c '.acceptanceCriteria // []' "$TMP")"
RESOLUTIONS_JSON="$(jq -c '.resolutions // []' "$PLAN")"

info "Building context bundle for $STORY..."

# ── Build per-file JSON entries ───────────────────────────────────────────────
# For each file in scope.files:
#   - if file does not exist on disk  -> skip (model will CREATE)
#   - if scope.regions has entries for this file -> emit one slice object per
#     region, each with start/end/reason and the actual extracted text
#     (lines [start-PAD, end+PAD], numbered, where PAD=2)
#   - else -> emit one full object with the entire file contents
PAD=2
ENTRIES_TMP="$(mktemp)"
: > "$ENTRIES_TMP"

jq -r '(.scope.files // []) | .[]' "$TMP" | while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  [[ -e "$f" ]] || continue

  # Region count for this file
  region_count="$(jq --arg f "$f" '[.scope.regions // [] | .[] | select(.file==$f)] | length' "$TMP")"

  if [[ "$region_count" -eq 0 ]]; then
    jq -n --arg path "$f" --rawfile body "$f" \
      '{path:$path, mode:"full", contents:$body}' >> "$ENTRIES_TMP"
  else
    # Emit one slice per region
    jq -c --arg f "$f" '.scope.regions // [] | map(select(.file==$f))' "$TMP" \
      | jq -c '.[]' \
      | while IFS= read -r region; do
          local_start="$(echo "$region" | jq -r '.start')"
          local_end="$(echo "$region" | jq -r '.end')"
          local_reason="$(echo "$region" | jq -r '.reason // ""')"
          local_pad_start=$((local_start - PAD)); [[ "$local_pad_start" -lt 1 ]] && local_pad_start=1
          local_pad_end=$((local_end + PAD))
          # Extract lines with line numbers using awk
          excerpt="$(awk -v s="$local_pad_start" -v e="$local_pad_end" 'NR>=s && NR<=e { printf "%4d: %s\n", NR, $0 }' "$f")"
          jq -n \
            --arg path "$f" \
            --arg mode "slice" \
            --argjson start "$local_start" \
            --argjson end "$local_end" \
            --arg reason "$local_reason" \
            --arg excerpt "$excerpt" \
            '{path:$path, mode:$mode, start:$start, end:$end, reason:$reason, excerpt:$excerpt}'
        done >> "$ENTRIES_TMP"
  fi
done

# Combine all entries into a single JSON array (one object per line -> jq -s)
FILES_JSON="$(jq -s '.' "$ENTRIES_TMP")"

# ── Assemble the bundle ───────────────────────────────────────────────────────
jq -n \
  --arg story "$STORY" \
  --arg epic "$EPIC" \
  --arg title "$TITLE" \
  --arg goal "$GOAL" \
  --arg notes "$NOTES" \
  --arg deps "$DEPS" \
  --argjson criteria "$CRITERIA_JSON" \
  --argjson resolutions "$RESOLUTIONS_JSON" \
  --argjson files "$FILES_JSON" \
  '{
    story:$story, epic:$epic, title:$title, goal:$goal, notes:$notes,
    dependencies:$deps, acceptanceCriteria:$criteria, resolutions:$resolutions,
    files:$files
  }' \
  > "${OUT_DIR}/${STORY}.json"

BYTES="$(wc -c < "${OUT_DIR}/${STORY}.json")"
success "Wrote ${OUT_DIR}/${STORY}.json (${BYTES} bytes)"

# ── Human-readable markdown summary ───────────────────────────────────────────
FILES_BLOCK="$(
  jq -r '(.scope.files // []) | .[]' "$TMP" | while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if [[ -e "$f" ]]; then
      printf '  - EXISTS: %s\n' "$f"
    else
      printf '  - CREATE: %s\n' "$f"
    fi
  done
)"

{
  echo "# Context bundle — $STORY"
  echo
  echo "**Title:** $TITLE  |  **Epic:** $EPIC"
  echo
  echo "## Files"
  echo "$FILES_BLOCK"
  echo
  echo "## Acceptance Criteria"
  jq -r '.acceptanceCriteria[]? | "  - [ ] \(.text)"' "$TMP"
  echo
  if [[ -n "$NOTES" ]]; then
    echo "## Notes"
    echo "$NOTES"
    echo
  fi
} > "${OUT_DIR}/${STORY}.md"

success "Summary at ${OUT_DIR}/${STORY}.md"

rm -f "$TMP" "$ENTRIES_TMP"
