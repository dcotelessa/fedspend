# Epic 2 — Data Sync (USASpending.gov)

## Goal

Build the sync pipeline that fetches real data from USASpending.gov and OpenFEMA, transforms it, and stores it in the database. This is the data backbone of the entire app.

## Data Sources

### USASpending.gov REST API (no key required)

Endpoints used:
- `GET /api/v2/agency/{toptier_code}/budgetary_resources/` — agency metadata
- `POST /api/v2/search/spending_by_award/` — spending by award type
- `POST /api/v2/search/spending_by_geography/` — geographic spending
- `POST /api/v2/disaster/spending_by_geography/` — disaster/emergency spending

### OpenFEMA API (no key required)

- `GET https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries` — disaster declarations

## Award Type Groupings

```typescript
const AWARD_TYPES = {
  'Contracts':       ['A','B','C','D'],
  'Grants':          ['02','03','04','05'],
  'Direct Payments': ['06','07','08'],
  'Loans':           ['07','08'],
  'IDVs':            ['IDV_A','IDV_B','IDV_B_A','IDV_B_B',
                      'IDV_B_C','IDV_C','IDV_D','IDV_E'],
}
```

## DEF Code Groupings

```typescript
const DEF_GROUPS = {
  'COVID-19':       ['L','M','N','O','P','U'],
  'Hurricane':      ['W'],
  'Infrastructure': ['Z'],
  'Wildfire':       ['R'],
  'General':        ['A'],
}
```

## SyncService Responsibilities

1. **Upsert all 6 tracked agencies** — insert if not exists, update name if changed
2. **Fetch FY2020–2024 spending per agency** — store to SpendingRecord
3. **Fetch geo snapshots** — for all agencies + combined, both scopes (recipient + performance)
4. **Fetch disaster spending** — per DEF group per state
5. **Fetch OpenFEMA declarations** — compute and store DisasterRecoveryRatio
6. **Retry logic**: 3 attempts, exponential backoff
7. **Nightly schedule**: 2am UTC via `@nestjs/schedule`

## Sync Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sync` | Full sync (all modules) |
| POST | `/sync/agencies` | Agencies + spending only |
| POST | `/sync/geography` | Geo snapshots only |
| POST | `/sync/disaster` | Disaster + recovery ratios only |
| GET | `/sync/status` | Last sync timestamps per module |

## UsaSpendingService

Wraps all USASpending API calls. Each method handles:
- Building the correct request body/filters
- Pagination (USASpending returns paginated results)
- Rate limiting / throttling
- Error handling with typed responses

## OpenFemaService

Wraps the OpenFEMA API:
- Fetches disaster declarations by state
- Aggregates by fiscal year
- Computes FEMA obligated amounts per state
- Determines dominant incident type per state

## Recovery Ratio Calculation

```
recoveryRatio = fedSpendingObligated / femaObligated
```

Edge cases:
- If `femaObligated === 0` and `fedSpendingObligated === 0` → ratio = 1 (neutral)
- If `femaObligated === 0` and `fedSpendingObligated > 0` → ratio = Infinity (flag as well-resourced)
- If `femaObligated > 0` and `fedSpendingObligated === 0` → ratio = 0 (complete gap)

## Acceptance Criteria

- [ ] `POST /sync` fetches and stores data for all 6 agencies
- [ ] SpendingRecord table populated with FY2020–2024 data
- [ ] GeoSpendingSnapshot populated for all states, all agencies, both scopes
- [ ] DisasterFundingRecord populated per DEF group per state
- [ ] DisasterRecoveryRatio computed from cross-referenced data
- [ ] Retry logic works (test by simulating API failure)
- [ ] Nightly schedule registered and visible in logs
- [ ] `GET /sync/status` returns timestamps
- [ ] All monetary values stored in cents

## Seed Data (TRACKED_AGENCIES)

Seeded on first sync — not on app startup:

```typescript
const TRACKED_AGENCIES = [
  { name: 'NASA',                          abbreviation: 'NASA', toptierCode: '080' },
  { name: 'General Services Admin',        abbreviation: 'GSA',  toptierCode: '047' },
  { name: 'Office of Personnel Mgmt',      abbreviation: 'OPM',  toptierCode: '024' },
  { name: 'Library of Congress',           abbreviation: 'LOC',  toptierCode: '036' },
  { name: 'Health & Human Services',       abbreviation: 'HHS',  toptierCode: '075' },
  { name: 'FDIC',                          abbreviation: 'FDIC', toptierCode: '581' },
]
```
