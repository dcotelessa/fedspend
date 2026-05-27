# Epic 8 — Dashboard (`/`)

## Goal

Minimal landing page — half a day of work. Assembles components from other views into summary cards.

## Summary Stat Cards (4)

1. **Total obligated** across all 6 agencies, all years
2. **Largest agency** by FY2024 spend (name + amount)
3. **Coverage gap count** — number of states with disaster recovery ratio < 0.5
4. **Last sync timestamp**

## Agency Quick-Compare Bar Chart

- Simple grouped bar — all 6 agencies, FY2024 only
- Clicking a bar navigates to that agency's spotlight (`/agencies/:id`)
- Uses shared `BarChartComponent`

## Navigation Cards (3)

| Card | Route | Description |
|------|-------|-------------|
| Geographic View | `/geography` | "Where does federal money land, by state?" |
| Agency Spotlight | `/agencies` | "What did each agency actually buy, over what years?" |
| Disaster Lens | `/disaster` | "How does emergency funding coverage compare across states?" |

Each card: title, one-sentence description, icon, click navigates to route.

## Data Flow

1. `getAgencies()` → total obligated + largest agency + bar chart
2. `getDisasterRecoveryRatios()` → coverage gap count
3. Sync status stored in a service or fetched on load

## Acceptance Criteria

- [ ] 4 summary cards render with real data
- [ ] Bar chart shows all 6 agencies
- [ ] Bar chart click navigates to agency spotlight
- [ ] 3 navigation cards link to correct routes
- [ ] Page loads in under 2 seconds
