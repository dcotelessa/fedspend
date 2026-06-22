#!/usr/bin/env bash
#
# run-story.sh — orchestrates one story through the full pipeline:
#   extract → context-bundle → worktree → tier-ladder build → verify → merge
#
# Usage:
#   ./run-story.sh E1-S05
#
# Tier ladder (pi+llama.cpp primary, Aider fallback, opencode cloud):
#   T1  llama.cpp/qwen3-coder:30b via pi     (2 attempts) — primary, native tools
#   T2  llama.cpp/qwen3-coder:30b via Aider  (1 attempt)  — diff-based fallback
#   T3  zai-coding-plan/glm-4.7 via opencode (1 attempt)  — cloud coding-plan
#   T4  zai-coding-plan/glm-5.1 via opencode (1 attempt)
#   T5  zai-coding-plan/glm-5.2 via opencode (1 attempt) — matches thinking tier
#   T5 fail → stop, opencode thinking tier reviews, resume after human OK
#
# Dependencies: jq, bash 4+, pi (~/.pi), aider (~/.local/bin/aider), opencode.
# llama-server must be running: ~/start-llama.sh
# Run from repo root.

set -u

# ── PATHS ─────────────────────────────────────────────────────────────────────
PLAN=".research/plan.json"
BUILD_LOG=".research/build-log.json"
WORKTREE_BASE="../fedspend-build"
STORY_TMP="/tmp/fedspend-story.json"
PROMPT_TMP="/tmp/fedspend-prompt.txt"
VERIFY_OUT="/tmp/fedspend-verify.txt"
export PATH="$HOME/.local/bin:$PATH"

# ── TIER LADDER ───────────────────────────────────────────────────────────────
# Format: "T<n>|<harness>|<model_id>|<max_attempts>"
#   harness = pi | aider | opencode
#   model_id is passed to the harness's --model flag
TIER_LADDER=(
  "T1|pi|qwen3-coder:30b|2"
  "T2|aider|qwen3-coder:30b|1"
  "T3|opencode|zai-coding-plan/glm-4.7|1"
  "T4|opencode|zai-coding-plan/glm-5.1|1"
  "T5|opencode|zai-coding-plan/glm-5.2|1"
)

# ── ARGS ──────────────────────────────────────────────────────────────────────
STORY="${1:-}"
if [[ -z "$STORY" ]]; then
  echo "Usage: $0 <STORY_ID>   (e.g. ./run-story.sh E1-S03)"
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

# ── LLAMA-SERVER HEALTH CHECK ──────────────────────────────────────────────────
check_llama_server() {
  if ! curl -s "http://127.0.0.1:8080/health" >/dev/null 2>&1; then
    warn "llama-server not running on port 8080."
    echo "  Start it with: ~/start-llama.sh"
    echo "  Continuing — cloud tiers (T3+) don't need it."
    echo
  else
    success "llama-server healthy on port 8080."
  fi
}

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
    # Trust mise for the new worktree path
    (cd "$wt" && mise trust >/dev/null 2>&1 || true)
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
    # Copy bundle into worktree
    local wt="$1"
    mkdir -p "${wt}/.research/contexts"
    cp ".research/contexts/${STORY}.json" "${wt}/.research/contexts/" 2>/dev/null || true
    cp ".research/contexts/${STORY}.md" "${wt}/.research/contexts/" 2>/dev/null || true
  else
    warn "build-context.sh failed — proceeding without bundle."
  fi
}

# ── SCOPE.FILES LIST (for Aider file allowlist) ───────────────────────────────
get_scope_files() {
  # Returns space-separated list of files from plan.json scope.files
  jq -r '(.scope.files // []) | .[]' "$STORY_TMP" 2>/dev/null
}

# ── PROMPT GENERATION (pi-style — for llama.cpp native tool calls) ───────────
generate_prompt_pi() {
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
      files+="  - EXISTS (edit surgically): $f"$'\n'
    else
      files+="  - CREATE (new file): $f"$'\n'
    fi
  done < <(jq -r '(.scope.files // []) | .[]' "$STORY_TMP" 2>/dev/null)

  local criteria
  criteria="$(jq -r '(.acceptanceCriteria // []) | .[] | .text' "$STORY_TMP" 2>/dev/null | sed 's/^/  - [ ] /')"

  local failure_block=""
  if [[ -n "$prior_failures" ]]; then
    failure_block="
## Prior Attempt Failed — Fix These
$prior_failures
"
  fi

  cat > "$PROMPT_TMP" << PROMPT
## Task: $STORY — $title [Tier $tier_num: $model via pi+llama.cpp, attempt $attempt_of_tier]

## Goal
$goal

## Files (CLOSED SET)
$files

## Acceptance Criteria (ALL must pass)
$criteria

## Context Bundle
Read .research/contexts/${STORY}.json for exact file contents + resolutions.
Call: read({ path: ".research/contexts/${STORY}.json" })

## Notes
$notes
$failure_block
## Rules
- Write the *.spec.ts file FIRST (RED), then implement (GREEN).
- Money values are integers (cents). recoveryRatio is a float.
- TypeScript only — no .js files. No comments in generated code.
- Do not create files outside the listed set.
- Do not ask clarifying questions.
- Emit ===STORY_COMPLETE=== when done.
PROMPT

  success "Prompt written to $PROMPT_TMP"
}

# ── PROMPT GENERATION (Aider-style — no tool-call instructions) ──────────────
generate_prompt_aider() {
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

  local criteria
  criteria="$(jq -r '(.acceptanceCriteria // []) | .[] | .text' "$STORY_TMP" 2>/dev/null | sed 's/^/  - [ ] /')"

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

  local model_short; model_short="$(echo "$model" | sed 's|.*/||')"

  cat > "$PROMPT_TMP" << PROMPT
## Task: $STORY — $title [Tier $tier_num: $model_short via Aider, attempt $attempt_of_tier]

## Goal
$goal

## Acceptance Criteria (ALL must pass before you finish)
$criteria

## Context Bundle
A precomputed context bundle is at .research/contexts/${STORY}.json — read it
to see exact current file contents, sliced regions for shared files, and any
resolutions.

## Notes / Known Risks
$notes

## Dependencies (already done — do not re-implement)
$deps
$failure_block
## Rules
- Work inside this repo only. The files in your allowlist are the CLOSED SET.
- Write the *.spec.ts file FIRST. Run it. See RED. Then implement. Then GREEN.
- Money values are integers (cents), never floats. recoveryRatio is a float.
- TypeScript only, no .js files in backend.
- No comments in generated code, ever.
- Do not ask clarifying questions — the spec is complete.
- Do not modify .gitignore or any file outside your allowlist.
- When all acceptance criteria pass, you may stop. Emit a brief summary.
PROMPT

  success "Prompt written to $PROMPT_TMP"
}

# ── PROMPT GENERATION (opencode-style — tool-call OK for cloud) ──────────────
generate_prompt_opencode() {
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
      files+="  - EXISTS (edit surgically): $f"$'\n'
    else
      files+="  - CREATE (new file): $f"$'\n'
    fi
  done < <(jq -r '(.scope.files // []) | .[]' "$STORY_TMP" 2>/dev/null)

  local criteria
  criteria="$(jq -r '(.acceptanceCriteria // []) | .[] | .text' "$STORY_TMP" 2>/dev/null | sed 's/^/  - [ ] /')"

  local failure_block=""
  if [[ -n "$prior_failures" ]]; then
    failure_block="
## Prior Attempt Failed — Fix These
$prior_failures
"
  fi

  cat > "$PROMPT_TMP" << PROMPT
## Task: $STORY — $title [Tier $tier_num: $model_short, attempt $attempt_of_tier]

## Goal
$goal

## Files (CLOSED SET)
$files

## Acceptance Criteria
$criteria

## Notes
$notes
$failure_block
## Rules
- Write the *.spec.ts file FIRST (RED), then implement (GREEN).
- Do not create files outside the listed set.
- TypeScript only — no .js files. No comments in generated code.
- Emit ===STORY_COMPLETE=== when done.
PROMPT

  success "Prompt written to $PROMPT_TMP"
}

# ── SESSION INSTRUCTIONS ─────────────────────────────────────────────────────
print_session_instructions() {
  local harness="$1"
  local model="$2"
  local tier_num="$3"
  local attempt_of_tier="$4"
  local wt="$5"
  local branch="build/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')"

  local scope_files
  scope_files="$(get_scope_files | tr '\n' ' ')"
  scope_files="${scope_files% }"

  rule
  echo -e "${BOLD}SESSION — Tier $tier_num: $model via $harness (attempt $attempt_of_tier)${RESET}"
  rule
  echo
  echo "  Story:    $STORY"
  echo "  Worktree: $wt"
  echo "  Branch:   $branch"
  echo
  if [[ "$harness" == "pi" ]]; then
    echo -e "${BOLD}1. Launch pi inside the worktree${RESET}"
    echo
    echo "   cd $wt"
    echo "   pi @$PROMPT_TMP"
    echo
    echo -e "${BOLD}   Before pressing Enter: /models → select llama.cpp/$model${RESET}"
    echo
  elif [[ "$harness" == "aider" ]]; then
    echo -e "${BOLD}1. Launch Aider inside the worktree${RESET}"
    echo
    echo "   cd $wt"
    echo "   aider --model openai/$model \\"
    echo "         --openai-api-base http://127.0.0.1:8080/v1 \\"
    echo "         --openai-api-key dummy \\"
    echo "         --no-auto-commits --yes \\"
    echo "         --message \"\$(cat $PROMPT_TMP)\" \\"
    echo "         $scope_files"
  else
    echo -e "${BOLD}1. Launch opencode inside the worktree${RESET}"
    echo
    echo "   cd $wt"
    echo "   opencode run -m $model \"\$(cat $PROMPT_TMP)\""
    echo
    echo -e "${BOLD}   (or interactive: opencode -m $model, then paste prompt)${RESET}"
  fi
  echo
  rule
  echo -e "${BOLD}2. When the harness signals done, come back here and press Enter.${RESET}"
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

# ── RECORD RESULT ─────────────────────────────────────────────────────────────
record_result() {
  local result="$1"
  local tier_label="$2"
  local harness="$3"
  local model="$4"
  local attempt_of_tier="$5"
  local tier_max="$6"
  local elapsed_sec="$7"

  local epic; epic="$(echo "$STORY" | grep -oE '^E[0-9]+')"
  local ts; ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  local tmp; tmp="$(mktemp)"
  jq --arg story "$STORY" \
     --arg epic "$epic" \
     --arg tier "$tier_label" \
     --arg harness "$harness" \
     --arg model "$model" \
     --arg result "$result" \
     --argjson attemptOfTier "$attempt_of_tier" \
     --argjson tierMax "$tier_max" \
     --argjson elapsedSec "$elapsed_sec" \
     --arg ts "$ts" \
     '.runs += [{
       story:$story, epic:$epic, tier:$tier, harness:$harness, model:$model,
       result:$result, attemptOfTier:$attemptOfTier, tierMaxAttempts:$tierMax,
       elapsedSec:$elapsedSec, timestamp:$ts
     }]' \
     "$BUILD_LOG" > "$tmp" && mv "$tmp" "$BUILD_LOG"

  if [[ "$result" == "PASS" ]]; then
    success "Recorded: $STORY PASS at $model via $harness ($tier_label, attempt $attempt_of_tier, ${elapsed_sec}s)"
  else
    warn "Recorded: $STORY FAIL at $model via $harness ($tier_label)"
  fi
}

# ── COMMIT ON PASS ────────────────────────────────────────────────────────────
commit_and_merge() {
  local model="$1"
  local tier_label="$2"
  local harness="$3"
  local wt="$4"
  local branch="$5"

  info "Committing in worktree..."
  local model_short; model_short="$(echo "$model" | sed 's|.*/||')"
  local msg="$STORY PASS [$tier_label $model_short via $harness]"
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
    | map({tier: .[0].tier, harness: .[0].harness, model: .[0].model, count: length})
    | map("  \( .tier) \( .harness)/\( .model): \( .count)")
    | join("\n")
  ' "$BUILD_LOG" 2>/dev/null)"

  local total_pass
  total_pass="$(jq -r --arg epic "$epic" '
    [.runs[] | select(.epic==$epic and .result=="PASS")] | length
  ' "$BUILD_LOG" 2>/dev/null)"

  {
    echo "# Capability Study — $epic"
    echo
    echo "Auto-updated after each story PASS. Source: \`build-log.json\`."
    echo
    echo "## Tier distribution (PASS only)"
    echo
    echo '```'
    echo "${tier_distribution:-  (no PASS yet)}"
    echo '```'
    echo
    echo "Total PASS in epic: **${total_pass:-0}**"
    echo
    echo "## Full per-story history"
    echo
    jq -r --arg epic "$epic" '
      [.runs[] | select(.epic==$epic)]
      | group_by(.story)
      | map({
          story: .[0].story,
          attempts: map({tier, harness, model, result}) | .,
          passed: (any(.result == "PASS"))
        })
      | map("### \( .story) — \(if .passed then "PASS" else "FAIL" end)\n\(.attempts | map("  - \(.tier) \(.harness)/\(.model): \(.result)") | join("\n"))")
      | join("\n\n")
    ' "$BUILD_LOG" 2>/dev/null
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

  local needs_llama=false
  for tier_entry in "${TIER_LADDER[@]}"; do
    IFS='|' read -r _ harness _ _ <<< "$tier_entry"
    [[ "$harness" == "pi" || "$harness" == "aider" ]] && needs_llama=true
  done
  if $needs_llama; then
    check_llama_server
  fi

  local wt; wt="$(provision_worktree)"
  local branch="build/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')"

  build_context_bundle "$wt"

  local prior_failures=""
  local global_attempt=0

  for tier_entry in "${TIER_LADDER[@]}"; do
    local tier_name harness model tier_max
    IFS='|' read -r tier_name harness model tier_max <<< "$tier_entry"
    local tier_num="${tier_name#T}"

    local aot
    for ((aot=1; aot<=tier_max; aot++)); do
      global_attempt=$((global_attempt+1))
      local start_sec; start_sec="$(date +%s)"

      if [[ "$harness" == "pi" ]]; then
        generate_prompt_pi "$model" "$tier_num" "$aot" "$prior_failures" "$wt"
      elif [[ "$harness" == "aider" ]]; then
        generate_prompt_aider "$model" "$tier_num" "$aot" "$prior_failures" "$wt"
      else
        generate_prompt_opencode "$model" "$tier_num" "$aot" "$prior_failures" "$wt"
      fi
      print_session_instructions "$harness" "$model" "$tier_num" "$aot" "$wt" "$branch"

      read -rp "  Press Enter when the harness signals done... " _

      echo
      rule
      if run_verify "$wt"; then
        local end_sec; end_sec="$(date +%s)"
        local elapsed=$((end_sec - start_sec))
        echo
        success "$STORY PASSED at $tier_name ($model via $harness)."
        record_result "PASS" "$tier_name" "$harness" "$model" "$aot" "$tier_max" "$elapsed"
        commit_and_merge "$model" "$tier_name" "$harness" "$wt" "$branch"
        update_capability_report
        rule
        echo
        info "Next: ./run-story.sh <NEXT_STORY_ID>"
        echo
        exit 0
      else
        local end_sec; end_sec="$(date +%s)"
        local elapsed=$((end_sec - start_sec))
        record_result "FAIL" "$tier_name" "$harness" "$model" "$aot" "$tier_max" "$elapsed"
        prior_failures="$(extract_failures)"
        echo
        error "$STORY FAILED at $tier_name ($model via $harness), attempt $aot."
        echo
        echo "Failed criteria:"
        echo "$prior_failures"
        echo
      fi
    done
  done

  cat << EOF

$(rule)
$(error "$STORY EXHAUSTED all tiers. T5 (glm-5.2 via opencode) failed.")

Worktree preserved at: $wt
Branch: $branch

Options:
  1) Manual fix in worktree, then re-run verify inside it
  2) opencode thinking tier reviews the failing criterion and proposes a fix
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
