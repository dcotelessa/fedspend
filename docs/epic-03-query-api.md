# Epic 3 — Query API

## Goal

Expose all query endpoints that power the three frontend views. Every endpoint returns real data from the sync pipeline.

## Response Format

- **Paginated list endpoints**: `{ data: T[], meta: { total, page, pageSize } }`
- **Single-item endpoints**: returns `T` directly, no wrapper

## Endpoints

### Agencies

| Method | Path | Returns |
|--------|------|---------|
| GET | `/agencies` | List all 6 agencies with current FY obligated totals |
| GET | `/agencies/:id/spotlight?fiscalYearStart=&fiscalYearEnd=` | SpendingRecord[] grouped by fiscalYear + awardTypeLabel |
| GET | `/agencies/:id/summary` | Current FY totals + YoY change percentage |

### Geography

| Method | Path | Returns |
|--------|------|---------|
| GET | `/geography/states?fiscalYear=&agencyId=&scope=` | GeoSpendingSnapshot[] sorted by obligatedAmount desc |
| GET | `/geography/state/:code` | All years, all agencies for one state |

Query params for `/geography/states`:
- `fiscalYear` (required): number
- `agencyId` (optional): number, null/missing = all agencies
- `scope` (required): "recipient" | "performance"

### Disaster

| Method | Path | Returns |
|--------|------|---------|
| GET | `/disaster/overview` | One row per DEF group with totals |
| GET | `/disaster/states?defGroup=&fiscalYear=` | DisasterFundingRecord[] sorted by obligatedAmount desc |
| GET | `/disaster/recovery-ratios?fiscalYear=` | DisasterRecoveryRatio[] sorted by recoveryRatio asc (worst first) |
| GET | `/disaster/state/:code` | Full profile: all DEF groups + ratio + declaration count |

## Validation

All query params validated via class-validator DTOs:
- `fiscalYear`: integer between 2020–2024
- `agencyId`: optional integer
- `scope`: enum "recipient" | "performance"
- `defGroup`: enum of valid DEF group names
- `page`: optional integer, default 1
- `pageSize`: optional integer, default 15, max 100

## Acceptance Criteria

- [ ] All endpoints return correct data shapes
- [ ] Pagination works on list endpoints
- [ ] Query param validation rejects invalid input with 400
- [ ] Sorting works as specified per endpoint
- [ ] Nullable `agencyId` returns combined-agency data
