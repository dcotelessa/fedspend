#!/usr/bin/env bash
#
# verify2.sh — plan-driven acceptance checker.
#
# Reads acceptance criteria DIRECTLY from .research/plan.json and runs each
# story's `check` command. The plan is the single source of truth — no
# hardcoded checks to drift out of sync with what Planout specified.
#
# Also guards against cross-story contamination: flags any file under
# backend/src/ that is not in the union of completed stories' file sets.
#
# Usage:
#   ./verify2.sh E1-S01            # check one story's criteria
#   ./verify2.sh E1-S01 --guard    # also run the unexpected-files guard
#   ./verify2.sh --files-only E1-S04   # only run the guard for a story
#
# Exit 0 = all checked criteria passed (and guard clean if requested).
# Exit 1 = at least one failure.
# Exit 2 = bad input / missing deps.
#
# Requires: jq. Run from repo root.

set -u

PLAN=".research/plan.json"
RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'; CYAN='\033[36m'; BOLD='\033[1m'; RESET='\033[0m'

pass_n=0
fail_n=0
declare -a FAILED

die()  { echo -e "${RED}FATAL:${RESET} $*"; exit 2; }
ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; pass_n=$((pass_n+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail_n=$((fail_n+1)); FAILED+=("$1"); }

[[ -f "$PLAN" ]] || die "$PLAN not found. Run from repo root."
command -v jq >/dev/null 2>&1 || die "jq not installed. sudo apt install jq"

# ── arg parsing ──────────────────────────────────────────────────────────────
GUARD=false
FILES_ONLY=false
STORY=""
for arg in "$@"; do
  case "$arg" in
    --guard)      GUARD=true ;;
    --files-only) FILES_ONLY=true; GUARD=true ;;
    E[0-9]*-S[0-9]*|S[0-9]*)  STORY="$arg" ;;
    *)            die "Unknown arg: $arg" ;;
  esac
done
[[ -n "$STORY" ]] || die "No story id given. Usage: ./verify2.sh E1-S01 [--guard]"

# story must exist
exists="$(jq --arg id "$STORY" '[.stories[] | select(.id==$id)] | length' "$PLAN")"
[[ "$exists" -gt 0 ]] || die "Story $STORY not found in plan."

# ── run acceptance-criteria checks from the plan ─────────────────────────────
run_criteria() {
  echo -e "${BOLD}$STORY — acceptance criteria (from plan.json)${RESET}"

  local count
  count="$(jq -r --arg id "$STORY" '
    [.stories[] | select(.id==$id) | .acceptanceCriteria[]?] | length
  ' "$PLAN")"

  if [[ "$count" -eq 0 ]]; then
    echo -e "  ${YELLOW}(no acceptance criteria defined for $STORY)${RESET}"
    return
  fi

  # iterate criteria by index so we can pull text + check per item
  local i
  for (( i=0; i<count; i++ )); do
    local text check
    text="$(jq -r --arg id "$STORY" --argjson n "$i" '
      [.stories[] | select(.id==$id) | .acceptanceCriteria[]][$n].text // "criterion"
    ' "$PLAN")"
    check="$(jq -r --arg id "$STORY" --argjson n "$i" '
      [.stories[] | select(.id==$id) | .acceptanceCriteria[]][$n].check // empty
    ' "$PLAN")"

    if [[ -z "$check" ]]; then
      # No check command — cannot verify mechanically. This is a plan defect.
      printf '  \033[33mSKIP\033[0m  %s  (no check command in plan)\n' "$text"
      continue
    fi

    if bash -c "$check" >/dev/null 2>&1; then
      ok "$text"
    else
      bad "$text"
    fi
  done
}

# ── unexpected-files guard ───────────────────────────────────────────────────
# Flags files under backend/src/ that no COMPLETED story was scoped to create.
# "Completed" = stories up to and including the current one in storyOrder.
# Union-aware: a file shared by multiple stories (e.g. app.module.ts) is allowed
# as long as ANY in-scope story lists it.
run_guard() {
  echo -e "${BOLD}$STORY — unexpected-files guard${RESET}"

  if [[ ! -d backend/src ]]; then
    echo -e "  ${YELLOW}(backend/src does not exist yet — nothing to guard)${RESET}"
    return
  fi

  # Determine which stories count as "in scope so far": every story from the
  # start of storyOrder through the current story.
  local order
  order="$(jq -r '.storyOrder[]?' "$PLAN")"
  if [[ -z "$order" ]]; then
    echo -e "  ${YELLOW}(no storyOrder in plan — guard skipped)${RESET}"
    return
  fi

  local in_scope=()
  local reached=false
  while IFS= read -r sid; do
    in_scope+=("$sid")
    [[ "$sid" == "$STORY" ]] && { reached=true; break; }
  done <<< "$order"
  if ! $reached; then
    echo -e "  ${YELLOW}($STORY not in storyOrder — guard skipped)${RESET}"
    return
  fi

  # Build the allowed-file set: union of scope.files for all in-scope stories.
  # Normalize away .gitkeep dir-markers to their directory.
  local allowed_tmp; allowed_tmp="$(mktemp)"
  for sid in "${in_scope[@]}"; do
    jq -r --arg id "$sid" '
      .stories[] | select(.id==$id) | .scope.files[]?
    ' "$PLAN"
  done | sort -u > "$allowed_tmp"

  # Walk actual files under backend/src and flag any not in the allowed set.
  local unexpected=0
  while IFS= read -r f; do
    # strip leading ./
    local rel="${f#./}"
    if ! grep -qxF "$rel" "$allowed_tmp"; then
      bad "unexpected file (not in any in-scope story): $rel"
      unexpected=$((unexpected+1))
    fi
  done < <(find backend/src -type f | sed 's|^\./||')

  if [[ "$unexpected" -eq 0 ]]; then
    ok "no unexpected files under backend/src"
  fi
  rm -f "$allowed_tmp"
}

# ── main ─────────────────────────────────────────────────────────────────────
echo "Plan-driven verify — $STORY — $(date '+%H:%M:%S')"
echo "----------------------------------------"

if ! $FILES_ONLY; then
  run_criteria
  echo
fi
if $GUARD; then
  run_guard
  echo
fi

echo "----------------------------------------"
echo "PASS: $pass_n   FAIL: $fail_n"
if (( fail_n > 0 )); then
  echo "Failed:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi
echo "All checked criteria passed."
exit 0
