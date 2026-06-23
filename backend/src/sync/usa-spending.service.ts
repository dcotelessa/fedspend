import { Injectable } from '@nestjs/common';
import { Agency } from '../agencies/agency.entity';
import { SpendingRecord } from '../spending/spending-record.entity';
import { GeoSpendingSnapshot } from '../geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from '../disaster/disaster-funding-record.entity';
import {
  RawUsaSpendingAwardRow,
  RawUsaSpendingGeoRow,
  RawUsaSpendingDisasterRow,
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

const transformAwardRows = (
  rows: RawUsaSpendingAwardRow[],
): SpendingRecord[] =>
  rows.map((r) => ({
    id: 0,
    agencyId: parseInt(r.agency_id, 10) || 0,
    fiscalYear: r.fiscal_year,
    quarter: 1,
    awardTypeLabel: r.award_type,
    awardTypeCodes: '',
    obligatedAmount: Math.round(r.obligated_amount * 100),
    outlayAmount: Math.round(r.outlay_amount * 100),
    awardCount: 1,
    agency: null as any,
  })) as SpendingRecord[];

const transformGeoRows = (
  rows: RawUsaSpendingGeoRow[],
  scope: string,
): GeoSpendingSnapshot[] =>
  rows.map((r) => ({
    id: 0,
    stateCode: r.place_of_performance_state || '',
    stateName: r.place_of_performance_state || '',
    fiscalYear: r.fiscal_year,
    agencyId: parseInt(r.agency_id, 10) || 0,
    scope,
    obligatedAmount: Math.round(r.obligated_amount * 100),
    awardCount: 1,
    population: 0,
    perCapita: 0,
    agency: null as any,
  })) as GeoSpendingSnapshot[];

const transformDisasterRows = (
  rows: RawUsaSpendingDisasterRow[],
): DisasterFundingRecord[] =>
  rows.map((r) => ({
    id: 0,
    defGroup: r.disaster_emergency_fund_code,
    defCodes: r.disaster_emergency_fund_code,
    stateCode: r.place_of_performance_state || '',
    stateName: r.place_of_performance_state || '',
    obligatedAmount: Math.round(r.obligated_amount * 100),
    outlayAmount: Math.round(r.outlay_amount * 100),
    awardCount: 1,
    perCapita: 0,
    population: 0,
  }));

const fetchWithRetry = async (
  url: string,
  signal: AbortSignal | undefined = undefined,
): Promise<unknown> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { signal });

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
): Promise<unknown[]> => {
  const firstBody = (await fetchWithRetry(baseUrl)) as {
    data: unknown[];
    meta: { total: number; page: number; pageSize: number };
  };

  const allRows = [...(firstBody.data as unknown[])];
  const totalPages = Math.ceil(firstBody.meta.total / firstBody.meta.pageSize);

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      const pageUrl = `${baseUrl}&page=${page}`;
      const pageBody = (await fetchWithRetry(pageUrl)) as {
        data: unknown[];
      };
      allRows.push(...(pageBody.data as unknown[]));
    }
  }

  return allRows;
};

@Injectable()
export class UsaSpendingService {
  async fetchAgencies(): Promise<FetchAgenciesResult> {
    const url = `${API_BASE}/subtier_agencies/?limit=1000`;
    const rawData = await fetchWithRetry(url);
    const body = rawData as {
      data: {
        agency_name: string;
        toptier_agency_cii: string;
        subtier_agency_cii: string | null;
      }[];
      meta: { total: number; page: number; pageSize: number };
    };

    const agencies: Agency[] = body.data.map((a) => ({
      id: 0,
      name: a.agency_name || '',
      abbreviation: a.agency_name || '',
      toptierCode: a.toptier_agency_cii,
    }));

    return agencies.length > 0
      ? { status: 'success', agencies }
      : { status: 'not_found' };
  }

  async fetchSpendingByAgency(
    params: { agency: string; fiscalYear: number },
  ): Promise<FetchSpendingResult> {
    const baseUrl = `${API_BASE}/awards/?agency_type=2&agency_id=${params.agency}&fiscal_year=${params.fiscalYear}&limit=100`;
    const allRows = await fetchAllPages(baseUrl);

    const rawAwards = allRows as RawUsaSpendingAwardRow[];
    const transformed = transformAwardRows(rawAwards);

    return transformed.length > 0
      ? {
          status: 'success',
          rows: transformed,
          total: rawAwards.length,
        }
      : { status: 'not_found' };
  }

  async fetchGeoSnapshots(
    params: { agency: string; fiscalYear: number; scope: string },
  ): Promise<FetchGeoResult> {
    const scopeParam =
      params.scope === 'recipient'
        ? 'place_of_performance'
        : 'place_of_performance';
    const baseUrl = `${API_BASE}/awards/?agency_type=2&agency_id=${params.agency}&fiscal_year=${params.fiscalYear}&limit=100`;
    const allRows = await fetchAllPages(baseUrl);

    const rawRows = allRows as RawUsaSpendingGeoRow[];
    const transformed = transformGeoRows(rawRows, params.scope);

    return transformed.length > 0
      ? { status: 'success', rows: transformed }
      : { status: 'not_found' };
  }

  async fetchDisasterSpending(
    defGroup: string,
  ): Promise<FetchDisasterResult> {
    const baseUrl = `${API_BASE}/awards/?disaster_emergency_fund_code=${defGroup}&limit=100`;
    const allRows = await fetchAllPages(baseUrl);

    const rawRows = allRows as RawUsaSpendingDisasterRow[];
    const transformed = transformDisasterRows(rawRows);

    return transformed.length > 0
      ? { status: 'success', rows: transformed }
      : { status: 'not_found' };
  }
}
