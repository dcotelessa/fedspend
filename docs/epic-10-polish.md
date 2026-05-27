# Epic 10 — Polish & README

## Goal

Final polish — dark mode, app shell, tests, and documentation. Make it demo-ready.

## App Shell

- **Top nav**: route links for Dashboard, Geography, Agencies, Disaster
- **Dark mode toggle**: Angular Material theme switching
- **Footer**: "Data: USASpending.gov (U.S. Treasury) · OpenFEMA (FEMA) · Updated nightly"

## Dark Mode

- Angular Material theme switching via `mat-slide-toggle` in nav
- Use CSS custom properties or Angular Material's theming system
- mat-tables and charts must look sharp on dark backgrounds
- Store preference in localStorage

## Data Disclaimer Component

- Small banner or footer note
- "Recovery ratios are analytical estimates based on public data. Not an official government metric."

## Unit Tests

One test per layer:

### SyncService — DEF Code Grouping
- Verify each DEF group maps to correct codes
- Verify unknown codes are handled

### RecoveryRatioService — Ratio Edge Cases
- Division by zero (femaObligated = 0)
- Missing FEMA data (null)
- Both zero → ratio = 1

### DisasterLensComponent — Table Sort Defaults
- Verify table sorts by recoveryRatio ascending by default

## README

### Structure
1. **What it is and why** — lead with civic angle + Ad Hoc connection
2. **Architecture** — two sentences + ASCII diagram
3. **How to run locally** — step by step
4. **API endpoints** — all endpoints with one example curl each
5. **Recovery ratio** — how it's calculated and what it means
6. **Render deployment** — steps

### Architecture Diagram

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

## Acceptance Criteria

- [ ] Dark mode toggle works across all views
- [ ] Navigation bar links to all routes
- [ ] Footer displays data sources
- [ ] Data disclaimer visible
- [ ] 3 unit tests pass
- [ ] README is complete and accurate
