// Agency row from /references/toptier_agencies/
export interface RawUsaSpendingAgencyRow {
  agency_name: string;
  toptier_code: string;
  abbreviation: string;
}

// Geography row from /search/spending_by_geography/
export interface RawUsaSpendingGeoRow {
  shape_code: string;
  display_name: string;
  aggregated_amount: number;
  population: number;
  per_capita: number;
}

// Def code row from /references/def_codes/
export interface RawUsaSpendingDefCodeRow {
  code: string;
  label: string;
  group: string;
}
