# FedSpend Data Model

## Agency

| Field         | Type     | Notes                          |
|---------------|----------|--------------------------------|
| id            | number   | Auto-increment PK              |
| name          | string   | "National Aeronautics and Space Administration" |
| abbreviation  | string   | "NASA"                         |
| toptierCode   | string   | USASpending identifier, unique |

## SpendingRecord

| Field            | Type   | Notes                                           |
|------------------|--------|--------------------------------------------------|
| id               | number | Auto-increment PK                                |
| agencyId         | number | FK → Agency                                      |
| fiscalYear       | number | 2020–2024                                        |
| quarter          | number | 1–4                                              |
| awardTypeLabel   | string | "Contracts" \| "Grants" \| "Direct Payments" \| "Loans" \| "IDVs" |
| awardTypeCodes   | string | Raw codes stored as comma-separated string       |
| obligatedAmount  | number | Stored in **cents**                              |
| outlayAmount     | number | Stored in **cents**                              |
| awardCount       | number |                                                  |

Unique constraint: `(agencyId, fiscalYear, quarter, awardTypeLabel)`

## GeoSpendingSnapshot

| Field           | Type   | Notes                                    |
|-----------------|--------|------------------------------------------|
| id              | number | Auto-increment PK                        |
| stateCode       | string | "CA"                                     |
| stateName       | string |                                          |
| fiscalYear      | number |                                          |
| agencyId        | number | nullable FK → Agency, null = all agencies combined |
| scope           | string | "recipient" \| "performance"             |
| obligatedAmount | number | Stored in **cents**                      |
| awardCount      | number |                                          |
| population      | number |                                          |
| perCapita       | number |                                          |

Unique constraint: `(stateCode, fiscalYear, agencyId, scope)`

## DisasterFundingRecord

| Field           | Type   | Notes                                      |
|-----------------|--------|--------------------------------------------|
| id              | number | Auto-increment PK                          |
| defGroup        | string | "COVID-19" \| "Hurricane Relief" \| "Wildfire" \| "Infrastructure" \| "General" |
| defCodes        | string | Raw DEF codes stored as comma-separated string |
| stateCode       | string |                                            |
| stateName       | string |                                            |
| obligatedAmount | number | Stored in **cents**                        |
| awardCount      | number |                                            |
| perCapita       | number |                                            |
| population      | number |                                            |

Unique constraint: `(defGroup, stateCode)`

## DisasterRecoveryRatio

| Field                  | Type   | Notes                                        |
|------------------------|--------|----------------------------------------------|
| id                     | number | Auto-increment PK                            |
| stateCode              | string |                                              |
| stateName              | string |                                              |
| fiscalYear             | number |                                              |
| femaObligated          | number | From OpenFEMA, in **cents**                  |
| fedSpendingObligated   | number | From USASpending DEF codes, in **cents**     |
| declarationCount       | number |                                              |
| recoveryRatio          | number | fedSpending / fema                           |
| dominantIncidentType   | string | Most frequent disaster type                  |

## Tracked Agencies

These are Ad Hoc's actual Federal Civilian clients:

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
