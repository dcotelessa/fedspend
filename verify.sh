#!/usr/bin/env bash
#
# verify.sh — deterministic acceptance-criteria checker for FedSpend Epic 1
#
# Usage:
#   ./verify.sh S04          # check one story
#   ./verify.sh all          # check every story built so far
#
# Exit code 0 = all checked criteria passed, non-zero = at least one failed.
# This script NEVER trusts an LLM's word. It checks the filesystem and the
# build directly. That is the whole point.
#
# Run from the repo root (the directory containing backend/ and .research/).

set -u  # error on unset vars; we handle failures explicitly, so no -e

# ---- locate repo root -------------------------------------------------------
ROOT="$(pwd)"
BACKEND="$ROOT/backend"

if [[ ! -d "$BACKEND" ]]; then
  echo "FATAL: no backend/ dir here. Run from repo root (where backend/ lives)."
  exit 2
fi

# ---- result tracking --------------------------------------------------------
PASS=0
FAIL=0
declare -a FAILURES

# check NAME : CONDITION (a command). Prints PASS/FAIL, records result.
check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    printf '  \033[32mPASS\033[0m  %s\n' "$name"
    PASS=$((PASS+1))
  else
    printf '  \033[31mFAIL\033[0m  %s\n' "$name"
    FAIL=$((FAIL+1))
    FAILURES+=("$name")
  fi
}

# convenience predicates
file_exists()    { [[ -f "$1" ]]; }
dir_exists()     { [[ -d "$1" ]]; }
file_contains()  { grep -q -- "$2" "$1" 2>/dev/null; }
file_absent()    { [[ ! -e "$1" ]]; }

build_ok() {
  # returns 0 if `pnpm build` succeeds
  ( cd "$BACKEND" && pnpm build ) >/dev/null 2>&1
}

# ---- per-story checks -------------------------------------------------------

verify_S01() {
  echo "S01 — NestJS scaffold + dependencies"
  check "package.json exists"            file_exists "$BACKEND/package.json"
  check "@nestjs/core in deps"           file_contains "$BACKEND/package.json" '@nestjs/core'
  check "@nestjs/typeorm in deps"        file_contains "$BACKEND/package.json" '@nestjs/typeorm'
  check "better-sqlite3 in deps"         file_contains "$BACKEND/package.json" 'better-sqlite3'
  check "typeorm in deps"                file_contains "$BACKEND/package.json" 'typeorm'
  check "class-validator in deps"        file_contains "$BACKEND/package.json" 'class-validator'
  check "node_modules installed"         dir_exists "$BACKEND/node_modules"
  check "better-sqlite3 compiled"        file_exists "$BACKEND/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
  check ".env.example exists"            file_exists "$BACKEND/.env.example"
  check ".env.example has DATABASE_URL"  file_contains "$BACKEND/.env.example" 'DATABASE_URL'
  check ".env.example has FRONTEND_URL"  file_contains "$BACKEND/.env.example" 'FRONTEND_URL'
  check ".env.example has NODE_ENV"      file_contains "$BACKEND/.env.example" 'NODE_ENV'
}

verify_S02() {
  echo "S02 — TypeScript path alias"
  check "tsconfig.json exists"           file_exists "$BACKEND/tsconfig.json"
  check "@shared/* alias present"        file_contains "$BACKEND/tsconfig.json" '@shared/\*'
  check "nest-cli.json exists"           file_exists "$BACKEND/nest-cli.json"
  check "build succeeds"                 build_ok
}

verify_S03() {
  echo "S03 — TypeORM dual-database config"
  check "typeorm.config.ts exists"       file_exists "$BACKEND/src/config/typeorm.config.ts"
  check "getTypeOrmConfig defined"       file_contains "$BACKEND/src/config/typeorm.config.ts" 'getTypeOrmConfig'
  check "better-sqlite3 type referenced" file_contains "$BACKEND/src/config/typeorm.config.ts" 'better-sqlite3'
  check "postgres branch present"        file_contains "$BACKEND/src/config/typeorm.config.ts" 'postgres'
  check "DATABASE_URL switch present"    file_contains "$BACKEND/src/config/typeorm.config.ts" 'DATABASE_URL'
  check "AppModule uses forRootAsync"    file_contains "$BACKEND/src/app.module.ts" 'forRootAsync'
  check "ConfigModule isGlobal"          file_contains "$BACKEND/src/app.module.ts" 'isGlobal'
  check "build succeeds"                 build_ok
  # Runtime check: with no DATABASE_URL, sqlite file should be created on boot.
  # This is a deeper check — see verify_S03_runtime below (opt-in, slower).
}

verify_S03_runtime() {
  echo "S03 (runtime) — SQLite boots with no DATABASE_URL"
  # Boot the app briefly with no DATABASE_URL and confirm the sqlite file appears.
  ( cd "$BACKEND" && rm -f data/fedspend.sqlite 2>/dev/null
    timeout 25 env -u DATABASE_URL pnpm start:dev >/tmp/fedspend_boot.log 2>&1 &
    BOOT_PID=$!
    for _ in $(seq 1 20); do
      [[ -f data/fedspend.sqlite ]] && break
      sleep 1
    done
    kill $BOOT_PID 2>/dev/null; wait $BOOT_PID 2>/dev/null
  )
  check "data/fedspend.sqlite created"   file_exists "$BACKEND/data/fedspend.sqlite"
  check "boot log shows Nest started"    file_contains /tmp/fedspend_boot.log 'Nest application successfully started'
}

verify_S04() {
  echo "S04 — 6 modules with controllers/services"
  for m in agencies spending geography disaster; do
    check "$m module"     file_exists "$BACKEND/src/$m/$m.module.ts"
    check "$m controller" file_exists "$BACKEND/src/$m/$m.controller.ts"
    check "$m service"    file_exists "$BACKEND/src/$m/$m.service.ts"
  done
  check "sync module"                    file_exists "$BACKEND/src/sync/sync.module.ts"
  check "sync service"                   file_exists "$BACKEND/src/sync/sync.service.ts"
  check "sync has NO controller"         file_absent "$BACKEND/src/sync/sync.controller.ts"
  check "health module"                  file_exists "$BACKEND/src/health/health.module.ts"
  check "health controller"              file_exists "$BACKEND/src/health/health.controller.ts"
  check "health has NO service"          file_absent "$BACKEND/src/health/health.service.ts"
  check "AppModule imports AgenciesModule"   file_contains "$BACKEND/src/app.module.ts" 'AgenciesModule'
  check "AppModule imports SpendingModule"   file_contains "$BACKEND/src/app.module.ts" 'SpendingModule'
  check "AppModule imports GeographyModule"  file_contains "$BACKEND/src/app.module.ts" 'GeographyModule'
  check "AppModule imports DisasterModule"   file_contains "$BACKEND/src/app.module.ts" 'DisasterModule'
  check "AppModule imports SyncModule"       file_contains "$BACKEND/src/app.module.ts" 'SyncModule'
  check "AppModule imports HealthModule"     file_contains "$BACKEND/src/app.module.ts" 'HealthModule'
  check "build succeeds"                 build_ok
}

verify_S05() {
  echo "S05 — 5 entities"
  check "agency.entity.ts"               file_exists "$BACKEND/src/agencies/agency.entity.ts"
  check "spending-record.entity.ts"      file_exists "$BACKEND/src/spending/spending-record.entity.ts"
  check "geo-spending-snapshot.entity.ts" file_exists "$BACKEND/src/geography/geo-spending-snapshot.entity.ts"
  check "disaster-funding-record.entity.ts" file_exists "$BACKEND/src/disaster/disaster-funding-record.entity.ts"
  check "disaster-recovery-ratio.entity.ts" file_exists "$BACKEND/src/disaster/disaster-recovery-ratio.entity.ts"
  check "build succeeds"                 build_ok
}

verify_S06() {
  echo "S06 — response wrapper interceptor"
  check "interceptor file exists"        file_exists "$BACKEND/src/common/response-wrapper.interceptor.ts"
  check "paginated decorator exists"     file_exists "$BACKEND/src/common/paginated.decorator.ts"
  check "build succeeds"                 build_ok
}

verify_S07() {
  echo "S07 — CORS, validation, health endpoint"
  check "main.ts has ValidationPipe"     file_contains "$BACKEND/src/main.ts" 'ValidationPipe'
  check "main.ts has enableCors"         file_contains "$BACKEND/src/main.ts" 'enableCors'
  check "health controller has GET"      file_contains "$BACKEND/src/health/health.controller.ts" 'Get'
  check "build succeeds"                 build_ok
}

# ---- dispatcher -------------------------------------------------------------

run_one() {
  local story="$1"
  local fn="verify_${story}"
  if declare -F "$fn" >/dev/null; then
    "$fn"
  else
    echo "No checks defined for story '$story'."
    echo "Known: S01 S02 S03 S03_runtime S04 S05 S06 S07"
    exit 2
  fi
}

main() {
  local target="${1:-all}"
  echo "FedSpend verification — $(date '+%H:%M:%S')"
  echo "Root: $ROOT"
  echo "----------------------------------------"

  if [[ "$target" == "all" ]]; then
    for s in S01 S02 S03 S04 S05 S06 S07; do
      run_one "$s"
      echo
    done
  else
    run_one "$target"
    echo
  fi

  echo "----------------------------------------"
  echo "PASS: $PASS    FAIL: $FAIL"
  if (( FAIL > 0 )); then
    echo "Failed criteria:"
    for f in "${FAILURES[@]}"; do echo "  - $f"; done
    exit 1
  fi
  echo "All checked criteria passed."
  exit 0
}

main "$@"
