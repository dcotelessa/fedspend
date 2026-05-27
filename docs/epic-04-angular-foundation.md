# Epic 4 — Angular Frontend Foundation

## Goal

Scaffold the Angular 17 standalone app with Angular Material, ng2-charts, shared services, interceptors, and routing.

## Scaffold

```bash
cd fedspend/
npx @angular/cli new frontend --style=scss --routing=true --ssr=false --package-manager=pnpm
cd frontend/
pnpm add @angular/material @angular/cdk ng2-charts chart.js
```

## Routes

| Path | Component | View |
|------|-----------|------|
| `/` | DashboardComponent | Overview dashboard |
| `/geography` | GeographicViewComponent | Where does money land by state |
| `/agencies` | AgencyListComponent | Agency list |
| `/agencies/:id` | AgencySpotlightComponent | Agency detail |
| `/disaster` | DisasterLensComponent | Emergency funding lens |

## Shared Services

### ApiService

Single injected service with typed methods for every backend endpoint:
- `getAgencies()`
- `getAgencySpotlight(id, params)`
- `getAgencySummary(id)`
- `getGeographyStates(params)`
- `getGeographyState(code)`
- `getDisasterOverview()`
- `getDisasterStates(params)`
- `getDisasterRecoveryRatios(params)`
- `getDisasterState(code)`

All methods return `Observable<T>` using Angular `HttpClient`.

### LoadingService

- `loading$: WritableSignal<boolean>` — true when any request is in-flight
- Used by a global `LoadingInterceptor`

### LoadingInterceptor

- Intercepts all HTTP requests
- Increments/decrements a counter on `LoadingService`
- Sets `loading$` to true when counter > 0

### ErrorInterceptor

- Catches API errors (non-2xx responses)
- Shows `mat-snack-bar` notification with error message
- Does not retry (simple, for demo)

## Environment Files

`environment.ts`:
```typescript
export const environment = { apiUrl: 'http://localhost:3000' };
```

`environment.prod.ts`:
```typescript
export const environment = { apiUrl: '' };
```

## Shared Components

### BarChartComponent

Reusable chart component used across all three views:
- `@Input() labels: string[]`
- `@Input() datasets: ChartDataset[]`
- `@Input() title: string`
- `@Input() horizontal: boolean`
- Wraps ng2-charts `canvas` with consistent styling

### CurrencyFormatPipe

- Transforms cents → formatted dollar string
- Example: `1500000000` → `$15,000,000.00`

## Path Aliases

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

## Acceptance Criteria

- [ ] `pnpm start` launches Angular dev server on port 4200
- [ ] All 5 routes render placeholder components
- [ ] ApiService compiles with typed methods
- [ ] Loading interceptor sets loading signal
- [ ] Error interceptor shows snack-bar on API error
- [ ] Angular Material theme applied
- [ ] CurrencyFormatPipe formats cents correctly
