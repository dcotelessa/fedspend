#!/usr/bin/env bash
#
# run-story.sh — orchestrates one story through the full pipeline:
#   extract → context-bundle → worktree → tier-ladder build → verify → merge
#
# Usage:
#   ./run-story.sh E1-S01
#
# Tier ladder (local-first, escalate on fail):
#   T1  ollama/qwen3-16gb             (1 attempt)  — floor, generalist
#   T2  ollama/qwen3-coder:30b        (1 attempt)  — mid coder
#   T3  ollama/qwen3-coder-next       (2 attempts) — largest local coder
#   T4  zai-coding-plan/glm-4.7       (1 attempt)  — cheapest cloud thinking
#   T5  zai-coding-plan/glm-5.1       (1 attempt)
#   T6  zai-coding-plan/glm-5.2       (1 attempt)  — matches opencode
#   T6 fail → stop, opencode reviews, resume after human OK
#
# Dependencies: jq, bash 4+. Run from repo root.

set -u

# ── PATHS ─────────────────────────────────────────────────────────────────────
PLAN=".research/plan.json"
BUILD_LOG=".research/build-log.json"
WORKTREE_BASE="../fedspend-build"
STORY_TMP="/tmp/fedspend-story.json"
BUNDLE_TMP="/tmp/fedspend-bundle.json"
PROMPT_TMP="/tmp/fedspend-prompt.txt"
VERIFY_OUT="/tmp/fedspend-verify.txt"

# ── TIER LADDER ───────────────────────────────────────────────────────────────
# Format: "T<n>|<provider>/<model_id>|<max_attempts>"
TIER_LADDER=(
  "T1|ollama/qwen3-16gb|1"
  "T2|ollama/qwen3-coder:30b|1"
  "T3|ollama/qwen3-coder-next|2"
  "T4|zai-coding-plan/glm-4.7|1"
  "T5|zai-coding-plan/glm-5.1|1"
  "T6|zai-coding-plan/glm-5.2|1"
)

# ── ARGS ──────────────────────────────────────────────────────────────────────
STORY="${1:-}"
if [[ -z "$STORY" ]]; then
  echo "Usage: $0 <STORY_ID>   (e.g. ./run-story.sh E1-S01)"
  exit 2
fi

# ── COLOURS ───────────────────────────────────────────────────────────────────
RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'
CYAN='\033[36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}▶${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
error()   { echo -e "${RED}✗${RESET} $*"; }
rule()    { echo -e "${BOLD}──────────────────────────────────────────────────${RESET}"; }

# ── GUARDS ────────────────────────────────────────────────────────────────────
[[ -f "$PLAN" ]] || { error "No $PLAN. Run Planout first."; exit 2; }
command -v jq >/dev/null 2>&1 || { error "jq required."; exit 2; }

if [[ ! -f "$BUILD_LOG" ]]; then
  echo '{"runs":[]}' > "$BUILD_LOG"
  info "Initialised $BUILD_LOG."
fi

# ── DEPENDENCY CHECK ──────────────────────────────────────────────────────────
check_dependencies() {
  info "Checking story dependencies..."
  local deps
  deps="$(jq -r --arg id "$STORY" '
    [.stories[] | select(.id==$id) | .dependencies[]?] | .[]
  ' "$PLAN" 2>/dev/null)"

  if [[ -z "$deps" ]]; then
    success "No dependencies required."
    return 0
  fi

  local all_ok=true
  while IFS= read -r dep; do
    [[ -z "$dep" ]] && continue
    local status
    status="$(jq -r --arg id "$dep" '
      [.runs[] | select(.story==$id and .result=="PASS")] | length
    ' "$BUILD_LOG" 2>/dev/null)"
    if [[ "${status:-0}" -gt 0 ]]; then
      success "Dependency $dep: PASS"
    else
      error "Dependency $dep has not passed yet."
      all_ok=false
    fi
  done <<< "$deps"

  if ! $all_ok; then
    error "Resolve failing dependencies before running $STORY."
    exit 1
  fi
}

# ── EXTRACT STORY ─────────────────────────────────────────────────────────────
extract_story() {
  info "Extracting $STORY from plan.json..."
  local story_json
  story_json="$(jq --arg id "$STORY" '.stories[] | select(.id==$id)' "$PLAN" 2>/dev/null)"

  if [[ -z "$story_json" || "$story_json" == "null" ]]; then
    error "Story $STORY not found in $PLAN."
    echo "Available stories:"
    jq -r '.stories[].id' "$PLAN" 2>/dev/null | sed 's/^/  /'
    exit 1
  fi

  echo "$story_json" > "$STORY_TMP"
  success "Story extracted."
}

# ── WORKTREE PROVISIONING ────────────────────────────────────────────────────
provision_worktree() {
  local wt="${WORKTREE_BASE}/${STORY}"
  local branch="build/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')"

  mkdir -p "$WORKTREE_BASE"

  if git worktree list | grep -q "$wt"; then
    info "Worktree already exists at $wt — reusing."
  else
    info "Provisioning worktree at $wt on branch $branch..."
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      git worktree add --detach "$wt" "$branch" >/dev/null 2>&1 || {
        error "Failed to attach worktree to existing branch $branch."
        exit 1
      }
    else
      git worktree add -b "$branch" "$wt" HEAD >/dev/null 2>&1 || {
        error "git worktree add failed."
        exit 1
      }
    fi
    success "Worktree ready."
  fi
  echo "$wt"
}

merge_and_cleanup_worktree() {
  local wt="$1"
  local branch="$2"
  info "Merging $branch → $(git rev-parse --abbrev-ref HEAD)..."
  if git merge --ff-only "$branch" >/dev/null 2>&1; then
    success "Merged."
  else
    warn "ff-only merge failed — trying regular merge."
    git merge --no-edit "$branch" || {
      error "Merge conflict. Worktree preserved at $wt for inspection."
      return 1
    }
  fi
  git worktree remove "$wt" --force >/dev/null 2>&1
  git branch -d "$branch" >/dev/null 2>&1
  success "Worktree + branch cleaned up."
}

# ── CONTEXT BUNDLE ────────────────────────────────────────────────────────────
build_context_bundle() {
  info "Building context bundle..."
  if [[ ! -x ./build-context.sh ]]; then
    warn "build-context.sh missing — proceeding without bundle."
    return 0
  fi
  if ./build-context.sh "$STORY" >/dev/null 2>&1; then
    success "Bundle at .research/contexts/${STORY}.json"
  else
    warn "build-context.sh failed — proceeding without bundle."
  fi
}

# ── PROMPT GENERATION ────────────────────────────────────────────────────────
generate_prompt() {
  local model="$1"
  local tier_num="$2"
  local attempt_of_tier="$3"
  local prior_failures="$4"
  local wt="$5"

  local title goal notes deps
  title="$(jq -r '.title // "unknown"' "$STORY_TMP")"
  goal="$(jq -r '.goal // "see scope"' "$STORY_TMP")"
  notes="$(jq -r '.notes // ""' "$STORY_TMP")"
  deps="$(jq -r '(.dependencies // []) | join(", ")' "$STORY_TMP")"

  local files=""
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if [[ -e "${wt}/${f}" ]]; then
      files+="  - EXISTS (read first, edit only what this story needs): $f"$'\n'
    else
      files+="  - CREATE (new file): $f"$'\n'
    fi
  done < <(jq -r '(.scope.files // []) | .[]' "$STORY_TMP" 2>/dev/null)

  local criteria
  criteria="$(jq -r '(.acceptanceCriteria // []) | .[] | .text' "$STORY_TMP" 2>/dev/null | sed 's/^/  - [ ] /')"

  local bundle_path=".research/contexts/${STORY}.json"
  local bundle_block=""
  if [[ -f "$bundle_path" ]]; then
    bundle_block="
## Per-story Context Bundle
A precomputed context bundle is at: $bundle_path
It contains exact file contents (or sliced regions for shared files),
acceptance criteria, and resolutions. Read it ONCE with the read tool, then
work from it. Do NOT explore beyond what it contains.
"
  fi

  local failure_block=""
  if [[ -n "$prior_failures" ]]; then
    failure_block="
## Prior Attempt Failed — Fix These
The previous tier failed QA. These specific criteria were not met:
$prior_failures

Address each failed criterion explicitly. Do not re-implement what already
passes — check what exists first, then fix only what failed.
"
  fi

  local model_short; model_short="$(echo "$model" | cut -d/ -f2-)"

  cat > "$PROMPT_TMP" << PROMPT
## Task: $STORY — $title [Tier $tier_num: $model_short, attempt $attempt_of_tier]

## Goal
$goal

## Files to create or modify (CLOSED SET — no others)
$files
$bundle_block
## Acceptance Criteria (ALL must pass before you report done)
$criteria

## Notes / Known Risks
$notes

## Dependencies (already done — do not re-implement)
$deps
$failure_block
## Rules
- You are running inside a git worktree at: $wt
  All file paths are relative to that directory.
- The files above are labeled EXISTS or CREATE. Read the EXISTS ones first,
  then edit surgically — never rewrite a whole file to change one part.
- Write the *.spec.ts file FIRST. Run it. See RED. Then implement. Then GREEN.
  verify2.sh rejects stories where the spec was written after the impl.
- Do NOT run find, glob, or ls across node_modules or the whole tree.
- Do NOT implement anything beyond the files list above. Do NOT create files
  not in the list. Do NOT write summaries, backlogs, or notes anywhere.
- Money values are integers (cents), never floats. recoveryRatio is a float.
- TypeScript only, no .js files in backend.
- No comments in generated code, ever.
- Do not ask clarifying questions — the spec is complete.
- STOP the moment the work is done. Emit exactly ===STORY_COMPLETE=== and
  then stop. Do NOT continue, "improve", or rewrite files you already wrote.
PROMPT

  success "Prompt written to $PROMPT_TMP"
}

# ── SESSION INSTRUCTIONS ─────────────────────────────────────────────────────
print_session_instructions() {
  local model="$1"
  local tier_num="$2"
  local attempt_of_tier="$3"
  local wt="$4"
  local branch="build/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')"

  rule
  echo -e "${BOLD}SESSION — Tier $tier_num: $model (attempt $attempt_of_tier)${RESET}"
  rule
  echo
  echo "  Story:    $STORY"
  echo "  Worktree: $wt"
  echo "  Branch:   $branch"
  echo
  echo -e "${BOLD}1. Launch pi inside the worktree:${RESET}"
  echo
  echo "   cd $wt"
  echo "   pi"
  echo
  echo -e "${BOLD}2. Switch to this tier's model:${RESET}"
  echo
  echo "   /model $model"
  echo
  echo -e "${BOLD}3. Paste this prompt (also saved to $PROMPT_TMP):${RESET}"
  echo
  cat "$PROMPT_TMP"
  echo
  rule
  echo -e "${BOLD}4. The MOMENT pi emits ===STORY_COMPLETE===, come back here and press Enter.${RESET}"
  echo -e "${BOLD}   Do NOT let it keep going past that signal.${RESET}"
  rule
}

# ── VERIFY ────────────────────────────────────────────────────────────────────
run_verify() {
  local wt="$1"
  info "Running verify2.sh --guard inside worktree..."
  (cd "$wt" && bash ./verify2.sh "$STORY" --guard) 2>&1 | tee "$VERIFY_OUT"
  return "${PIPESTATUS[0]}"
}

extract_failures() {
  grep '^  FAIL' "$VERIFY_OUT" 2>/dev/null | sed 's/.*FAIL  /  - /'
}

# ── RECORD RESULT (extended schema) ───────────────────────────────────────────
record_result() {
  local result="$1"
  local tier_num="$2"
  local model="$3"
  local attempt_of_tier="$4"
  local tier_max="$5"
  local elapsed_sec="$6"

  local epic; epic="$(echo "$STORY" | grep -oE '^E[0-9]+')"
  local ts; ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  local tmp; tmp="$(mktemp)"
  jq --arg story "$STORY" \
     --arg epic "$epic" \
     --arg tier "T$tier_num" \
     --arg model "$model" \
     --arg result "$result" \
     --argjson attemptOfTier "$attempt_of_tier" \
     --argjson tierMax "$tier_max" \
     --argjson elapsedSec "$elapsed_sec" \
     --arg ts "$ts" \
     '.runs += [{
       story:$story, epic:$epic, tier:$tier, model:$model, result:$result,
       attemptOfTier:$attemptOfTier, tierMaxAttempts:$tierMax,
       elapsedSec:$elapsedSec, timestamp:$ts
     }]' \
     "$BUILD_LOG" > "$tmp" && mv "$tmp" "$BUILD_LOG"

  if [[ "$result" == "PASS" ]]; then
    success "Recorded: $STORY PASS at $model (T$tier_num, attempt $attempt_of_tier, ${elapsed_sec}s)"
  else
    warn "Recorded: $STORY FAIL at $model (T$tier_num, attempt $attempt_of_tier)"
  fi
}

# ── COMMIT ON PASS (in worktree, then merge) ─────────────────────────────────
commit_and_merge() {
  local model="$1"
  local tier_num="$2"
  local wt="$3"
  local branch="$4"

  info "Committing in worktree..."
  local model_short; model_short="$(echo "$model" | cut -d/ -f2-)"
  local msg="$STORY PASS [T$tier_num $model_short]"
  if (cd "$wt" && git add -A && git commit -m "$msg" --no-verify) >/dev/null 2>&1; then
    success "Worktree commit: $msg"
  else
    warn "Nothing to commit in worktree (or commit failed)."
  fi

  merge_and_cleanup_worktree "$wt" "$branch"
}

# ── CAPABILITY REPORT APPEND ──────────────────────────────────────────────────
update_capability_report() {
  local epic; epic="$(echo "$STORY" | grep -oE '^E[0-9]+')"
  local report=".research/capability-study-${epic}.md"
  info "Updating capability report ($report)..."

  local tier_distribution
  tier_distribution="$(jq -r --arg epic "$epic" '
    [.runs[] | select(.epic==$epic and .result=="PASS")] 
    | group_by(.tier) 
    | map({tier: .[0].tier, count: length}) 
    | map("  \( .tier): \( .count)")
    | join("\n")
  ' "$BUILD_LOG" 2>/dev/null)"

  local total_pass
  total_pass="$(jq -r --arg epic "$epic" '
    [.runs[] | select(.epic==$epic and .result=="PASS")] | length
  ' "$BUILD_LOG" 2>/dev/null)"

  local last_tier
  last_tier="$(jq -r --arg epic "$epic" --arg story "$STORY" '
    [.runs[] | select(.epic==$epic and .story==$story and .result=="PASS")] 
    | .[0].tier // "n/a"
  ' "$BUILD_LOG" 2>/dev/null)"

  {
    echo "# Capability Study — $epic"
    echo
    echo "Auto-updated after each story PASS. Source: \`build-log.json\`."
    echo
    echo "## Last result"
    echo "- Story: \`$STORY\`"
    echo "- Tier reached: **$last_tier**"
    echo
    echo "## Epic-wide tier distribution (PASS only)"
    echo
    echo '```'
    echo "${tier_distribution:-  (no data)}"
    echo '```'
    echo
    echo "Total PASS in epic: **${total_pass:-0}**"
  } > "$report"
  success "Capability report updated."
}

# ── MAIN ──────────────────────────────────────────────────────────────────────
main() {
  rule
  echo -e "${BOLD}run-story.sh — $STORY${RESET}"
  rule

  check_dependencies
  extract_story

  local wt; wt="$(provision_worktree)"
  local branch="build/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')"

  build_context_bundle

  local prior_failures=""
  local global_attempt=0

  for tier_entry in "${TIER_LADDER[@]}"; do
    local tier_name model tier_max
    IFS='|' read -r tier_name model tier_max <<< "$tier_entry"
    local tier_num="${tier_name#T}"

    local aot
    for ((aot=1; aot<=tier_max; aot++)); do
      global_attempt=$((global_attempt+1))
      local start_sec; start_sec="$(date +%s)"

      generate_prompt "$model" "$tier_num" "$aot" "$prior_failures" "$wt"
      print_session_instructions "$model" "$tier_num" "$aot" "$wt" "$branch"

      read -rp "  Press Enter the MOMENT pi emits ===STORY_COMPLETE===... " _

      # Checkpoint stash in worktree (preserves a restore point)
      (cd "$wt" && git stash push -u -m "checkpoint-${STORY}-T${tier_num}-${aot}" >/dev/null 2>&1 && git stash apply >/dev/null 2>&1) || true
      info "Checkpoint stashed in worktree."

      echo
      rule
      if run_verify "$wt"; then
        local end_sec; end_sec="$(date +%s)"
        local elapsed=$((end_sec - start_sec))
        echo
        success "$STORY PASSED at T$tier_num ($model)."
        record_result "PASS" "$tier_num" "$model" "$aot" "$tier_max" "$elapsed"
        commit_and_merge "$model" "$tier_num" "$wt" "$branch"
        update_capability_report
        rule
        echo
        info "Next: ./run-story.sh <NEXT_STORY_ID>"
        echo
        exit 0
      else
        local end_sec; end_sec="$(date +%s)"
        local elapsed=$((end_sec - start_sec))
        record_result "FAIL" "$tier_num" "$model" "$aot" "$tier_max" "$elapsed"
        prior_failures="$(extract_failures)"
        echo
        error "$STORY FAILED at T$tier_num ($model), attempt $aot."
        echo
        echo "Failed criteria:"
        echo "$prior_failures"
        echo
      fi
    done
  done

  # All tiers exhausted
  cat << EOF

$(rule)
$(error "$STORY EXHAUSTED all 6 tiers. T6 (glm-5.2) failed.")

Worktree preserved at: $wt
Branch: $branch

Options:
  1) Manual fix in worktree, then re-run verify inside it
  2) opencode (GLM-5.2) reviews the failing criterion and proposes a plan or
     code fix — paste me the failing criteria and the worktree path
  3) Abort — remove worktree + branch
EOF
  read -rp "  Choice [1/2/3]: " choice
  case "$choice" in
    1) exit 1 ;;
    2) exit 10 ;;
    *) git worktree remove "$wt" --force 2>/dev/null
       git branch -D "$branch" 2>/dev/null
       error "Aborted. Worktree + branch removed."
       exit 1 ;;
  esac
}

main
