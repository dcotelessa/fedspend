export interface Agency {
  id: number;
  name: string;
  abbreviation: string;
  toptierCode: string;
}

export interface SpendingRecord {
  id: number;
  agencyId: number;
  fiscalYear: number;
  quarter: number;
  awardTypeLabel: string;
  awardTypeCodes: string;
  obligatedAmount: number;
  outlayAmount: number;
  awardCount: number;
}

export interface GeoSpendingSnapshot {
  id: number;
  stateCode: string;
  stateName: string;
  fiscalYear: number;
  agencyId: number | null;
  scope: 'recipient' | 'performance';
  obligatedAmount: number;
  awardCount: number;
  population: number;
  perCapita: number;
}

export interface DisasterFundingRecord {
  id: number;
  defGroup: string;
  defCodes: string;
  stateCode: string;
  stateName: string;
  obligatedAmount: number;
  awardCount: number;
  perCapita: number;
  population: number;
}

export interface DisasterRecoveryRatio {
  id: number;
  stateCode: string;
  stateName: string;
  fiscalYear: number;
  femaObligated: number;
  fedSpendingObligated: number;
  declarationCount: number;
  recoveryRatio: number;
  dominantIncidentType: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface AgencySummary {
  agency: Agency;
  currentFyTotal: number;
  priorFyTotal: number;
  yoyChange: number;
}

export interface DisasterOverview {
  defGroup: string;
  totalObligated: number;
  totalAwardCount: number;
  stateCount: number;
  highestPerCapitaState: string;
  highestPerCapita: number;
  coverageGapCount: number;
}

export interface GeographyQuery {
  agencyId: number | null;
  fiscalYear: number;
  scope: 'recipient' | 'performance';
}
