// Raw OpenFEMA declaration
export interface RawFemaDeclaration {
  id: number;
  disasterNumber: string;
  incidentType: string;
  state: string;
  declarationDate: string;
  title: string;
  federalResponse: string;
  obligatedAmount: number;
  disasterDeclarationSummaryId: number;
}

// Raw OpenFEMA disaster
export interface RawFemaDisaster {
  id: number;
  disasterNumber: string;
  incidentType: string;
  state: string;
  declarationDate: string;
  title: string;
  federalResponse: string;
  obligatedAmount: number;
  disasterDeclarationSummaryId: number;
}