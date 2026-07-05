import { UsaSpendingService } from './usa-spending.service';
import { RawUsaSpendingAgencyRow, RawUsaSpendingGeoRow } from './usa-spending.types';

describe('UsaSpendingService', () => {
  let fetchMock: jest.SpyInstance;
  let svc: UsaSpendingService;

  beforeEach(() => {
    svc = new UsaSpendingService();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  interface AgencyTransformTestCase {
    name: string;
    rows: RawUsaSpendingAgencyRow[];
    expectedName: string;
    expectedToptierCode: string;
    expectedAbbreviation: string;
  }

  const agencyTransformTable: AgencyTransformTestCase[] = [
    {
      name: 'maps agency_name, toptier_code, abbreviation correctly',
      rows: [{
        agency_name: 'NASA',
        toptier_code: '080',
        abbreviation: 'NASA',
      }],
      expectedName: 'NASA',
      expectedToptierCode: '080',
      expectedAbbreviation: 'NASA',
    },
    {
      name: 'handles empty abbreviation',
      rows: [{
        agency_name: 'Department of Interior',
        toptier_code: '049',
        abbreviation: '',
      }],
      expectedName: 'Department of Interior',
      expectedToptierCode: '049',
      expectedAbbreviation: '',
    },
    {
      name: 'falls back to empty string when agency_name is missing',
      rows: [{
        agency_name: '',
        toptier_code: '097',
        abbreviation: 'DOE',
      }],
      expectedName: '',
      expectedToptierCode: '097',
      expectedAbbreviation: 'DOE',
    },
  ];

  interface GeoTransformTestCase {
    name: string;
    rows: RawUsaSpendingGeoRow[];
    scope: string;
    expectedObligatedCents: number;
    expectedStateCode: string;
  }

  const geoTransformTable: GeoTransformTestCase[] = [
    {
      name: 'recipient scope: 1234.56 → 123456 cents',
      rows: [{
        shape_code: 'CA',
        display_name: 'California', population: 39538223, per_capita: 5000.5,
        aggregated_amount: 1234.56,
      }],
      scope: 'recipient_location',
      expectedObligatedCents: 123456,
      expectedStateCode: 'CA',
    },
    {
      name: 'performance scope: 0.01 → 1 cent',
      rows: [{
        shape_code: 'NY',
        display_name: 'New York', population: 20201249, per_capita: 3000.3,
        aggregated_amount: 0.01,
      }],
      scope: 'performance_location',
      expectedObligatedCents: 1,
      expectedStateCode: 'NY',
    },
    {
      name: 'zero amount → 0 cents',
      rows: [{
        shape_code: 'TX',
        display_name: 'Texas', population: 29145505, per_capita: 2000.2,
        aggregated_amount: 0,
      }],
      scope: 'recipient_location',
      expectedObligatedCents: 0,
      expectedStateCode: 'TX',
    },
    {
      name: 'rounds fractional cents: 1234.567 → 123457 cents',
      rows: [{
        shape_code: 'CA',
        display_name: 'California', population: 39538223, per_capita: 5000.5,
        aggregated_amount: 1234.567,
      }],
      scope: 'recipient_location',
      expectedObligatedCents: 123457,
      expectedStateCode: 'CA',
    },
    {
      name: 'missing shape_code and population fall back to safe defaults',
      rows: [{ display_name: 'Unknown', aggregated_amount: 50.25 } as RawUsaSpendingGeoRow],
      scope: 'recipient_location',
      expectedObligatedCents: 5025,
      expectedStateCode: '',
    },
  ];

  it.each(agencyTransformTable)('$name', async ({ rows, expectedName, expectedToptierCode, expectedAbbreviation }) => {
    const responseBody = { results: rows };
    fetchMock.mockResolvedValueOnce(createResponse(responseBody));

    const result = await svc.fetchAgencies();

    expect(result).toBeDefined();
    if (result.status === 'success') {
      expect(result.agencies.length).toBeGreaterThan(0);
      const firstAgency = result.agencies[0];
      expect(firstAgency.name).toBe(expectedName);
      expect(firstAgency.toptierCode).toBe(expectedToptierCode);
      expect(firstAgency.abbreviation).toBe(expectedAbbreviation);
    }
  });

  it.each(geoTransformTable)('$name', async ({ rows, scope, expectedObligatedCents, expectedStateCode }) => {
    const responseBody = { results: rows, meta: { total: rows.length, page: 1, pageSize: rows.length } };
    fetchMock.mockResolvedValueOnce(createResponse(responseBody));

    const result = await svc.fetchGeoSnapshots({
      agency: '080',
      fiscalYear: 2024,
      scope,
    });

    expect(result).toBeDefined();
    if (result.status === 'success') {
      expect(result.rows.length).toBeGreaterThan(0);
      const firstRow = result.rows[0];
      expect(firstRow.obligatedAmount).toBe(expectedObligatedCents);
      expect(firstRow.stateCode).toBe(expectedStateCode);
      expect(firstRow.scope).toBe(scope);
    }
  });

  interface GeoAgencyFilterTestCase {
    name: string;
    agency: string;
    agencyId: number | null;
    expectAgenciesFilter: boolean;
    expectedAgencyId: number | null;
  }

  const geoAgencyFilterTable: GeoAgencyFilterTestCase[] = [
    {
      name: 'rollup (empty agency) omits the agencies filter and stores agencyId null',
      agency: '',
      agencyId: null,
      expectAgenciesFilter: false,
      expectedAgencyId: null,
    },
    {
      name: 'per-agency fetch includes awarding toptier filter and stores agencyId on rows',
      agency: '080',
      agencyId: 30,
      expectAgenciesFilter: true,
      expectedAgencyId: 30,
    },
  ];

  it.each(geoAgencyFilterTable)('$name', async ({ agency, agencyId, expectAgenciesFilter, expectedAgencyId }) => {
    const responseBody = {
      results: [{ shape_code: 'CA', display_name: 'California', population: 39538223, per_capita: 5000.5, aggregated_amount: 100 }],
      meta: { total: 1, page: 1, pageSize: 1 },
    };
    fetchMock.mockResolvedValueOnce(createResponse(responseBody));

    const result = await svc.fetchGeoSnapshots({ agency, fiscalYear: 2024, scope: 'recipient', agencyId });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    if (expectAgenciesFilter) {
      expect(body.filters.awarding_agencies).toEqual([{ toptier_code: agency, tier: 'toptier' }]);
    } else {
      expect(body.filters.awarding_agencies).toBeUndefined();
    }
    expect(result.status).toBe('success');
    expect(result.rows[0].agencyId).toBe(expectedAgencyId);
  });

  describe('POST method usage', () => {
    it('uses POST for geography endpoint', async () => {
      const responseBody = { results: [], meta: { total: 0, page: 1, pageSize: 10 } };
      fetchMock.mockResolvedValueOnce(createResponse(responseBody));

      await svc.fetchSpendingByAgency({
        toptierCode: '080',
        fiscalYear: 2024,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/search/spending_by_geography/'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('uses POST for disaster endpoint', async () => {
      const responseBody = { results: [], meta: { total: 0, page: 1, pageSize: 10 } };
      fetchMock.mockResolvedValueOnce(createResponse(responseBody));

      await svc.fetchDisasterSpending('L');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/search/spending_by_geography/'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('uses GET for agencies endpoint', async () => {
      const responseBody = { results: [] };
      fetchMock.mockResolvedValueOnce(createResponse(responseBody));

      await svc.fetchAgencies();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/references/toptier_agencies/'),
        expect.not.objectContaining({ method: 'POST' }),
      );
    });

    it('uses GET for def codes endpoint', async () => {
      const responseBody = { codes: [] };
      fetchMock.mockResolvedValueOnce(createResponse(responseBody));

      await svc.fetchDefCodes();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/references/def_codes/'),
        expect.not.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('pagination via POST body', () => {
    it('paginates using page in POST body', async () => {
      const page1Rows: RawUsaSpendingGeoRow[] = [{
        shape_code: 'CA',
        display_name: 'California', population: 39538223, per_capita: 5000.5,
        aggregated_amount: 1000.00,
      }];
      const page2Rows: RawUsaSpendingGeoRow[] = [{
        shape_code: 'NY',
        display_data: { state: 'NY' },
        aggregated_amount: 2000.00,
      }];

      fetchMock.mockResolvedValueOnce(createResponse({
        results: page1Rows,
        page_metadata: { has_next: true, page: 1 },
      }));
      fetchMock.mockResolvedValueOnce(createResponse({
        results: page2Rows,
        page_metadata: { has_next: false, page: 2 },
      }));

      const result = await svc.fetchSpendingByAgency({
        toptierCode: '080',
        fiscalYear: 2024,
      });

      expect(result).toBeDefined();
      if (result.status === 'success') {
        expect(result.rows.length).toBe(2);
        expect(result.rows[0].obligatedAmount).toBe(100000);
        expect(result.rows[1].obligatedAmount).toBe(200000);
      }

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const secondCall = fetchMock.mock.calls[1];
      const secondBody = JSON.parse(secondCall[1].body as string);
      expect(secondBody.page).toBe(2);
    });
  });

  describe('retry logic', () => {
    interface RetryTestCase {
      name: string;
      responses: { status: number }[];
      shouldSucceed: boolean;
      expectedAttempts: number;
    }

    const retryTable: RetryTestCase[] = [
      {
        name: 'HTTP 500 then 200 → retry succeeds on attempt 2',
        responses: [
          { status: 500 },
          { status: 200 },
        ],
        shouldSucceed: true,
        expectedAttempts: 2,
      },
      {
        name: 'HTTP 500 thrice → throws after 3 attempts',
        responses: [
          { status: 500 },
          { status: 500 },
          { status: 500 },
        ],
        shouldSucceed: false,
        expectedAttempts: 3,
      },
      {
        name: 'HTTP 200 first try → no retry needed',
        responses: [
          { status: 200 },
        ],
        shouldSucceed: true,
        expectedAttempts: 1,
      },
    ];

    it.each(retryTable)('$name', async ({ responses, shouldSucceed, expectedAttempts }) => {
      for (const resp of responses) {
        const body = resp.status === 200
          ? { results: [] }
          : { error: 'server error' };
        fetchMock.mockResolvedValueOnce(createResponse(body, resp.status));
      }

      if (shouldSucceed) {
        await expect(
          svc.fetchSpendingByAgency({ toptierCode: '080', fiscalYear: 2024 }),
        ).resolves.toBeDefined();
      } else {
        await expect(
          svc.fetchSpendingByAgency({ toptierCode: '080', fiscalYear: 2024 }),
        ).rejects.toThrow();
      }

      expect(fetchMock).toHaveBeenCalledTimes(expectedAttempts);
    });
  });

  describe('disaster def_codes filter', () => {
    it('includes def_codes in POST body for disaster queries', async () => {
      const responseBody = { results: [], meta: { total: 0, page: 1, pageSize: 10 } };
      fetchMock.mockResolvedValueOnce(createResponse(responseBody));

      await svc.fetchDisasterSpending('L');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call[1].body as string);
      expect(body.filters.def_codes).toContain('L');
    });
  });

  interface FetchSpendingByAgencyTestCase {
    name: string;
    toptierCode: string;
    fiscalYear: number;
    responseBody: unknown;
    expectedStatus: string;
    expectedUrl?: string;
    expectedBody?: Record<string, unknown>;
    expectedRowCount?: number;
  }

  const spendingByAgencyTable: FetchSpendingByAgencyTestCase[] = [
    {
      name: 'includes toptier_code in agencies filter',
      toptierCode: '097',
      fiscalYear: 2024,
      responseBody: { results: [] },
      expectedStatus: 'not_found',
      expectedUrl: '/search/spending_by_geography/',
      expectedBody: {
        filters: {
          time_period: [{
            start_date: '2024-10-01',
            end_date: '2025-09-30',
          }],
          agencies: [{
            type: 'awarding',
            tier: 'toptier',
            toptier_code: '097',
          }],
        },
        geo_layer: 'state',
      },
    },
    {
      name: 'returns success with rows and total when data exists',
      toptierCode: '080',
      fiscalYear: 2025,
      responseBody: {
        results: [
          { shape_code: 'CA', aggregated_amount: 1234.56 },
          { shape_code: 'NY', aggregated_amount: 789.01 },
        ],
      },
      expectedStatus: 'success',
      expectedUrl: '/search/spending_by_geography/',
      expectedRowCount: 2,
    },
    {
      name: 'sets fiscal year time period from input',
      toptierCode: '049',
      fiscalYear: 2023,
      responseBody: { results: [] },
      expectedStatus: 'not_found',
      expectedBody: {
        filters: {
          time_period: [{
            start_date: '2023-10-01',
            end_date: '2024-09-30',
          }],
          agencies: [{
            type: 'awarding',
            tier: 'toptier',
            toptier_code: '049',
          }],
        },
        geo_layer: 'state',
      },
    },
    {
      name: 'uses recipient_location as scope',
      toptierCode: '019',
      fiscalYear: 2024,
      responseBody: { results: [] },
      expectedStatus: 'not_found',
      expectedUrl: '/search/spending_by_geography/',
    },
  ];

  it.each(spendingByAgencyTable)('$name', async ({ toptierCode, fiscalYear, responseBody, expectedStatus, expectedUrl, expectedBody, expectedRowCount }) => {
    fetchMock.mockResolvedValueOnce(createResponse(responseBody));

    const result = await svc.fetchSpendingByAgency({ toptierCode, fiscalYear });

    expect(result).toBeDefined();
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1].body as string);

    if (expectedUrl) {
      expect((call[0] as string)).toContain(expectedUrl);
    }

    if (expectedBody) {
      const expectedKeys = Object.keys(expectedBody);
      for (const key of expectedKeys) {
        if (typeof expectedBody[key] === 'object') {
          expect(body[key]).toEqual(expectedBody[key]);
        } else {
          expect(body[key]).toBe(expectedBody[key]);
        }
      }
    }

    if (expectedStatus === 'success') {
      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.rows.length).toBe(expectedRowCount);
      }
    } else {
      expect(result.status).toBe('not_found');
    }
  });

  describe('def codes endpoint', () => {
    it('fetches def codes from /references/def_codes/', async () => {
      const responseBody = {
        codes: [
          { code: 'L', label: 'CARES', group: 'COVID-19' },
          { code: 'PFMA', label: 'Pandemic', group: 'Natural Disaster' },
        ],
      };
      fetchMock.mockResolvedValueOnce(createResponse(responseBody));

      const result = await svc.fetchDefCodes();

      expect(result).toBeDefined();
      if (result.status === 'success') {
        expect(result.defCodes.length).toBe(2);
        expect(result.defCodes[0].code).toBe('L');
        expect(result.defCodes[0].label).toBe('CARES');
        expect(result.defCodes[1].code).toBe('PFMA');
      }
    });
  });

  describe('not_found status', () => {
    it('returns not_found when no results', async () => {
      fetchMock.mockResolvedValueOnce(createResponse({ results: [] }));

      const result = await svc.fetchAgencies();

      expect(result).toEqual({ status: 'not_found' });
    });
  });
});
