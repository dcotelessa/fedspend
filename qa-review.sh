#!/usr/bin/env bash
#
# qa-review.sh — behavior-preserving QA refinement pass on a PASSed story.
#
# Usage:
#   ./qa-review.sh E2-S02
#
# Pipeline:
#   provision qa worktree → sync plan.json → generate QA prompt → pi refines
#   scope.files (behavior-preserving) → re-verify → PAUSE for human review of
#   the diff → on approval, ff-merge qa/<STORY> → main.
#
# Model: auto-picked to be DIFFERENT + STRONGER than the builder (cross-model
# review breaks self-review blind spots). Reads the PASSing model from
# build-log.json:
#   built by qwen3-coder:30b → QA with qwen3.6:35b   (local thinking, free)
#   built by qwen3.6:35b      → QA with zai-coding-plan/glm-5.2 (cloud thinker)
# Override with: ./qa-review.sh <STORY> --model <model>
# Cloud tiers skip the llama-server health check.
#
# The story's scope.files are the CLOSED SET. QA refactors within them only,
# the existing table-driven spec is the contract (must stay green), and
# verify2.sh --guard re-checks every acceptance criterion after refinement.
#
# Run from repo root. Dependencies: jq, bash 4+, pi.

set -u

# ── PATHS / CONFIG ────────────────────────────────────────────────────────────
PLAN=".research/plan.json"
BUILD_LOG=".research/build-log.json"
WORKTREE_BASE="../fedspend-qa"
STORY_TMP="/tmp/qa-story.json"
PROMPT_TMP="/tmp/qa-prompt.txt"
VERIFY_OUT="/tmp/qa-verify.txt"
MODEL_OVERRIDE=""
export PATH="$HOME/.local/bin:$PATH"

# ── ARG PARSING ───────────────────────────────────────────────────────────────
# Usage: qa-review.sh <STORY> [--model <model>]
STORY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)
      [[ $# -ge 2 ]] || { echo "--model requires a value" >&2; exit 2; }
      MODEL_OVERRIDE="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 <STORY_ID> [--model <model>]   (e.g. ./qa-review.sh E2-S02)" >&2
      exit 0 ;;
    *)
      [[ -z "$STORY" ]] || { echo "unexpected extra arg: $1" >&2; exit 2; }
      STORY="$1"; shift ;;
  esac
done
if [[ -z "$STORY" ]]; then
  echo "Usage: $0 <STORY_ID> [--model <model>]   (e.g. ./qa-review.sh E2-S02)" >&2
  exit 2
fi

# ── COLOURS (all logs to stderr — never pollute captured stdout) ──────────────
RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'
CYAN='\033[36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}▶${RESET} $*" >&2; }
success() { echo -e "${GREEN}✓${RESET} $*" >&2; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*" >&2; }
error()   { echo -e "${RED}✗${RESET} $*" >&2; }
rule()    { echo -e "${BOLD}──────────────────────────────────────────────────${RESET}" >&2; }

# ── GUARDS ────────────────────────────────────────────────────────────────────
[[ -f "$PLAN" ]]       || { error "No $PLAN."; exit 2; }
command -v jq >/dev/null || { error "jq required."; exit 2; }

story_json="$(jq --arg id "$STORY" '.stories[] | select(.id==$id)' "$PLAN" 2>/dev/null)"
if [[ -z "$story_json" || "$story_json" == "null" ]]; then
  error "Story $STORY not found in $PLAN."
  jq -r '.stories[].id' "$PLAN" 2>/dev/null | sed 's/^/  /' >&2
  exit 1
fi
echo "$story_json" > "$STORY_TMP"

# QA only runs on stories that have PASSed verify.
pass_count="$(jq -r --arg id "$STORY" \
  '[.runs[] | select(.story==$id and .result=="PASS")] | length' \
  "$BUILD_LOG" 2>/dev/null)"
if [[ "${pass_count:-0}" -eq 0 ]]; then
  error "$STORY has no PASS entry in $BUILD_LOG. QA reviews completed stories only."
  exit 1
fi

# Defense in depth: a build-log PASS doesn't guarantee the work was delivered —
# if the build's commit/merge failed after verify, build-log holds a phantom PASS
# but main lacks the scope.files. Confirm every scope.file is actually present
# before branching a QA worktree from a main that would lack them.
missing_files=""
while IFS= read -r f; do
  [[ -n "$f" ]] && [[ ! -f "$f" ]] && missing_files+="  - $f"$'\n'
done < <(jq -r '(.scope.files // []) | .[]' "$STORY_TMP" 2>/dev/null)
if [[ -n "$missing_files" ]]; then
  error "$STORY has a PASS in build-log but scope.files are missing on main:"
  echo "$missing_files" >&2
  echo "  The build's commit/merge likely failed after verify. Re-run:" >&2
  echo "    ./run-story.sh $STORY" >&2
  echo "  Do not run qa-review until the scope.files are actually on main." >&2
  exit 1
fi

success "$STORY has PASSed verify — eligible for QA."

# ── RESOLVE QA MODEL (cross-model: different + stronger than the builder) ─────
pick_qa_model() {
  local builder="$1"
  case "$builder" in
    qwen3-coder:30b) echo "qwen3.6:35b" ;;           # local thinking, cross-model, free
    qwen3.6:35b)     echo "zai-coding-plan/glm-5.2" ;; # cloud — breaks self-review
    glm-4.7-flash)   echo "zai-coding-plan/glm-5.2" ;; # cloud — breaks self-review
    *)               echo "zai-coding-plan/glm-5.2" ;; # default: strongest, different
  esac
}

if [[ -n "$MODEL_OVERRIDE" ]]; then
  MODEL="$MODEL_OVERRIDE"
  info "QA model overridden: $MODEL"
else
  builder_model="$(jq -r --arg id "$STORY" \
    '[.runs[] | select(.story==$id and .result=="PASS")] | sort_by(.timestamp) | last | .model // "unknown"' \
    "$BUILD_LOG" 2>/dev/null)"
  MODEL="$(pick_qa_model "$builder_model")"
  info "Story built by $builder_model → QA with $MODEL (cross-model)"
fi

is_cloud=false
case "$MODEL" in
  zai-coding-plan/*) is_cloud=true ;;
esac

# Local tiers need llama-server running the right model; cloud tiers don't.
if ! $is_cloud; then
  if ! curl -s "http://127.0.0.1:8080/health" >/dev/null 2>&1; then
    error "llama-server not running on port 8080."
    echo "  Start it with: ~/start-llama.sh thinking" >&2
    exit 1
  fi
  current_model="$(curl -s "http://127.0.0.1:8080/v1/models" 2>/dev/null \
    | jq -r '.models[0].model // .data[0].id // "unknown"' 2>/dev/null)"
  if [[ "$current_model" != "$MODEL" ]]; then
    warn "llama-server is running '$current_model', QA wants '$MODEL'."
    echo "  Run: ~/start-llama.sh thinking" >&2
    read -rp "  Continue anyway? [y/N] " ok
    [[ "$ok" =~ ^[Yy]$ ]] || { error "Aborted."; exit 1; }
  fi
else
  success "Cloud QA model ($MODEL) — no llama-server needed."
fi

# ── PROVISION QA WORKTREE ─────────────────────────────────────────────────────
provision_worktree() {
  local wt="${WORKTREE_BASE}/${STORY}"
  local branch="qa/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')"
  mkdir -p "$WORKTREE_BASE"

  if git worktree list | grep -q "$wt"; then
    info "QA worktree already exists at $wt — reusing."
  else
    info "Provisioning QA worktree at $wt on branch $branch..."
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      git worktree add --detach "$wt" "$branch" >/dev/null 2>&1 || {
        error "Failed to attach worktree to existing branch $branch."; exit 1; }
    else
      git worktree add -b "$branch" "$wt" HEAD >/dev/null 2>&1 || {
        error "git worktree add failed."; exit 1; }
    fi
    (cd "$wt" && mise trust >/dev/null 2>&1 || true)
    success "QA worktree ready (branched from $(git rev-parse --abbrev-ref HEAD))."
  fi
  echo "$wt"
}

# ── GENERATE QA PROMPT ────────────────────────────────────────────────────────
# The prompt enforces: CLOSED SET = scope.files, behavior-preserving, AGENTS.md
# quality bar, table-driven spec is the contract, no comments, emit QA_COMPLETE.
generate_qa_prompt() {
  local wt="$1"

  local title goal notes
  title="$(jq -r '.title // "unknown"' "$STORY_TMP")"
  goal="$(jq -r '.goal // ""' "$STORY_TMP")"
  notes="$(jq -r '.notes // ""' "$STORY_TMP")"

  local spec_file
  spec_file="$(jq -r '(.scope.files // []) | map(select(test("\\.spec\\.ts$")))[0] // ""' "$STORY_TMP")"

  local files=""
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if [[ -e "${wt}/${f}" ]]; then
      files+="  - ${f}"$'\n'
    else
      files+="  - ${f}  (MISSING — flag this, do not create)"$'\n'
    fi
  done < <(jq -r '(.scope.files // []) | .[]' "$STORY_TMP" 2>/dev/null)

  cat > "$PROMPT_TMP" << PROMPT
## QA Refinement — $STORY — $title

## Goal
Behavior-preserving refinement of a story that already PASSes verify. The
existing table-driven spec is the contract: it must stay green. You may ADD
edge-case rows to a testTable (sharpening the matrix) but must NOT weaken or
remove existing assertions, and must NOT change the public API or observable
behavior.

## Files (CLOSED SET — EDIT these existing files ONLY)
$files
You may ONLY edit the files listed above. Do NOT create new files. Do NOT
delete or rename files. If you believe a new file is warranted, flag it in your
final summary instead of creating it — file creation is a planning/story change,
not a QA refinement.

## Review Dimensions (apply the AGENTS.md quality bar)
- Naming: are identifiers intention-revealing? Rename where clearer.
- Dead code, unused imports, unreachable branches.
- Duplication that can be collapsed WITHOUT introducing a shallow abstraction.
- Shallow-abstraction smell: premature interfaces, micro-classes, one-impl
  abstractions. Collapse them.
- Module depth (Ousterhout): are Fetch → Transform → Return steps bundled into
  one deep module, or fragmented across helpers? Consolidate.
- Missing edge cases in the testTable — add rows, do not weaken existing ones.
- Money = integer cents (never floats). recoveryRatio = dimensionless float.
  Flag any violation.
- No comments in code. Design intent lives in AGENTS.md and story notes, never
  in source.

## Constraints (hard)
- EDIT ONLY the files listed above. No creating, deleting, or renaming files.
- Prefer surgical edits over rewrites. Refactor only what is clearly improved.
- Behavior-preserving: the existing table-driven spec is the contract.
- Keep the build green: \`cd backend && pnpm build\` must pass.
- Keep tests green: \`cd backend && pnpm test --testPathPatterns=${spec_file##*/}\` must pass.

## Before finishing
Run, in the worktree:
  cd backend && pnpm test --testPathPatterns=${spec_file##*/} && pnpm build
Both must succeed. Then emit exactly: ===QA_COMPLETE===

## Story context (for reference, do not re-implement the feature)
Goal: $goal
Notes: $notes
PROMPT

  success "QA prompt written to $PROMPT_TMP"
}

# ── SESSION INSTRUCTIONS ──────────────────────────────────────────────────────
print_session() {
  local wt="$1"
  local branch="qa/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')"
  rule
  echo -e "${BOLD}QA REVIEW — $STORY via pi ($MODEL)${RESET}"
  rule
  echo
  echo "  Worktree: $wt"
  echo "  Branch:   $branch"
  echo
  if $is_cloud; then
    echo -e "${BOLD}0. Cloud QA model — no llama-server needed${RESET}"
  else
    echo -e "${BOLD}0. Ensure llama-server is running $MODEL${RESET}"
    echo
    echo "   ~/start-llama.sh thinking"
  fi
  echo
  echo -e "${BOLD}1. Launch pi inside the QA worktree${RESET}"
  echo
  echo "   cd $wt"
  echo "   pi --model $MODEL --thinking medium @$PROMPT_TMP"
  echo
  echo -e "${BOLD}   (model auto-selected — no /models step needed)${RESET}"
  echo
  echo "   pi will refine the scope.files in place, run the spec + build,"
  echo "   and emit ===QA_COMPLETE=== when done."
  echo
  rule
  echo -e "${BOLD}2. When pi emits QA_COMPLETE, come back here and press Enter.${RESET}"
  echo -e "${BOLD}   verify will re-check every acceptance criterion; you then review"
  echo -e "${BOLD}   the diff and approve before merge.${RESET}"
  rule
}

# ── VERIFY ────────────────────────────────────────────────────────────────────
run_verify() {
  local wt="$1"
  info "Running verify2.sh --guard inside QA worktree..."
  (cd "$wt" && bash ./verify2.sh "$STORY" --guard) 2>&1 | tee "$VERIFY_OUT"
  return "${PIPESTATUS[0]}"
}

# ── DIFF + APPROVE + MERGE ────────────────────────────────────────────────────
review_and_merge() {
  local wt="$1"
  local branch="qa/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')"
  local base; base="$(git rev-parse HEAD)"

  # Stage only scope.files in the worktree — never git add -A (would sweep
  # build-log.json, run-story.sh, etc. into the QA commit).
  local scope_args=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && scope_args+=("$f")
  done < <(jq -r '(.scope.files // []) | .[]' "$STORY_TMP" 2>/dev/null)

  (cd "$wt" && git add -- "${scope_args[@]}" 2>/dev/null)

  # Off-contract detection: QA must only EDIT scope.files (which are now staged
  # as "M " — staged modification). Any other porcelain status — untracked (??),
  # deletion (D), rename (R), or worktree modification of a non-scope file ( M) —
  # means the model went beyond refinement. Those are NOT staged (won't merge)
  # but the human must see them before approving.
  local off_contract
  off_contract="$(cd "$wt" && git status --porcelain \
    | while IFS= read -r line; do
        [[ "${line:0:2}" != "M " ]] && echo "$line"
      done)"
  if [[ -n "$off_contract" ]]; then
    warn "QA introduced off-contract file ops (not staged, will NOT merge):"
    echo "$off_contract" | sed 's/^/    /' >&2
    echo "  These violate the EDIT-ONLY contract — the model created/deleted/" >&2
    echo "  renamed/modified-non-scope files instead of refining in place." >&2
    read -rp "  Proceed with merging scope-file edits anyway? [y/N]: " proceed
    [[ "$proceed" =~ ^[Yy]$ ]] || { warn "Aborted — worktree preserved at $wt."; exit 0; }
  fi

  if (cd "$wt" && git diff --cached --quiet); then
    warn "No changes staged — QA made no refinements within scope.files."
    echo "  Nothing to merge. Worktree preserved at $wt for inspection." >&2
    exit 0
  fi

  echo
  rule
  echo -e "${BOLD}QA refinements (diff vs $STORY PASS):${RESET}"
  rule
  (cd "$wt" && git --no-pager diff --cached --stat)
  echo
  echo -e "${BOLD}Full diff:${RESET}"
  (cd "$wt" && git --no-pager diff --cached)
  echo
  rule
  echo -e "${BOLD}Commit + merge qa refinements into main?${RESET}"
  read -rp "  [y/N/show-files]: " choice

  case "$choice" in
    [Yy]*)
      local msg="QA: $STORY refinements (behavior-preserving, verify green)"
      (cd "$wt" && git commit -m "$msg" --no-verify) >/dev/null 2>&1
      info "Merging $branch → main..."
      for _ctx in ".research/contexts/${STORY}.json" ".research/contexts/${STORY}.md"; do
        [[ -f "$_ctx" ]] || continue
        git ls-files --error-unmatch "$_ctx" >/dev/null 2>&1 || rm -f "$_ctx"
      done
      if git merge --ff-only "$branch" >/dev/null 2>&1; then
        success "Merged."
      else
        warn "ff-only failed — regular merge."
        git merge --no-edit "$branch" || {
          error "Merge failed. Worktree preserved at $wt."; return 1; }
      fi
      git worktree remove "$wt" --force >/dev/null 2>&1
      git branch -d "$branch" >/dev/null 2>&1
      success "QA refinements merged. Worktree + branch cleaned up."
      ;;
    [Ss]*)
      (cd "$wt" && git --no-pager diff --cached --name-only)
      echo
      read -rp "  Now merge? [y/N]: " choice2
      [[ "$choice2" =~ ^[Yy]$ ]] || choice="n"
      [[ "$choice" =~ ^[Yy]$ ]] || { warn "Aborted. Worktree preserved at $wt."; exit 0; }
      ;;
    *)
      warn "Aborted — no merge. Worktree preserved at $wt for manual inspection."
      echo "  Branch: $branch" >&2
      echo "  Re-run: ./qa-review.sh $STORY (reuses the worktree)" >&2
      exit 0
      ;;
  esac
}

# ── MAIN ──────────────────────────────────────────────────────────────────────
rule
echo -e "${BOLD}qa-review.sh — $STORY${RESET}"
rule
echo

wt="$(provision_worktree)"

# Sync live plan.json so verify runs against current criteria.
cp .research/plan.json "${wt}/.research/plan.json" 2>/dev/null || true

generate_qa_prompt "$wt"
print_session "$wt"

read -rp "  Press Enter when pi emits QA_COMPLETE... " _

echo
rule
if run_verify "$wt"; then
  echo
  success "$STORY still PASSes verify after QA refinement."
  review_and_merge "$wt"
else
  echo
  error "$STORY FAILED verify after QA refinement — the refinement changed behavior."
  echo "  Worktree preserved at $wt for inspection." >&2
  echo "  Options: fix in the worktree and re-run verify, or discard with:" >&2
  echo "    git worktree remove $wt --force && git branch -D qa/$(echo "$STORY" | tr '[:upper:]' '[:lower:]')" >&2
  exit 1
fi
