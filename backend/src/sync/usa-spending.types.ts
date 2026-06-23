// Raw USASpending award row
export interface RawUsaSpendingAwardRow {
  id: number;
  agency_id: string;
  fiscal_year: number;
  award_type: string;
  obligated_amount: number;
  outlay_amount: number;
  description: string;
  recipient_name: string;
  recipient_id: string;
  award_date: string;
  place_of_performance_state: string;
  place_of_performance_country: string;
  disaster_emergency_fund_code: string;
}

// Raw USASpending geographic row
export interface RawUsaSpendingGeoRow {
  id: number;
  agency_id: string;
  fiscal_year: number;
  award_type: string;
  obligated_amount: number;
  outlay_amount: number;
  place_of_performance_state: string;
  place_of_performance_country: string;
  disaster_emergency_fund_code: string;
}

// Raw USASpending disaster row
export interface RawUsaSpendingDisasterRow {
  id: number;
  agency_id: string;
  fiscal_year: number;
  award_type: string;
  obligated_amount: number;
  outlay_amount: number;
  place_of_performance_state: string;
  place_of_performance_country: string;
  disaster_emergency_fund_code: string;
}