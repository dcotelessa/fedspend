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
      name: 'per-agency fetch includes filters.agencies (name-based) and stores agencyId on rows',
      agency: 'National Aeronautics and Space Administration',
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
      expect(body.filters.agencies).toEqual([{ type: 'awarding', tier: 'toptier', toptier_name: agency, name: agency }]);
    } else {
      expect(body.filters.agencies).toBeUndefined();
    }
    expect(result.status).toBe('success');
    expect(result.rows[0].agencyId).toBe(expectedAgencyId);
  });

  describe('POST method usage', () => {
    it('uses POST for geography endpoint', async () => {
      const responses = AWARD_TYPES.map(() => ({ results: [], meta: { total: 0, page: 1, pageSize: 10 } }));
      for (const resp of responses) {
        fetchMock.mockResolvedValueOnce(createResponse(resp));
      }

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

      await svc.fetchDisasterSpending(['L'], 'COVID-19');

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

      // 5 responses: page 1 triggers page 2 for first type, rest stop at page 1
      const page1WithNext = createResponse({
        results: page1Rows,
        page_metadata: { has_next: true, page: 1 },
      });
      const page2Rows = [{
        shape_code: 'NY',
        display_data: { state: 'NY' },
        aggregated_amount: 2000.00,
      }];
      const page2Stop = createResponse({
        results: page2Rows,
        page_metadata: { has_next: false, page: 2 },
      });
      const remaining: Response[] = AWARD_TYPES.slice(1).map(() =>
        createResponse({ results: page1Rows, page_metadata: { has_next: false, page: 1 } }),
      );
      const responses: Response[] = [page1WithNext, page2Stop, ...remaining];
      for (const resp of responses) {
        fetchMock.mockResolvedValueOnce(resp);
      }

      const result = await svc.fetchSpendingByAgency({
        toptierCode: '080',
        fiscalYear: 2024,
      });

      expect(result).toBeDefined();
      if (result.status === 'success') {
        expect(result.rows.length).toBe(6);
        expect(result.rows[0].obligatedAmount).toBe(100000);
        expect(result.rows[1].obligatedAmount).toBe(200000);
      }

      expect(fetchMock).toHaveBeenCalledTimes(6);
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
          { status: 200 },
          { status: 200 },
          { status: 200 },
          { status: 200 },
        ],
        shouldSucceed: true,
        expectedAttempts: 6,
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
          { status: 200 },
          { status: 200 },
          { status: 200 },
          { status: 200 },
        ],
        shouldSucceed: true,
        expectedAttempts: 5,
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

      await svc.fetchDisasterSpending(['L', 'M', 'N'], 'COVID-19');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call[1].body as string);
      expect(body.filters.def_codes).toEqual(['L', 'M', 'N']);
    });
  });

  const AWARD_TYPES = ['Contracts', 'Grants', 'Direct Payments', 'Loans', 'IDVs'];
  const AWARD_TYPE_TO_INDEX: Record<string, number> = {
    'Contracts': 0,
    'Grants': 1,
    'Direct Payments': 2,
    'Loans': 3,
    'IDVs': 4,
  };

  interface FetchSpendingByAgencyTestCase {
    name: string;
    toptierCode: string;
    fiscalYear: number;
    responses: Record<string, unknown>[];
    expectedStatus: string;
    expectedUrl?: string;
    expectedBody?: Record<string, unknown>;
    expectedRowCount?: number;
    expectedObligatedCents?: number;
    expectedLabels?: string[];
    expectedCallIndex?: number;
  }

  const spendingByAgencyTable: FetchSpendingByAgencyTestCase[] = [
    {
      name: 'iterates over all AWARD_TYPES sending one filter per type',
      toptierCode: '097',
      fiscalYear: 2024,
      responses: AWARD_TYPES.map(t => ({ results: [] })),
      expectedStatus: 'not_found',
      expectedUrl: '/search/spending_by_geography/',
      expectedRowCount: 0,
    },
    {
      name: 'sends filters.award_type = C for Contracts',
      toptierCode: '097',
      fiscalYear: 2024,
      responses: AWARD_TYPES.map(() => ({ results: [] })),
      expectedStatus: 'not_found',
      expectedBody: {
        filters: {
          time_period: [{
            start_date: '2024-10-01',
            end_date: '2025-09-30',
          }],
          awarding_agencies: [{
            toptier_code: '097',
            tier: 'toptier',
          }],
          award_type: 'C',
        },
        geo_layer: 'state',
      },
      expectedCallIndex: 0,
    },
    {
      name: 'sends filters.award_type = G for Grants',
      toptierCode: '097',
      fiscalYear: 2024,
      responses: AWARD_TYPES.map(() => ({ results: [] })),
      expectedStatus: 'not_found',
      expectedBody: {
        filters: {
          time_period: [{
            start_date: '2024-10-01',
            end_date: '2025-09-30',
          }],
          awarding_agencies: [{
            toptier_code: '097',
            tier: 'toptier',
          }],
          award_type: 'G',
        },
        geo_layer: 'state',
      },
      expectedCallIndex: 1,
    },
    {
      name: 'sends filters.award_type = DP for Direct Payments',
      toptierCode: '097',
      fiscalYear: 2024,
      responses: AWARD_TYPES.map(() => ({ results: [] })),
      expectedStatus: 'not_found',
      expectedBody: {
        filters: {
          time_period: [{
            start_date: '2024-10-01',
            end_date: '2025-09-30',
          }],
          awarding_agencies: [{
            toptier_code: '097',
            tier: 'toptier',
          }],
          award_type: 'DP',
        },
        geo_layer: 'state',
      },
      expectedCallIndex: 2,
    },
    {
      name: 'sends filters.award_type = L for Loans',
      toptierCode: '097',
      fiscalYear: 2024,
      responses: AWARD_TYPES.map(() => ({ results: [] })),
      expectedStatus: 'not_found',
      expectedBody: {
        filters: {
          time_period: [{
            start_date: '2024-10-01',
            end_date: '2025-09-30',
          }],
          awarding_agencies: [{
            toptier_code: '097',
            tier: 'toptier',
          }],
          award_type: 'L',
        },
        geo_layer: 'state',
      },
      expectedCallIndex: 3,
    },
    {
      name: 'sends filters.award_type = I for IDVs',
      toptierCode: '097',
      fiscalYear: 2024,
      responses: AWARD_TYPES.map(() => ({ results: [] })),
      expectedStatus: 'not_found',
      expectedBody: {
        filters: {
          time_period: [{
            start_date: '2024-10-01',
            end_date: '2025-09-30',
          }],
          awarding_agencies: [{
            toptier_code: '097',
            tier: 'toptier',
          }],
          award_type: 'I',
        },
        geo_layer: 'state',
      },
      expectedCallIndex: 4,
    },
    {
      name: 'returns success with rows and total when data exists',
      toptierCode: '080',
      fiscalYear: 2025,
      responses: [{
        results: [
          { shape_code: 'CA', aggregated_amount: 1234.56 },
          { shape_code: 'NY', aggregated_amount: 789.01 },
        ],
      }, ...Array(4).fill({ results: [] })],
      expectedStatus: 'success',
      expectedUrl: '/search/spending_by_geography/',
      expectedRowCount: 2,
    },
    {
      name: 'sets fiscal year time period from input',
      toptierCode: '049',
      fiscalYear: 2023,
      responses: AWARD_TYPES.map(() => ({ results: [] })),
      expectedStatus: 'not_found',
      expectedBody: {
        filters: {
          time_period: [{
            start_date: '2023-10-01',
            end_date: '2024-09-30',
          }],
          awarding_agencies: [{
            toptier_code: '049',
            tier: 'toptier',
          }],
          award_type: 'C',
        },
        geo_layer: 'state',
      },
      expectedCallIndex: 0,
    },
    {
      name: 'uses recipient_location as scope',
      toptierCode: '019',
      fiscalYear: 2024,
      responses: AWARD_TYPES.map(() => ({ results: [] })),
      expectedStatus: 'not_found',
      expectedUrl: '/search/spending_by_geography/',
    },
    {
      name: 'stamps each row with the correct awardTypeLabel from the award type',
      toptierCode: '080',
      fiscalYear: 2024,
      responses: AWARD_TYPES.map((type, idx) => ({
        results: [
          { shape_code: 'CA', aggregated_amount: 100 + idx },
        ],
      })),
      expectedStatus: 'success',
      expectedRowCount: 5,
      expectedLabels: ['Contracts', 'Grants', 'Direct Payments', 'Loans', 'IDVs'],
    },
    {
      name: 'rounds aggregated_amount to integer cents on each spending row',
      toptierCode: '080',
      fiscalYear: 2024,
      responses: [
        { results: [{ shape_code: 'CA', aggregated_amount: 123.45 }] },
        ...AWARD_TYPES.slice(1).map(() => ({ results: [] })),
      ],
      expectedStatus: 'success',
      expectedRowCount: 1,
      expectedObligatedCents: 12345,
      expectedLabels: ['Contracts'],
    },
    {
      name: 'preserves award-type order when only middle types return data',
      toptierCode: '080',
      fiscalYear: 2024,
      responses: AWARD_TYPES.map((t) =>
        t === 'Contracts' || t === 'Loans'
          ? { results: [{ shape_code: 'CA', aggregated_amount: 10 }] }
          : { results: [] },
      ),
      expectedStatus: 'success',
      expectedRowCount: 2,
      expectedLabels: ['Contracts', 'Loans'],
    },
  ];

  it.each(spendingByAgencyTable)('$name', async ({ toptierCode, fiscalYear, responses, expectedStatus, expectedUrl, expectedBody, expectedRowCount, expectedObligatedCents, expectedLabels, expectedCallIndex }) => {
    for (const resp of responses) {
      fetchMock.mockResolvedValueOnce(createResponse(resp));
    }

    const result = await svc.fetchSpendingByAgency({ toptierCode, fiscalYear });

    expect(result).toBeDefined();

    let call: any;
    if (expectedCallIndex !== undefined) {
      call = fetchMock.mock.calls[expectedCallIndex];
    } else {
      call = fetchMock.mock.calls[0];
    }
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

    if (expectedObligatedCents !== undefined && result.status === 'success') {
      expect(result.rows[0].obligatedAmount).toBe(expectedObligatedCents);
    }

    if (expectedLabels) {
      for (let i = 0; i < expectedLabels.length && i < result.rows.length; i++) {
        expect(result.rows[i].awardTypeLabel).toBe(expectedLabels[i]);
      }
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
