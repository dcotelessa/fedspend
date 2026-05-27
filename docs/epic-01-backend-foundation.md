# Epic 1 — NestJS Backend Foundation

## Goal

Scaffold the NestJS backend with all modules, TypeORM dual-database config, entities, and the health endpoint. No frontend code. No seed data (that's Epic 2).

## Prerequisites

- Node 22+, pnpm 10+
- NestJS CLI available via `npx @nestjs/cli`
- Working directory: `fedspend/`

## Execution Steps

### Step 1: Repo Setup

```bash
cd fedspend/
git init
# Create .gitignore (see below)
# Create README.md placeholder
gh repo create dcotelessa/fedspend --private --source=. --push=false
```

### Step 2: Scaffold NestJS App

```bash
cd fedspend/
npx @nestjs/cli new backend --package-manager pnpm --skip-git --strict
```

### Step 3: Install Dependencies

```bash
cd backend/
pnpm add @nestjs/typeorm typeorm better-sqlite3 pg @nestjs/config class-validator class-transformer @nestjs/schedule
pnpm add -D @types/better-sqlite3
```

### Step 4: Create Docs and Shared Directories

Already done at `fedspend/docs/` and `fedspend/shared/interfaces/`. Verify they exist.

### Step 5: Configure tsconfig Path Alias

Edit `backend/tsconfig.json` to add:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

Also update `tsconfig.build.json` to exclude `../shared` from the build if needed, or keep it included.

### Step 6: Configure TypeORM Dual-Database

Create `backend/src/config/typeorm.config.ts`:

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    };
  }

  return {
    type: 'better-sqlite3',
    database: 'data/fedspend.sqlite',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
  };
};
```

Register in `AppModule` via `TypeOrmModule.forRootAsync()`.

### Step 7: Create All 5 Entities

| Entity | File | Module |
|--------|------|--------|
| Agency | `agencies/agency.entity.ts` | agencies |
| SpendingRecord | `spending/spending-record.entity.ts` | spending |
| GeoSpendingSnapshot | `geography/geo-spending-snapshot.entity.ts` | geography |
| DisasterFundingRecord | `disaster/disaster-funding-record.entity.ts` | disaster |
| DisasterRecoveryRatio | `disaster/disaster-recovery-ratio.entity.ts` | disaster |

All monetary values stored as integers (cents).

Unique constraints:
- SpendingRecord: `(agencyId, fiscalYear, quarter, awardTypeLabel)`
- GeoSpendingSnapshot: `(stateCode, fiscalYear, agencyId, scope)`
- DisasterFundingRecord: `(defGroup, stateCode)`

### Step 8: Create 6 Modules

Generate each module with controller + service:

```bash
cd backend/
npx nest g module agencies
npx nest g controller agencies
npx nest g service agencies

npx nest g module spending
npx nest g controller spending
npx nest g service spending

npx nest g module geography
npx nest g controller geography
npx nest g service geography

npx nest g module disaster
npx nest g controller disaster
npx nest g service disaster

npx nest g module sync --no-controller
npx nest g service sync

npx nest g module health
npx nest g controller health
```

Each module registers its entities via `TypeOrmModule.forFeature([...])`.

### Step 9: Response Wrapper Interceptor

Create `backend/src/common/response-wrapper.interceptor.ts`:

- **Paginated list endpoints**: wraps response as `{ data: T[], meta: { total, page, pageSize } }`
- **Single-item endpoints**: returns `T` directly — no wrapper
- Uses a custom `@Paginated()` decorator to opt-in controllers/methods

### Step 10: CORS, Validation, Health Endpoint

**main.ts:**
- Enable CORS using `FRONTEND_URL` env var (fallback `*` in dev)
- Enable global `ValidationPipe` with `whitelist: true, transform: true`
- Set global prefix `api` if desired (optional — decide per endpoint design)

**HealthController:**
- `GET /health` → `{ status: 'ok', timestamp: ISO, database: 'connected' }`
- Checks TypeORM connection is active

### Step 11: .env.example

```
DATABASE_URL=
FRONTEND_URL=http://localhost:4200
NODE_ENV=development
```

### Step 12: Verify

```bash
cd backend/
pnpm start:dev
# In another terminal:
curl http://localhost:3000/health
# Should return: { "status": "ok", "timestamp": "...", "database": "connected" }
# Verify data/fedspend.sqlite exists with all 5 tables
```

## Acceptance Criteria

- [ ] `pnpm start:dev` starts without errors
- [ ] `GET /health` returns status JSON
- [ ] SQLite file created with all 5 entity tables
- [ ] All 6 modules registered and importable
- [ ] TypeORM config switches between SQLite and Postgres based on `DATABASE_URL`
- [ ] Response wrapper interceptor exists with `@Paginated()` decorator
- [ ] CORS enabled via `FRONTEND_URL`
- [ ] No frontend code exists yet
- [ ] `shared/interfaces/index.ts` contains all entity interfaces
- [ ] `docs/` folder contains all epic plans

## File Tree After Epic 1

```
fedspend/
├── .gitignore
├── README.md
├── docs/
│   ├── data-model.md
│   ├── epic-01-backend-foundation.md
│   ├── epic-02-data-sync.md
│   ├── epic-03-query-api.md
│   ├── epic-04-angular-foundation.md
│   ├── epic-05-geographic-view.md
│   ├── epic-06-agency-spotlight.md
│   ├── epic-07-disaster-lens.md
│   ├── epic-08-dashboard.md
│   ├── epic-09-deployment.md
│   └── epic-10-polish.md
├── shared/
│   └── interfaces/
│       └── index.ts
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── data/                  # gitignored, SQLite file location
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/
│       │   └── typeorm.config.ts
│       ├── common/
│       │   ├── response-wrapper.interceptor.ts
│       │   ├── paginated.decorator.ts
│       │   └── api-response.interface.ts
│       ├── agencies/
│       │   ├── agencies.module.ts
│       │   ├── agencies.controller.ts
│       │   ├── agencies.service.ts
│       │   ├── agency.entity.ts
│       │   └── dto/
│       ├── spending/
│       │   ├── spending.module.ts
│       │   ├── spending.controller.ts
│       │   ├── spending.service.ts
│       │   ├── spending-record.entity.ts
│       │   └── dto/
│       ├── geography/
│       │   ├── geography.module.ts
│       │   ├── geography.controller.ts
│       │   ├── geography.service.ts
│       │   ├── geo-spending-snapshot.entity.ts
│       │   └── dto/
│       ├── disaster/
│       │   ├── disaster.module.ts
│       │   ├── disaster.controller.ts
│       │   ├── disaster.service.ts
│       │   ├── disaster-funding-record.entity.ts
│       │   ├── disaster-recovery-ratio.entity.ts
│       │   └── dto/
│       ├── sync/
│       │   ├── sync.module.ts
│       │   ├── sync.controller.ts
│       │   └── sync.service.ts
│       └── health/
│           ├── health.module.ts
│           └── health.controller.ts
```
