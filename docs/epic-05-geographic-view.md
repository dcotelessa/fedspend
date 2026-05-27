# Epic 5 — Geographic View (`/geography`)

## Goal

Build the geographic analysis view — where does federal money land, by state?

## Controls (Top Bar)

- **Agency**: `mat-select` — "All Agencies" + 6 individual agencies
- **Fiscal Year**: `mat-select` — 2020, 2021, 2022, 2023, 2024
- **Scope**: `mat-button-toggle-group` — "Where Contractors Are Based" (`recipient`) | "Where Work Happens" (`performance`)

## Top Section — Horizontal Bar Chart

- Top 10 states by obligated amount for current filter
- X axis: dollar amount, Y axis: state name
- Single color, clean, sorted descending
- Uses shared `BarChartComponent`

## Bottom Section — mat-table

- All 50 states, sortable by any column
- Columns: State, Total Obligated, Per Capita, Award Count, vs. All-Agencies Avg (% above/below)
- `mat-paginator`: 15 rows per page
- `mat-sort` on all columns

## Insight Stat

When scope is toggled, show a delta stat:
> "California contractors receive $X but only $Y worth of work happens in-state."

Computed by comparing `recipient` vs `performance` scope data for the top state.

## Data Flow

1. User selects filters → triggers `ApiService.getGeographyStates(params)`
2. Response populates both chart (top 10) and table (all states)
3. If both scopes are loaded, compute the delta stat

## Acceptance Criteria

- [ ] Agency select filters data correctly
- [ ] Fiscal year select filters data correctly
- [ ] Scope toggle switches between recipient/performance
- [ ] Bar chart shows top 10 states
- [ ] Table shows all states with sorting and pagination
- [ ] Delta stat appears when scope is toggled
- [ ] Currency values formatted via CurrencyFormatPipe
