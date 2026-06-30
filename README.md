# FedSpend — Federal Budget Tracker

A portfolio project that ingests public spending data from USASpending.gov and OpenFEMA, then visualizes it through an Angular dashboard backed by a NestJS API.

## What

FedSpend was built to answer three questions about federal spending:

1. **Where does federal money land, by state?** — Geographic View
2. **What did each agency actually buy, over what years?** — Agency Spotlight
3. **How does emergency funding coverage compare across states?** — Disaster Lens

The six tracked agencies (NASA, GSA, OPM, LOC, HHS, FDIC) are Ad Hoc's actual Federal Civilian clients — built with their portfolio in mind.

Recovery ratios (federal spending vs FEMA obligations per state) are analytical estimates derived from public data. They are not official government metrics.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────┐
│   Angular    │────▶│   NestJS    │────▶│ SQLite / │
│   Frontend   │◀────│   Backend   │◀────│ Postgres │
└─────────────┘     └──────┬──────┘     └──────────┘
                           │
                    ┌──────┴──────┐
                    │ USASpending │
                    │  OpenFEMA   │
                    └─────────────┘
```

- **Angular frontend** renders dashboards, charts, and data tables.
- **NestJS backend** exposes REST APIs, validates input with class-validator, and persists data with TypeORM.
- **SQLite** is the local database; **Postgres** is the production database.
- **USASpending.gov** and **OpenFEMA** are the public data sources.

## Local

```bash
# Backend
cd backend && pnpm install && pnpm start:dev

# Frontend
cd frontend && pnpm install && pnpm start
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/agencies | List all tracked federal agencies |
| GET    | /api/agencies/:id | Get agency details |
| GET    | /api/states | List all states |
| GET    | /api/spending | Query spending data |
| GET    | /api/disasters | Query disaster funding data |
| GET    | /api/recovery-ratios | Get disaster recovery ratios |

## Recovery Ratio

The recovery ratio measures how federal spending compares to FEMA obligations for a given state and year:

```
recoveryRatio = federalObligated / femaObligated
```

Stored as a float (not an integer), since it is a dimensionless ratio, not a monetary value. Values like 2.5 mean federal spending was 2.5× the FEMA obligation for that state-year.

## Deploy

Deploy to Render:

1. Push code to a production branch.
2. In Render, connect your GitHub repo.
3. Add environment variables: `DATABASE_URL`, `API_KEY_USASPENDING`, `API_KEY_OPENFEMA`.
4. Set the backend service to `npm run build` and `npm start`.
5. Set the frontend service to `npm run build:prod` and `npm start` with `--prod`.
6. Render will auto-deploy on push.
