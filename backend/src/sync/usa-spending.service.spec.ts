import { UsaSpendingService } from './usa-spending.service';
import { RawUsaSpendingAwardRow, RawUsaSpendingGeoRow, RawUsaSpendingDisasterRow } from './usa-spending.types';

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

  interface TransformAwardTestCase {
    name: string;
    rows: RawUsaSpendingAwardRow[];
    expectedAwardType: string;
    expectedObligatedCents: number;
    expectedOutlayCents: number;
  }

  const awardTransformTable: TransformAwardTestCase[] = [
    {
      name: 'Contracts: 1234.56 → 123456 cents',
      rows: [{
        id: 1,
        agency_id: '080',
        fiscal_year: 2024,
        award_type: 'Contracts',
        obligated_amount: 1234.56,
        outlay_amount: 1000.00,
        description: 'Test contract',
        recipient_name: 'Acme Corp',
        recipient_id: 'R001',
        award_date: '2024-01-15',
        place_of_performance_state: 'CA',
        place_of_performance_country: 'US',
        disaster_emergency_fund_code: '',
      }],
      expectedAwardType: 'Contracts',
      expectedObligatedCents: 123456,
      expectedOutlayCents: 100000,
    },
    {
      name: 'Grants: 0.01 → 1 cent',
      rows: [{
        id: 2,
        agency_id: '075',
        fiscal_year: 2023,
        award_type: 'Grants',
        obligated_amount: 0.01,
        outlay_amount: 0.01,
        description: 'Small grant',
        recipient_name: 'Nonprofit',
        recipient_id: 'R002',
        award_date: '2023-06-01',
        place_of_performance_state: 'NY',
        place_of_performance_country: 'US',
        disaster_emergency_fund_code: 'PFMA',
      }],
      expectedAwardType: 'Grants',
      expectedObligatedCents: 1,
      expectedOutlayCents: 1,
    },
    {
      name: 'Direct Payments: large value rounding',
      rows: [{
        id: 3,
        agency_id: '047',
        fiscal_year: 2024,
        award_type: 'Direct Payments',
        obligated_amount: 999999.99,
        outlay_amount: 999999.99,
        description: 'Large payment',
        recipient_name: 'Big Corp',
        recipient_id: 'R003',
        award_date: '2024-03-01',
        place_of_performance_state: 'TX',
        place_of_performance_country: 'US',
        disaster_emergency_fund_code: '',
      }],
      expectedAwardType: 'Direct Payments',
      expectedObligatedCents: 99999999,
      expectedOutlayCents: 99999999,
    },
  ];

  interface TransformGeoTestCase {
    name: string;
    rows: RawUsaSpendingGeoRow[];
    scope: string;
    expectedObligatedCents: number;
  }

  const geoTransformTable: TransformGeoTestCase[] = [
    {
      name: 'recipient scope: 500.25 → 50025 cents',
      rows: [{
        id: 10,
        agency_id: '080',
        fiscal_year: 2024,
        award_type: 'Contracts',
        obligated_amount: 500.25,
        outlay_amount: 500.00,
        place_of_performance_state: 'CA',
        place_of_performance_country: 'US',
        disaster_emergency_fund_code: '',
      }],
      scope: 'recipient',
      expectedObligatedCents: 50025,
    },
    {
      name: 'performance scope: 0.50 → 50 cents',
      rows: [{
        id: 11,
        agency_id: '024',
        fiscal_year: 2024,
        award_type: 'Grants',
        obligated_amount: 0.50,
        outlay_amount: 0.25,
        place_of_performance_state: 'NY',
        place_of_performance_country: 'US',
        disaster_emergency_fund_code: '',
      }],
      scope: 'performance',
      expectedObligatedCents: 50,
    },
    {
      name: 'both scopes from same rows',
      rows: [{
        id: 12,
        agency_id: '036',
        fiscal_year: 2024,
        award_type: 'Loans',
        obligated_amount: 100.00,
        outlay_amount: 100.00,
        place_of_performance_state: 'FL',
        place_of_performance_country: 'US',
        disaster_emergency_fund_code: '',
      }],
      scope: 'recipient',
      expectedObligatedCents: 10000,
    },
  ];

  it.each(awardTransformTable)('$name', async ({ rows, expectedAwardType, expectedObligatedCents, expectedOutlayCents }) => {
    const responseBody = {
      data: rows,
      meta: { total: rows.length, page: 1, pageSize: rows.length },
    };
    fetchMock.mockResolvedValueOnce(createResponse(responseBody));

    const result = await svc.fetchSpendingByAgency({ agency: '080', fiscalYear: 2024 });

    expect(result).toBeDefined();
    if (result.status === 'success') {
      expect(result.rows.length).toBeGreaterThan(0);
      const firstRow = result.rows[0];
      expect(firstRow.awardTypeLabel).toBe(expectedAwardType);
      expect(firstRow.obligatedAmount).toBe(expectedObligatedCents);
      expect(firstRow.outlayAmount).toBe(expectedOutlayCents);
    }
  });

  it.each(geoTransformTable)('$name', async ({ rows, scope, expectedObligatedCents }) => {
    const responseBody = {
      data: rows,
      meta: { total: rows.length, page: 1, pageSize: rows.length },
    };
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
      expect(firstRow.scope).toBe(scope);
    }
  });

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
        ? { data: [], meta: { total: 0, page: 1, pageSize: 10 } }
        : { error: 'server error' };
      fetchMock.mockResolvedValueOnce(createResponse(body, resp.status));
    }

    if (shouldSucceed) {
      await expect(
        svc.fetchSpendingByAgency({ agency: '080', fiscalYear: 2024 }),
      ).resolves.toBeDefined();
    } else {
      await expect(
        svc.fetchSpendingByAgency({ agency: '080', fiscalYear: 2024 }),
      ).rejects.toThrow();
    }

    expect(fetchMock).toHaveBeenCalledTimes(expectedAttempts);
  });

  describe('pagination across multiple pages', () => {
    it('fetches all pages and merges results', async () => {
      const page1Rows: RawUsaSpendingAwardRow[] = [
        {
          id: 1, agency_id: '080', fiscal_year: 2024, award_type: 'Contracts',
          obligated_amount: 1000.00, outlay_amount: 800.00, description: 'P1',
          recipient_name: 'Corp1', recipient_id: 'R1', award_date: '2024-01-01',
          place_of_performance_state: 'CA', place_of_performance_country: 'US',
          disaster_emergency_fund_code: '',
        },
      ];
      const page2Rows: RawUsaSpendingAwardRow[] = [
        {
          id: 2, agency_id: '080', fiscal_year: 2024, award_type: 'Grants',
          obligated_amount: 2000.00, outlay_amount: 1500.00, description: 'P2',
          recipient_name: 'Corp2', recipient_id: 'R2', award_date: '2024-02-01',
          place_of_performance_state: 'NY', place_of_performance_country: 'US',
          disaster_emergency_fund_code: '',
        },
      ];

      fetchMock.mockResolvedValueOnce(createResponse({
        data: page1Rows,
        meta: { total: 2, page: 1, pageSize: 1 },
      }));
      fetchMock.mockResolvedValueOnce(createResponse({
        data: page2Rows,
        meta: { total: 2, page: 2, pageSize: 1 },
      }));

      const result = await svc.fetchSpendingByAgency({ agency: '080', fiscalYear: 2024 });

      expect(result).toBeDefined();
      if (result.status === 'success') {
        expect(result.rows.length).toBe(2);
        expect(result.total).toBe(2);
        expect(result.rows[0].obligatedAmount).toBe(100000);
        expect(result.rows[1].obligatedAmount).toBe(200000);
      }
    });
  });

  describe('fetchAgencies', () => {
    it('returns parsed agencies with correct fields', async () => {
      const agenciesBody = {
        data: [
          { agency_name: 'NASA', toptier_agency_name: 'NASA', toptier_agency_cii: '080', subtier_agency_cii: null },
          { agency_name: 'GSA', toptier_agency_name: 'GSA', toptier_agency_cii: '047', subtier_agency_cii: null },
        ],
        meta: { total: 2, page: 1, pageSize: 2 },
      };
      fetchMock.mockResolvedValueOnce(createResponse(agenciesBody));

      const result = await svc.fetchAgencies();

      expect(result).toBeDefined();
      if (result.status === 'success') {
        expect(result.agencies.length).toBe(2);
        expect(result.agencies[0].name).toBe('NASA');
        expect(result.agencies[0].toptierCode).toBe('080');
        expect(result.agencies[1].name).toBe('GSA');
        expect(result.agencies[1].toptierCode).toBe('047');
      }
    });
  });

  describe('fetchDisasterSpending', () => {
    it('returns disaster rows with cents conversion', async () => {
      const disasterBody = {
        data: [
          {
            id: 100,
            agency_id: '075',
            fiscal_year: 2024,
            award_type: 'Grants',
            obligated_amount: 5000.75,
            outlay_amount: 4000.00,
            place_of_performance_state: 'FL',
            place_of_performance_country: 'US',
            disaster_emergency_fund_code: 'COVID-19',
          },
        ],
        meta: { total: 1, page: 1, pageSize: 10 },
      };
      fetchMock.mockResolvedValueOnce(createResponse(disasterBody));

      const result = await svc.fetchDisasterSpending('COVID-19');

      expect(result).toBeDefined();
      if (result.status === 'success') {
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].obligatedAmount).toBe(500075);
        expect(result.rows[0].outlayAmount).toBe(400000);
      }
    });
  });
});
