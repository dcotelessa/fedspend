#!/usr/bin/env bash
#
# gen-s04.sh — generate S04's module scaffolds deterministically.
# 20 files of empty boilerplate. No model, no drift, no XML errors.
# Run from repo root (the dir containing backend/).
set -eu

cd backend/src

# Capitalize helper: agencies -> Agencies
cap() { printf '%s' "$1" | sed 's/^./\U&/'; }

# Full modules: module + controller + service + dto/.gitkeep
for m in agencies spending geography disaster; do
  C="$(cap "$m")"
  mkdir -p "$m/dto"
  touch "$m/dto/.gitkeep"

  cat > "$m/$m.module.ts" <<EOF
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class ${C}Module {}
EOF

  cat > "$m/$m.controller.ts" <<EOF
import { Controller } from '@nestjs/common';

@Controller('$m')
export class ${C}Controller {}
EOF

  cat > "$m/$m.service.ts" <<EOF
import { Injectable } from '@nestjs/common';

@Injectable()
export class ${C}Service {}
EOF
done

# sync: module + service ONLY (no controller — resolved contradiction)
mkdir -p sync
cat > sync/sync.module.ts <<EOF
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class SyncModule {}
EOF
cat > sync/sync.service.ts <<EOF
import { Injectable } from '@nestjs/common';

@Injectable()
export class SyncService {}
EOF

# health: module + controller ONLY (no service — resolved contradiction)
mkdir -p health
cat > health/health.module.ts <<EOF
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class HealthModule {}
EOF
cat > health/health.controller.ts <<EOF
import { Controller } from '@nestjs/common';

@Controller('health')
export class HealthController {}
EOF

echo "Generated 20 S04 files."
echo "Now wiring AppModule..."
