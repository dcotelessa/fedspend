# Epic 6 — Agency Spotlight (`/agencies/:id`)

## Goal

Build the agency detail view — what did each agency actually buy, over what years?

## Header

- Agency full name + abbreviation (large text)
- Current FY total obligated (large number display)
- YoY change from prior year (green/red percentage badge)
  - Data from `GET /agencies/:id/summary`

## "What Did [NASA] Actually Buy?" — Stacked Bar Chart

- X axis: fiscal year (controlled by range selector)
- Y axis: obligated amount
- Stacked segments: Contracts, Grants, Direct Payments, Loans, IDVs
- Consistent color per award type across all agencies
- Fiscal year range: two `mat-select` controls (from / to)
- Data from `GET /agencies/:id/spotlight?fiscalYearStart=&fiscalYearEnd=`

## Dynamic Insight Line (Below Chart)

Computed from returned data, not hardcoded:
- "In FY2024, NASA spent [X]% of its budget on Contracts"
- "Grant spending [increased/decreased] [X]% from [startYear] to [endYear]"

Simple percentage calculations from the SpendingRecord data.

## Award Type Breakdown Table

- Columns: Award Type, FY2024 Obligated, % of Total, Award Count
- Sorted by obligated amount desc
- No chart — the stacked bar above covers it
- `mat-table` with `mat-sort`

## Data Flow

1. Route param `:id` → fetch agency from `getAgencies()`
2. Fetch `getAgencySummary(id)` for header stats
3. Fetch `getAgencySpotlight(id, { fiscalYearStart, fiscalYearEnd })` for chart + table
4. Default fiscal year range: FY2020–FY2024
5. User changes range → re-fetch spotlight data

## Award Type Color Map

```typescript
const AWARD_COLORS = {
  'Contracts':       '#1565C0',  // blue
  'Grants':          '#2E7D32',  // green
  'Direct Payments': '#F57F17',  // amber
  'Loans':           '#6A1B9A',  // purple
  'IDVs':            '#C62828',  // red
}
```

## Acceptance Criteria

- [ ] Agency header shows name, abbreviation, current FY total, YoY change
- [ ] Stacked bar chart renders with correct segments
- [ ] Fiscal year range selector filters chart data
- [ ] Dynamic insight line updates with data
- [ ] Award type breakdown table renders with sorting
- [ ] Colors consistent across agencies
- [ ] Currency values formatted via CurrencyFormatPipe
