#!/usr/bin/env bash
#
# run-story.sh — orchestrates one story through the full pipeline:
#   extract → prompt → (Pi session) → verify → retry/escalate → record
#
# Usage:
#   ./run-story.sh S03 build-deep
#   ./run-story.sh S04 build-fast
#   ./run-story.sh S03 handoff        # scaffold only
#
# Model routing (edit MODELS section below to change defaults):
#   handoff    → openrouter/qwen/qwen3-coder-480b-a35b-instruct:free
#   build-fast → ollama/qwen3-coder-next  (local)
#   build-deep → ollama/qwen3-coder-next  (local, escalates to Sonnet on 2nd fail)
#   escalated  → openrouter/anthropic/claude-sonnet-4-5
#
# Dependencies: jq, bash 4+
# Run from repo root.

set -u

# ── MODELS ────────────────────────────────────────────────────────────────────
MODEL_HANDOFF="openrouter/qwen/qwen3-coder-480b-a35b-instruct:free"
MODEL_BUILD_FAST="ollama/qwen3-coder-next"
MODEL_BUILD_DEEP="ollama/qwen3-coder-next"
MODEL_ESCALATED="openrouter/anthropic/claude-sonnet-4-5"

# ── PATHS ─────────────────────────────────────────────────────────────────────
PLAN=".research/plan.json"
BUILD_LOG=".research/build-log.json"
STORY_TMP="/tmp/fedspend-story.json"
PROMPT_TMP="/tmp/fedspend-prompt.txt"
VERIFY_OUT="/tmp/fedspend-verify.txt"

# ── ARGS ──────────────────────────────────────────────────────────────────────
STORY="${1:-}"
AGENT="${2:-}"

if [[ -z "$STORY" || -z "$AGENT" ]]; then
  echo "Usage: $0 <STORY_ID> <handoff|build-fast|build-deep>"
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
if [[ ! -f "$PLAN" ]]; then
  error "No $PLAN found. Run Planout agent first."
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  error "jq not installed. sudo apt install jq"
  exit 2
fi

# ── INITIALISE BUILD LOG ──────────────────────────────────────────────────────
if [[ ! -f "$BUILD_LOG" ]]; then
  echo '{"runs":[]}' > "$BUILD_LOG"
fi

# ── STEP 0: CHECK DEPENDENCIES ────────────────────────────────────────────────
check_dependencies() {
  info "Checking story dependencies..."
  local deps
  deps="$(jq -r --arg id "$STORY" '
    (.stories // .) | (if type=="array" then . else [.] end)
    | map(select(.id==$id)) | first | .dependencies[]? // empty
  ' "$PLAN" 2>/dev/null)"

  if [[ -z "$deps" ]]; then
    success "No dependencies required."
    return 0
  fi

  local all_ok=true
  while IFS= read -r dep; do
    local status
    status="$(jq -r --arg id "$dep" '
      .runs | map(select(.story==$id and .result=="PASS")) | length
    ' "$BUILD_LOG" 2>/dev/null)"
    if [[ "$status" -gt 0 ]]; then
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

# ── STEP 1: EXTRACT STORY ─────────────────────────────────────────────────────
extract_story() {
  info "Extracting $STORY from plan.json..."
  local story_json
  story_json="$(jq --arg id "$STORY" '
    (.stories // .) as $arr
    | ($arr | if type=="array" then . else [.] end)
    | map(select(.id == $id)) | first | select(. != null)
  ' "$PLAN" 2>/dev/null)"

  if [[ -z "$story_json" || "$story_json" == "null" ]]; then
    error "Story $STORY not found in $PLAN."
    echo "Available stories:"
    jq -r '(.stories // .) | (if type=="array" then . else [.] end) | .[].id' \
      "$PLAN" 2>/dev/null | sed 's/^/  /'
    exit 1
  fi

  echo "$story_json" > "$STORY_TMP"
  success "Story extracted to $STORY_TMP"
}

# ── STEP 2: PICK MODEL ────────────────────────────────────────────────────────
pick_model() {
  local attempt="$1"
  case "$AGENT" in
    handoff)     echo "$MODEL_HANDOFF" ;;
    build-fast)  echo "$MODEL_BUILD_FAST" ;;
    build-deep)
      if [[ "$attempt" -ge 2 ]]; then
        echo "$MODEL_ESCALATED"
      else
        echo "$MODEL_BUILD_DEEP"
      fi
      ;;
    *) error "Unknown agent '$AGENT'. Use: handoff build-fast build-deep"; exit 2 ;;
  esac
}

# ── STEP 3: GENERATE PROMPT ───────────────────────────────────────────────────
generate_prompt() {
  local attempt="$1"
  local prior_failures="$2"  # multiline string of failed criteria, empty on first attempt

  local title goal build
  title="$(jq -r '.title // "unknown"' "$STORY_TMP")"
  goal="$(jq -r '.goal // "see scope"' "$STORY_TMP")"
  build="$(jq -r '.build // "BUILD-FAST"' "$STORY_TMP")"

  # Label each scoped file with its on-disk state so the model never explores.
  # EXISTS -> read then edit surgically; CREATE -> write new. This kills the
  # "run find/glob/ls to discover the project" failure that stalls sessions.
  local files=""
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if [[ -e "$f" ]]; then
      files+="  - EXISTS (read first, then edit only what this story needs): $f"$'\n'
    else
      files+="  - CREATE (new file): $f"$'\n'
    fi
  done < <(jq -r '(.scope.files // []) | .[]' "$STORY_TMP" 2>/dev/null)

  local criteria
  criteria="$(jq -r '(.acceptanceCriteria // []) | .[] | .text' "$STORY_TMP" 2>/dev/null | sed 's/^/  - [ ] /')"

  local notes
  notes="$(jq -r '.notes // ""' "$STORY_TMP")"

  local deps
  deps="$(jq -r '(.dependencies // []) | .[]' "$STORY_TMP" 2>/dev/null | tr '\n' ' ')"

  local failure_block=""
  if [[ -n "$prior_failures" ]]; then
    failure_block="
## Prior Attempt Failed — Fix These
The previous attempt failed QA. These specific criteria were not met:
$prior_failures

Address each failed criterion explicitly. Do not re-implement what
already passes — check what exists first, then fix only what failed.
"
  fi

  cat > "$PROMPT_TMP" << PROMPT
## Task: $STORY — $title [$build]

## Goal
$goal

## Files to create or modify
$files

## Acceptance Criteria (ALL must pass before you report done)
$criteria

## Notes / Known Risks
$notes

## Dependencies (already done — do not re-implement)
$deps
$failure_block
## Rules
- The files above are labeled EXISTS or CREATE. Read the EXISTS ones, create
  the CREATE ones. Do NOT run find, glob, or ls. Do NOT explore the
  filesystem or look in node_modules — there is nothing to discover.
- Read each EXISTS file before modifying it. Edit surgically — never rewrite a
  whole file to change one part (that drops other stories' contributions to
  shared files like app.module.ts).
- Do not implement anything beyond the files list above. Do not create files
  not in the list. Do not write summaries, backlogs, or notes anywhere.
- Money values are integers (cents), never floats.
- TypeScript only, no .js files in backend.
- Do not ask clarifying questions — the spec above is complete.
- STOP THE MOMENT THE WORK IS DONE. After writing the listed files and running
  the build, emit exactly ===STORY_COMPLETE=== and then STOP. Do NOT continue,
  do NOT "improve", do NOT rewrite a file you already wrote, do NOT add extra
  files. Emit nothing after ===STORY_COMPLETE===. Continuing past this point
  has corrupted correct work before — the signal is a hard stop.
PROMPT

  success "Prompt written to $PROMPT_TMP"
}

# ── STEP 4: PRINT SESSION INSTRUCTIONS ───────────────────────────────────────
print_session_instructions() {
  local model="$1"
  local attempt="$2"

  rule
  echo -e "${BOLD}SESSION INSTRUCTIONS — Attempt $attempt${RESET}"
  rule
  echo
  echo -e "  Story:  ${BOLD}$STORY${RESET}"
  echo -e "  Agent:  ${BOLD}$AGENT${RESET}"
  echo -e "  Model:  ${BOLD}$model${RESET}"
  echo
  if [[ "$model" == "$MODEL_ESCALATED" ]]; then
    warn "ESCALATED — local model failed twice. Using $(echo "$model" | cut -d/ -f3)."
    echo
  fi
  echo -e "${BOLD}1. Launch Pi with this model:${RESET}"
  echo
  echo "   pi"
  echo "   (then switch model inside Pi: /model → select $model)"
  echo
  echo -e "${BOLD}2. Paste this prompt:${RESET}"
  echo
  cat "$PROMPT_TMP"
  echo
  rule
  echo -e "${BOLD}3. The MOMENT Pi emits ===STORY_COMPLETE===, come back here and press Enter. Do not let it keep going.${RESET}"
  rule
  echo
}

# ── STEP 5: VERIFY ────────────────────────────────────────────────────────────
run_verify() {
  info "Running verify2.sh --guard for $STORY..."
  if [[ ! -f "./verify2.sh" ]]; then
    error "verify2.sh not found in $(pwd)"
    exit 2
  fi
  bash ./verify2.sh "$STORY" --guard 2>&1 | tee "$VERIFY_OUT"
  local exit_code="${PIPESTATUS[0]}"
  return "$exit_code"
}

extract_failures() {
  grep '^  FAIL' "$VERIFY_OUT" 2>/dev/null | sed 's/.*FAIL  /  - /'
}

# ── STEP 6: RECORD RESULT ─────────────────────────────────────────────────────
record_result() {
  local result="$1"    # PASS | FAIL
  local model="$2"
  local attempt="$3"
  local timestamp
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  local tmp
  tmp="$(mktemp)"
  jq --arg story "$STORY" \
     --arg agent "$AGENT" \
     --arg model "$model" \
     --arg result "$result" \
     --arg attempt "$attempt" \
     --arg ts "$timestamp" \
     '.runs += [{story:$story, agent:$agent, model:$model,
                 result:$result, attempt:($attempt|tonumber),
                 timestamp:$ts}]' \
     "$BUILD_LOG" > "$tmp" && mv "$tmp" "$BUILD_LOG"

  success "Recorded: $STORY $result (attempt $attempt, $model)"
}

# ── STEP 7: ON PASS — GIT COMMIT ─────────────────────────────────────────────
commit_story() {
  local model="$1"
  local attempt="$2"
  info "Committing $STORY..."
  git add -A
  local msg="$STORY complete [${AGENT}] via $(echo "$model" | cut -d/ -f3)"
  if [[ "$attempt" -gt 1 ]]; then
    msg="$msg (attempt $attempt)"
  fi
  git commit -m "$msg" && success "Committed: $msg" || warn "git commit failed — commit manually"
}

# ── MAIN LOOP ─────────────────────────────────────────────────────────────────
main() {
  rule
  echo -e "${BOLD}run-story.sh — $STORY [$AGENT]${RESET}"
  rule

  check_dependencies
  extract_story

  local attempt=1
  local prior_failures=""

  while true; do
    local model
    model="$(pick_model "$attempt")"
    generate_prompt "$attempt" "$prior_failures"
    print_session_instructions "$model" "$attempt"

    # Wait for user to complete Pi session
    read -rp "  Press Enter the MOMENT Pi emits ===STORY_COMPLETE=== (don't let it keep going)... " _

    # Termination checkpoint: snapshot whatever the model produced BEFORE we
    # verify. If the model drifted and verify fails, the diff is preserved and
    # inspectable; if a later retry trashes good work, this is the restore
    # point. Uses a stash so the working tree is untouched.
    git stash push -u -m "checkpoint-${STORY}-attempt-${attempt}" >/dev/null 2>&1 && \
      git stash apply >/dev/null 2>&1 && \
      info "Checkpoint stashed: checkpoint-${STORY}-attempt-${attempt} (restore with git stash list)" || \
      warn "Checkpoint stash skipped (nothing to stash or git unavailable)"

    echo
    rule
    if run_verify; then
      echo
      success "$STORY PASSED all acceptance criteria."
      record_result "PASS" "$model" "$attempt"
      commit_story "$model" "$attempt"
      rule
      echo
      info "Next: check .research/plan.json for the next story and run:"
      echo "  ./run-story.sh <NEXT_STORY> <agent>"
      echo
      break
    else
      echo
      prior_failures="$(extract_failures)"
      error "$STORY FAILED verify2.sh (attempt $attempt)."
      echo
      echo "Failed criteria:"
      echo "$prior_failures"
      echo

      if [[ "$attempt" -ge 2 && "$AGENT" == "build-deep" ]]; then
        # already escalated on attempt 2, and still failing
        error "Failed after escalation to $(echo "$MODEL_ESCALATED" | cut -d/ -f3)."
        record_result "FAIL" "$model" "$attempt"
        echo
        echo "Options:"
        echo "  1) Manual fix — edit files, then re-run: ./run-story.sh $STORY $AGENT"
        echo "  2) Revisit acceptance criteria in plan.json"
        echo "  3) Abort"
        read -rp "  Choice [1/2/3]: " choice
        case "$choice" in
          1|2) break ;;
          *)   error "Aborted."; exit 1 ;;
        esac
      elif [[ "$attempt" -ge 2 ]]; then
        # build-fast failed twice — don't auto-escalate, ask
        record_result "FAIL" "$model" "$attempt"
        warn "Failed twice. Options:"
        echo "  r) Retry with same model"
        echo "  e) Escalate to $(echo "$MODEL_ESCALATED" | cut -d/ -f3)"
        echo "  a) Abort"
        read -rp "  Choice [r/e/a]: " choice
        case "$choice" in
          r) ;;
          e) AGENT="build-deep" ;;  # forces escalation path on next pick_model
          *) error "Aborted."; exit 1 ;;
        esac
      fi

      attempt=$((attempt+1))
      info "Retrying as attempt $attempt..."
      echo
    fi
  done
}

main
