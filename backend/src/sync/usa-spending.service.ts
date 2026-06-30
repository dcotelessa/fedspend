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

const transformAgencyRows = (
  rows: RawUsaSpendingAgencyRow[],
): Agency[] =>
  rows.map((r) => ({
    id: 0,
    name: r.agency_name || '',
    abbreviation: r.abbreviation || '',
    toptierCode: r.toptier_code,
  }));

const transformGeoRows = (
  rows: RawUsaSpendingGeoRow[],
  scope: string,
): GeoSpendingSnapshot[] =>
  rows.map((r) => ({
    id: 0,
    stateCode: r.display_data.state || r.shape_code,
    stateName: r.display_data.state_name || r.display_data.state || '',
    fiscalYear: 2024,
    agencyId: 0,
    scope,
    obligatedAmount: Math.round(r.aggregated_amount * 100),
    awardCount: 0,
    population: 0,
    perCapita: 0,
    agency: null as any,
  }));

const transformDefCodeRows = (
  rows: RawUsaSpendingDefCodeRow[],
): RawUsaSpendingDefCodeRow[] =>
  rows.map((r) => ({
    code: r.code,
    label: r.label,
    group: r.group,
  }));

const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  signal: AbortSignal | undefined = undefined,
): Promise<unknown> => {
  let lastError: Error | undefined;

  const fetchOptions: RequestInit = {
    ...options,
    signal: signal || options.signal,
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const body = await response.json();
      return body;
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
    meta: { total: number; page: number; pageSize: number };
  };

  const allRows = [...(firstBody.results as unknown[])];
  const totalPages = Math.ceil(firstBody.meta.total / firstBody.meta.pageSize);

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      const pageBody = (await fetchWithRetry(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseBody, page }),
      })) as { results: unknown[] };
      allRows.push(...(pageBody.results as unknown[]));
    }
  }

  return allRows;
};

@Injectable()
export class UsaSpendingService {
  async fetchAgencies(): Promise<FetchAgenciesResult> {
    const url = `${API_BASE}/references/toptier_agencies/`;
    const rawData = await fetchWithRetry(url);
    const body = rawData as { results: RawUsaSpendingAgencyRow[] };

    const agencies = transformAgencyRows(body.results);

    return agencies.length > 0
      ? { status: 'success', agencies }
      : { status: 'not_found' };
  }

  async fetchSpendingByAgency(
    params: { agency: string; fiscalYear: number },
  ): Promise<FetchSpendingResult> {
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
    const transformed = transformGeoRows(rawGeo, 'recipient_location').map(
      (r) => ({
        ...r,
        id: 0,
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
    const body = {
      filters: {
        time_period: [{
          start_date: `${params.fiscalYear}-10-01`,
          end_date: `${params.fiscalYear + 1}-09-30`,
        }],
      },
      geo_layer: 'state',
      scope: params.scope,
    };

    const allRows = await fetchAllPages(
      `${API_BASE}/search/spending_by_geography/`,
      body,
    );

    const rawGeo = allRows as RawUsaSpendingGeoRow[];
    const transformed = transformGeoRows(rawGeo, params.scope);

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
          start_date: '2024-10-01',
          end_date: '2025-09-30',
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
    const transformed = transformGeoRows(rawGeo, 'recipient_location').map(
      (r) => ({
        ...r,
        id: 0,
        defGroup,
        defCodes: defGroup,
      }) as DisasterFundingRecord,
    );

    return transformed.length > 0
      ? { status: 'success', rows: transformed }
      : { status: 'not_found' };
  }

  async fetchDefCodes(): Promise<FetchDefCodesResult> {
    const url = `${API_BASE}/references/def_codes/`;
    const rawData = await fetchWithRetry(url);
    const body = rawData as { results: RawUsaSpendingDefCodeRow[] };

    const defCodes = transformDefCodeRows(body.results);

    return defCodes.length > 0
      ? { status: 'success', defCodes }
      : { status: 'not_found' };
  }
}
