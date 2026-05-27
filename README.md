# FedSpend — Federal Budget Tracker

A portfolio project that ingests public spending data from USASpending.gov and OpenFEMA, then visualizes it through an Angular dashboard backed by a NestJS API.

## Why This Exists

FedSpend was built to answer three questions about federal spending:

1. **Where does federal money land, by state?** — Geographic View
2. **What did each agency actually buy, over what years?** — Agency Spotlight
3. **How does emergency funding coverage compare across states?** — Disaster Lens

The six tracked agencies (NASA, GSA, OPM, LOC, HHS, FDIC) are Ad Hoc's actual Federal Civilian clients — built with their portfolio in mind.

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

## Project Status

Currently in development. See `docs/` for detailed plans per epic.

## Tech Stack

- **Frontend**: Angular 17+, Angular Material, ng2-charts
- **Backend**: NestJS, TypeORM, class-validator
- **Database**: SQLite (local), Postgres (production)
- **Data Sources**: USASpending.gov REST API, OpenFEMA API

## Local Development

```bash
# Backend
cd backend && pnpm install && pnpm start:dev

# Frontend
cd frontend && pnpm install && pnpm start
```

## Documentation

See `docs/` for detailed epic plans and data model documentation.
