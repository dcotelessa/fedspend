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
        shape_code: '06',
        display_data: { state: 'CA', state_name: 'California' },
        aggregated_amount: 1234.56,
      }],
      scope: 'recipient_location',
      expectedObligatedCents: 123456,
      expectedStateCode: 'CA',
    },
    {
      name: 'performance scope: 0.01 → 1 cent',
      rows: [{
        shape_code: '36',
        display_data: { state: 'NY', state_name: 'New York' },
        aggregated_amount: 0.01,
      }],
      scope: 'performance_location',
      expectedObligatedCents: 1,
      expectedStateCode: 'NY',
    },
    {
      name: 'zero amount → 0 cents',
      rows: [{
        shape_code: '48',
        display_data: { state: 'TX', state_name: 'Texas' },
        aggregated_amount: 0,
      }],
      scope: 'recipient_location',
      expectedObligatedCents: 0,
      expectedStateCode: 'TX',
    },
    {
      name: 'rounds fractional cents: 1234.567 → 123457 cents',
      rows: [{
        shape_code: '06',
        display_data: { state: 'CA', state_name: 'California' },
        aggregated_amount: 1234.567,
      }],
      scope: 'recipient_location',
      expectedObligatedCents: 123457,
      expectedStateCode: 'CA',
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

  describe('POST method usage', () => {
    it('uses POST for geography endpoint', async () => {
      const responseBody = { results: [], meta: { total: 0, page: 1, pageSize: 10 } };
      fetchMock.mockResolvedValueOnce(createResponse(responseBody));

      await svc.fetchGeoSnapshots({
        agency: '080',
        fiscalYear: 2024,
        scope: 'recipient_location',
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
      const responseBody = { results: [] };
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
        shape_code: '06',
        display_data: { state: 'CA' },
        aggregated_amount: 1000.00,
      }];
      const page2Rows: RawUsaSpendingGeoRow[] = [{
        shape_code: '36',
        display_data: { state: 'NY' },
        aggregated_amount: 2000.00,
      }];

      fetchMock.mockResolvedValueOnce(createResponse({
        results: page1Rows,
        meta: { total: 2, page: 1, pageSize: 1 },
      }));
      fetchMock.mockResolvedValueOnce(createResponse({
        results: page2Rows,
        meta: { total: 2, page: 2, pageSize: 1 },
      }));

      const result = await svc.fetchGeoSnapshots({
        agency: '080',
        fiscalYear: 2024,
        scope: 'recipient_location',
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
          ? { results: [], meta: { total: 0, page: 1, pageSize: 10 } }
          : { error: 'server error' };
        fetchMock.mockResolvedValueOnce(createResponse(body, resp.status));
      }

      if (shouldSucceed) {
        await expect(
          svc.fetchGeoSnapshots({ agency: '080', fiscalYear: 2024, scope: 'recipient_location' }),
        ).resolves.toBeDefined();
      } else {
        await expect(
          svc.fetchGeoSnapshots({ agency: '080', fiscalYear: 2024, scope: 'recipient_location' }),
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

  describe('def codes endpoint', () => {
    it('fetches def codes from /references/def_codes/', async () => {
      const responseBody = {
        results: [
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
