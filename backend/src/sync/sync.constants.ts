export const TRACKED_AGENCIES = [
  { abbreviation: 'NASA', id: '080' },
  { abbreviation: 'GSA', id: '047' },
  { abbreviation: 'OPM', id: '024' },
  { abbreviation: 'LOC', id: '036' },
  { abbreviation: 'HHS', id: '075' },
  { abbreviation: 'FDIC', id: '581' },
];

export const SPENDING_FISCAL_YEARS = [
  2020,
  2021,
  2022,
  2023,
  2024,
];

export const SPENDING_AGENCY_SYNC_LIMIT = 20;

export const GEO_FISCAL_YEARS = [
  2020,
  2021,
  2022,
  2023,
  2024,
];

export const AWARD_TYPES = [
  'Contracts',
  'Grants',
  'Direct Payments',
  'Loans',
  'IDVs',
];

export const awardTypeToCode: Record<string, string> = {
  'Contracts': 'C',
  'Grants': 'G',
  'Direct Payments': 'DP',
  'Loans': 'L',
  'IDVs': 'I',
};

export const DEF_GROUPS = [
  'COVID-19',
  'Hurricane',
  'Infrastructure',
  'Wildfire',
  'General',
];