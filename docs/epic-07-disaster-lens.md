# Epic 7 — Disaster & Emergency Lens (`/disaster`)

## Goal

Build the disaster/emergency funding view — how does emergency funding coverage compare across states?

## Controls

- **DEF Group**: `mat-tab-group` with tabs: COVID-19 | Hurricane | Wildfire | Infrastructure | General
- **Fiscal Year**: `mat-select` (optional filter, default = all years)

## Summary Cards Row (4 cards)

1. Total disaster spending for selected group
2. Number of states receiving funding
3. States with recovery ratio < 0.5 (coverage gap count)
4. Highest per-capita state

## Spending by State — Horizontal Bar Chart

- Top 15 states by obligated amount for selected DEF group
- Same pattern as Geographic View — consistent UX
- Uses shared `BarChartComponent`

## Recovery Ratio Table — Analytical Centerpiece

- Columns: State, Disaster Declarations, FEMA Obligated, Federal DEF Spending, Recovery Ratio, Dominant Incident Type
- Sorted by recovery ratio **ascending** (worst-covered first)
- Recovery ratio cell: color-coded chip
  - **Red**: ratio < 0.5 (significant gap)
  - **Yellow**: 0.5–1.0 (partial coverage)
  - **Green**: > 1.0 (well-resourced)
- `mat-paginator`: 15 rows per page
- Tooltip on ratio column: "Recovery Ratio = Federal DEF Spending ÷ FEMA Baseline. A ratio below 1.0 indicates federal spending has not yet matched FEMA's initial obligation level."

## Data Flow

1. Tab selection → `defGroup` param
2. Fiscal year (optional) → `fiscalYear` param
3. Fetch `getDisasterOverview()` for summary cards
4. Fetch `getDisasterStates({ defGroup, fiscalYear })` for bar chart
5. Fetch `getDisasterRecoveryRatios({ fiscalYear })` for ratio table

## Recovery Ratio Chip Colors

```typescript
function getRatioColor(ratio: number): string {
  if (ratio < 0.5) return 'warn';    // red
  if (ratio < 1.0) return 'accent';  // yellow/amber
  return 'primary';                   // green
}
```

## Acceptance Criteria

- [ ] DEF group tabs filter data correctly
- [ ] Fiscal year filter works (optional)
- [ ] Summary cards show correct aggregated stats
- [ ] Bar chart shows top 15 states
- [ ] Recovery ratio table sorted ascending by default
- [ ] Ratio chips color-coded correctly
- [ ] Tooltip explains recovery ratio calculation
- [ ] Pagination works on ratio table
