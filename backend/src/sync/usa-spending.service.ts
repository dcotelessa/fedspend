import { Injectable } from '@nestjs/common';
import { Agency } from '../agencies/agency.entity';
import { SpendingRecord } from '../spending/spending-record.entity';
import { GeoSpendingSnapshot } from '../geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from '../disaster/disaster-funding-record.entity';
import {
  RawUsaSpendingAgencyRow,
  RawUsaSpendingGeoRow,
  RawUsaSpendingDefCodeRow,
} from './usa-spending.types';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

const API_BASE = 'https://api.usaspending.gov/api/v2';
const DISASTER_FISCAL_YEAR = 2024;

type FetchSpendingResult =
  | { status: 'success'; rows: SpendingRecord[]; total: number }
  | { status: 'not_found' };

type FetchGeoResult =
  | { status: 'success'; rows: GeoSpendingSnapshot[] }
  | { status: 'not_found' };

type FetchDisasterResult =
  | { status: 'success'; rows: DisasterFundingRecord[] }
  | { status: 'not_found' };

type FetchAgenciesResult =
  | { status: 'success'; agencies: Agency[] }
  | { status: 'not_found' };

type FetchDefCodesResult =
  | { status: 'success'; defCodes: RawUsaSpendingDefCodeRow[] }
  | { status: 'not_found' };

const transformGeoRows = (
  rows: RawUsaSpendingGeoRow[],
  scope: string,
  fiscalYear: number,
): GeoSpendingSnapshot[] =>
  rows.map((r) => ({
    id: undefined as any,
    stateCode: r.shape_code || '',
    stateName: r.display_name || '',
    fiscalYear,
    agencyId: null as any,
    scope,
    obligatedAmount: Math.round(r.aggregated_amount * 100),
    awardCount: 0,
    population: r.population || 0,
    perCapita: Math.round((r.per_capita || 0) * 100),
    agency: null as any,
  })) as GeoSpendingSnapshot[];

const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
): Promise<unknown> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

const fetchAllPages = async (
  baseUrl: string,
  baseBody: Record<string, unknown>,
): Promise<unknown[]> => {
  const firstBody = (await fetchWithRetry(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...baseBody, page: 1 }),
  })) as {
    results: unknown[];
    page_metadata?: { has_next?: boolean; total?: number; page?: number };
  };

  const allRows: unknown[] = [...(firstBody.results || [])];

  if (firstBody.page_metadata?.has_next) {
    let page = 2;
    while (true) {
      const pageBody = (await fetchWithRetry(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseBody, page }),
      })) as { results: unknown[]; page_metadata?: { has_next?: boolean } };
      allRows.push(...(pageBody.results || []));
      if (!pageBody.page_metadata?.has_next) break;
      page++;
    }
  }

  return allRows;
};

@Injectable()
export class UsaSpendingService {
  async fetchAgencies(): Promise<FetchAgenciesResult> {
    const rawData = await fetchWithRetry(
      `${API_BASE}/references/toptier_agencies/`,
    );
    const body = rawData as { results: RawUsaSpendingAgencyRow[] };

    const agencies: Agency[] = body.results.map((r) => ({
      id: undefined as any,
      name: r.agency_name || '',
      abbreviation: r.abbreviation || '',
      toptierCode: r.toptier_code,
    }));

    return agencies.length > 0
      ? { status: 'success', agencies }
      : { status: 'not_found' };
  }

  async fetchSpendingByAgency(
    params: { agency: string; fiscalYear: number },
  ): Promise<FetchSpendingResult> {
    if (!params.agency) return { status: 'not_found' };

    const body = {
      filters: {
        time_period: [{
          start_date: `${params.fiscalYear}-10-01`,
          end_date: `${params.fiscalYear + 1}-09-30`,
        }],
      },
      geo_layer: 'state',
      scope: 'recipient_location',
    };

    const allRows = await fetchAllPages(
      `${API_BASE}/search/spending_by_geography/`,
      body,
    );

    const rawGeo = allRows as RawUsaSpendingGeoRow[];
    const transformed = transformGeoRows(rawGeo, 'recipient_location', params.fiscalYear).map(
      (r) => ({
        ...r,
        id: undefined as any,
        agencyId: parseInt(params.agency, 10) || 0,
        fiscalYear: params.fiscalYear,
        quarter: 1,
        awardTypeLabel: '',
        awardTypeCodes: '',
        outlayAmount: 0,
      }) as SpendingRecord,
    );

    return transformed.length > 0
      ? { status: 'success', rows: transformed, total: rawGeo.length }
      : { status: 'not_found' };
  }

  async fetchGeoSnapshots(
    params: { agency: string; fiscalYear: number; scope: string },
  ): Promise<FetchGeoResult> {
    const scopeMap: Record<string, string> = {
      recipient: 'recipient_location',
      performance: 'place_of_performance',
    };
    const body = {
      filters: {
        time_period: [{
          start_date: `${params.fiscalYear}-10-01`,
          end_date: `${params.fiscalYear + 1}-09-30`,
        }],
      },
      geo_layer: 'state',
      scope: scopeMap[params.scope] || params.scope,
    };

    const allRows = await fetchAllPages(
      `${API_BASE}/search/spending_by_geography/`,
      body,
    );

    const rawGeo = allRows as RawUsaSpendingGeoRow[];
    const transformed = transformGeoRows(rawGeo, params.scope, params.fiscalYear);

    return transformed.length > 0
      ? { status: 'success', rows: transformed }
      : { status: 'not_found' };
  }

  async fetchDisasterSpending(
    defGroup: string,
  ): Promise<FetchDisasterResult> {
    const body = {
      filters: {
        time_period: [{
          start_date: `${DISASTER_FISCAL_YEAR}-10-01`,
          end_date: `${DISASTER_FISCAL_YEAR + 1}-09-30`,
        }],
        def_codes: [defGroup],
      },
      geo_layer: 'state',
      scope: 'recipient_location',
    };

    const allRows = await fetchAllPages(
      `${API_BASE}/search/spending_by_geography/`,
      body,
    );

    const rawGeo = allRows as RawUsaSpendingGeoRow[];
    const transformed = transformGeoRows(rawGeo, 'recipient_location', DISASTER_FISCAL_YEAR).map(
      (r) => ({
        ...r,
        id: undefined as any,
        defGroup,
        defCodes: defGroup,
      }) as DisasterFundingRecord,
    );

    return transformed.length > 0
      ? { status: 'success', rows: transformed }
      : { status: 'not_found' };
  }

  async fetchDefCodes(): Promise<FetchDefCodesResult> {
    const rawData = await fetchWithRetry(
      `${API_BASE}/references/def_codes/`,
    );
    const body = rawData as { codes: RawUsaSpendingDefCodeRow[] };

    const defCodes: RawUsaSpendingDefCodeRow[] = body.codes.map((r) => ({
      code: r.code,
      label: r.label,
      group: r.group,
    }));

    return defCodes.length > 0
      ? { status: 'success', defCodes }
      : { status: 'not_found' };
  }
}
