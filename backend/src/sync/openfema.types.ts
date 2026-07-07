// Raw OpenFEMA Public Assistance Grant Award Activity
export interface RawFemaPAGrantAwardActivity {
  federalShareObligated: number;
  stateAbbreviation: string;
  state: string;
  incidentType: string;
  declarationDate: string;
}

// Raw OpenFEMA disaster declaration summary
export interface RawFemaDisasterDeclarationSummary {
  incidentType: string;
  state: string;
  stateName?: string;
  declarationDate: string;
  obligatedAmount?: number;
  fyDeclared?: number;
}
