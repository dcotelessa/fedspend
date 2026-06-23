#!/usr/bin/env bash
#
# run-story.sh — orchestrates one story through the full pipeline:
#   extract → context-bundle → worktree → tier-ladder build → verify → merge
#
# Usage:
#   ./run-story.sh E1-S05
#
# Tier ladder is branched by story.build (read from plan.json). All tiers use pi:
#
#   BUILD-FAST (scaffolds, controllers, constants, config):
#     T1  llama.cpp/qwen3-coder:30b via pi     (2 attempts) — local, native tools
#     T2  zai-coding-plan/glm-4.7 via pi        (1 attempt)  — cloud coding-plan
#     T3  zai-coding-plan/glm-5.2 via pi        (1 attempt)  — cloud thinking
#
#   BUILD-DEEP (services, orchestrators, pure logic):
#     T1  llama.cpp/qwen3.6:35b via pi          (2 attempts) — local, thinking MoE
#     T2  zai-coding-plan/glm-5.2 via pi        (1 attempt)  — cloud thinking
#
#   Final fail → stop, human reviews, resume after OK.
#
# Note: qwen3-coder-next (51 GB), Aider tiers, and opencode tiers were retired —
# pi drives every tier (local via llama.cpp, cloud via zai-coding-plan provider).
#
# Dependencies: jq, bash 4+, pi (~/.pi).
# Local tiers need llama-server running: ~/start-llama.sh (coder|thinking|flash)
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

# ── TIER LADDERS ──────────────────────────────────────────────────────────────
# Format: "T<n>|<harness>|<model_id>|<max_attempts>"
#   harness = pi | opencode
#   model_id is passed to the harness's --model flag
TIER_LADDER_FAST=(
  "T1|pi|qwen3-coder:30b|2"
  "T2|pi|zai-coding-plan/glm-4.7|1"
  "T3|pi|zai-coding-plan/glm-5.2|1"
)

TIER_LADDER_DEEP=(
  "T1|pi|qwen3.6:35b|2"
  "T2|pi|zai-coding-plan/glm-5.2|1"
)

TIER_LADDER=()

# ── ARGS ──────────────────────────────────────────────────────────────────────
STORY="${1:-}"
if [[ -z "$STORY" ]]; then
  echo "Usage: $0 <STORY_ID>   (e.g. ./run-story.sh E1-S03)"
  exit 2
fi

# ── COLOURS ───────────────────────────────────────────────────────────────────
RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'
CYAN='\033[36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}▶${RESET} $*" >&2; }
success() { echo -e "${GREEN}✓${RESET} $*" >&2; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*" >&2; }
error()   { echo -e "${RED}✗${RESET} $*" >&2; }
rule()    { echo -e "${BOLD}──────────────────────────────────────────────────${RESET}" >&2; }

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

# ── TIER LADDER SELECTION ─────────────────────────────────────────────────────
select_tier_ladder() {
  local build_type
  build_type="$(jq -r '.build // "BUILD-FAST"' "$STORY_TMP" 2>/dev/null)"

  case "$build_type" in
    BUILD-DEEP)
      TIER_LADDER=("${TIER_LADDER_DEEP[@]}")
      info "Build type: BUILD-DEEP → ladder: qwen3.6:35b → glm-5.2"
      ;;
    BUILD-FAST|*)
      TIER_LADDER=("${TIER_LADDER_FAST[@]}")
      info "Build type: BUILD-FAST → ladder: qwen3-coder:30b → glm-4.7 → glm-5.2"
      ;;
  esac
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
  # build_context_bundle regenerates the per-story bundle in repo-root as
  # untracked files; the branch also commits them, so a merge would abort with
  # "untracked working tree files would be overwritten." Drop the transient
  # copies — the merge brings the canonical committed versions back.
  rm -f ".research/contexts/${STORY}.json" ".research/contexts/${STORY}.md" 2>/dev/null || true
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

# ── SYNC HARNESS FILES INTO WORKTREE ──────────────────────────────────────────
# A worktree is a snapshot of the branch at creation time; plan.json drifts in
# repo-root as we fix brittle acceptance checks. Sync the live plan.json into
# the worktree so verify runs against current criteria. (verify2.sh is tracked
# and stable; run-story.sh/build-context.sh aren't read inside the worktree.)
sync_harness_to_worktree() {
  local wt="$1"
  info "Syncing plan.json into worktree..."
  cp .research/plan.json "${wt}/.research/plan.json" 2>/dev/null || true
  success "plan.json synced."
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
## Task: $STORY — $title [Tier $tier_num: $model via pi, attempt $attempt_of_tier]

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

  local model_short; model_short="$(echo "$model" | sed 's|.*/||')"

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

  rule
  echo -e "${BOLD}SESSION — Tier $tier_num: $model via $harness (attempt $attempt_of_tier)${RESET}"
  rule
  echo
  echo "  Story:    $STORY"
  echo "  Worktree: $wt"
  echo "  Branch:   $branch"
  echo
  if [[ "$harness" == "pi" ]]; then
    case "$model" in
      zai-coding-plan/*)
        echo -e "${BOLD}0. Cloud model — no llama-server needed${RESET}"
        echo
        echo -e "${BOLD}1. Launch pi inside the worktree${RESET}"
        echo
        echo "   cd $wt"
        echo "   pi @$PROMPT_TMP"
        echo
        echo -e "${BOLD}   Before pressing Enter: /models → select $model${RESET}"
        ;;
      *)
        local start_arg="coder"
        case "$model" in
          *thinking*|qwen3.6*) start_arg="thinking" ;;
          *flash*)             start_arg="flash" ;;
        esac
        echo -e "${BOLD}0. Ensure llama-server is running $model${RESET}"
        echo
        echo "   ~/start-llama.sh $start_arg"
        echo
        echo -e "${BOLD}1. Launch pi inside the worktree${RESET}"
        echo
        echo "   cd $wt"
        echo "   pi @$PROMPT_TMP"
        echo
        echo -e "${BOLD}   Before pressing Enter: /models → select llama-server/$model${RESET}"
        ;;
    esac
    echo
  else
    echo -e "${BOLD}1. Launch $harness inside the worktree${RESET}"
    echo
    echo "   cd $wt"
    echo "   $harness run -m $model \"\$(cat $PROMPT_TMP)\""
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
# Stage ONLY the story's scope.files + the per-story context bundle. Never use
# `git add -A` — the worktree also holds drift copies of build-log.json,
# run-story.sh, plan.json etc. that must NOT enter the story commit (they would
# entangle the subsequent merge with stale global state).
commit_and_merge() {
  local model="$1"
  local tier_label="$2"
  local harness="$3"
  local wt="$4"
  local branch="$5"

  info "Committing story scope in worktree..."
  local model_short; model_short="$(echo "$model" | sed 's|.*/||')"
  local msg="$STORY PASS [$tier_label $model_short via $harness]"

  local scope_args=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && scope_args+=("$f")
  done < <(jq -r '(.scope.files // []) | .[]' "$STORY_TMP" 2>/dev/null)
  scope_args+=(".research/contexts/${STORY}.json" ".research/contexts/${STORY}.md")

  if (cd "$wt" && git add -- "${scope_args[@]}" 2>/dev/null && git commit -m "$msg" --no-verify) >/dev/null 2>&1; then
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
  select_tier_ladder

  local needs_llama=false
  for tier_entry in "${TIER_LADDER[@]}"; do
    IFS='|' read -r _ _ model _ <<< "$tier_entry"
    case "$model" in
      zai-coding-plan/*) ;;
      *) needs_llama=true ;;
    esac
  done
  if $needs_llama; then
    check_llama_server
  fi

  local wt; wt="$(provision_worktree)"
  local branch="build/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')"

  sync_harness_to_worktree "$wt"
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

  rule
  error "$STORY EXHAUSTED all tiers. Final tier failed."

  cat << EOF

Worktree preserved at: $wt
Branch: $branch

Options:
  1) Manual fix in worktree, then re-run verify inside it
  2) Thinking tier reviews the failing criterion and proposes a fix
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
