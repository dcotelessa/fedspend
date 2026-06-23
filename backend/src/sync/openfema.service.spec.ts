import { OpenFemaService } from './openfema.service';

describe('OpenFemaService.fetchDeclarationsByState', () => {
  interface TestCase {
    name: string;
    mockResponse: {
      data: Array<{
        incidentType: string;
        state: string;
        stateName: string;
        declarationDate: string;
        obligatedAmount: number;
      }>;
      meta: { total: number; page: number; pageSize: number };
    };
    mockPages?: Array<{
      data: Array<{
        incidentType: string;
        state: string;
        stateName: string;
        declarationDate: string;
        obligatedAmount: number;
      }>;
      meta: { total: number; page: number; pageSize: number };
    }>;
    expected: Array<{
      stateCode: string;
      stateName: string;
      fiscalYear: number;
      femaObligatedCents: number;
      declarationCount: number;
      dominantIncidentType: string;
    }>;
  }

  const testTable: TestCase[] = [
    {
      name: 'groups declarations by state and fiscal year',
      mockResponse: {
        data: [
          {
            incidentType: 'Wildfire',
            state: 'CA',
            stateName: 'California',
            declarationDate: '2024-07-15',
            obligatedAmount: 500000,
          },
          {
            incidentType: 'Wildfire',
            state: 'CA',
            stateName: 'California',
            declarationDate: '2024-08-20',
            obligatedAmount: 300000,
          },
          {
            incidentType: 'Flood',
            state: 'CA',
            stateName: 'California',
            declarationDate: '2024-09-10',
            obligatedAmount: 200000,
          },
          {
            incidentType: 'Flood',
            state: 'TX',
            stateName: 'Texas',
            declarationDate: '2024-06-01',
            obligatedAmount: 1000000,
          },
        ],
        meta: { total: 4, page: 1, pageSize: 100 },
      },
      expected: [
        {
          stateCode: 'CA',
          stateName: 'California',
          fiscalYear: 2024,
          femaObligatedCents: 100000000,
          declarationCount: 3,
          dominantIncidentType: 'Wildfire',
        },
        {
          stateCode: 'TX',
          stateName: 'Texas',
          fiscalYear: 2024,
          femaObligatedCents: 100000000,
          declarationCount: 1,
          dominantIncidentType: 'Flood',
        },
      ],
    },
    {
      name: 'dominant incident type is the mode across declarations',
      mockResponse: {
        data: [
          {
            incidentType: 'Flood',
            state: 'FL',
            stateName: 'Florida',
            declarationDate: '2023-09-01',
            obligatedAmount: 50000,
          },
          {
            incidentType: 'Flood',
            state: 'FL',
            stateName: 'Florida',
            declarationDate: '2023-09-15',
            obligatedAmount: 75000,
          },
          {
            incidentType: 'Hurricane',
            state: 'FL',
            stateName: 'Florida',
            declarationDate: '2023-08-01',
            obligatedAmount: 100000,
          },
        ],
        meta: { total: 3, page: 1, pageSize: 100 },
      },
      expected: [
        {
          stateCode: 'FL',
          stateName: 'Florida',
          fiscalYear: 2023,
          femaObligatedCents: 22500000,
          declarationCount: 3,
          dominantIncidentType: 'Flood',
        },
      ],
    },
    {
      name: 'converts dollars to cents as integers',
      mockResponse: {
        data: [
          {
            incidentType: 'Tornado',
            state: 'OK',
            stateName: 'Oklahoma',
            declarationDate: '2024-05-01',
            obligatedAmount: 1,
          },
        ],
        meta: { total: 1, page: 1, pageSize: 100 },
      },
      expected: [
        {
          stateCode: 'OK',
          stateName: 'Oklahoma',
          fiscalYear: 2024,
          femaObligatedCents: 100,
          declarationCount: 1,
          dominantIncidentType: 'Tornado',
        },
      ],
    },
    {
      name: 'returns empty array when no declarations',
      mockResponse: {
        data: [],
        meta: { total: 0, page: 1, pageSize: 100 },
      },
      expected: [],
    },
    {
      name: 'handles declarations across multiple fiscal years for same state',
      mockResponse: {
        data: [
          {
            incidentType: 'Wildfire',
            state: 'CA',
            stateName: 'California',
            declarationDate: '2023-08-01',
            obligatedAmount: 200000,
          },
          {
            incidentType: 'Flood',
            state: 'CA',
            stateName: 'California',
            declarationDate: '2024-07-15',
            obligatedAmount: 300000,
          },
        ],
        meta: { total: 2, page: 1, pageSize: 100 },
      },
      expected: [
        {
          stateCode: 'CA',
          stateName: 'California',
          fiscalYear: 2023,
          femaObligatedCents: 20000000,
          declarationCount: 1,
          dominantIncidentType: 'Wildfire',
        },
        {
          stateCode: 'CA',
          stateName: 'California',
          fiscalYear: 2024,
          femaObligatedCents: 30000000,
          declarationCount: 1,
          dominantIncidentType: 'Flood',
        },
      ],
    },
    {
      name: 'ties broken by first encountered incident type alphabetically',
      mockResponse: {
        data: [
          {
            incidentType: 'Hurricane',
            state: 'LA',
            stateName: 'Louisiana',
            declarationDate: '2024-01-01',
            obligatedAmount: 10000,
          },
          {
            incidentType: 'Flood',
            state: 'LA',
            stateName: 'Louisiana',
            declarationDate: '2024-02-01',
            obligatedAmount: 10000,
          },
        ],
        meta: { total: 2, page: 1, pageSize: 100 },
      },
      expected: [
        {
          stateCode: 'LA',
          stateName: 'Louisiana',
          fiscalYear: 2024,
          femaObligatedCents: 2000000,
          declarationCount: 2,
          dominantIncidentType: 'Flood',
        },
      ],
    },
    {
      name: 'aggregates across multiple paginated API responses',
      mockPages: [
        {
          data: [
            {
              incidentType: 'Wildfire',
              state: 'CA',
              stateName: 'California',
              declarationDate: '2024-07-15',
              obligatedAmount: 500000,
            },
          ],
          meta: { total: 3, page: 1, pageSize: 2 },
        },
        {
          data: [
            {
              incidentType: 'Flood',
              state: 'CA',
              stateName: 'California',
              declarationDate: '2024-08-20',
              obligatedAmount: 300000,
            },
            {
              incidentType: 'Tornado',
              state: 'TX',
              stateName: 'Texas',
              declarationDate: '2024-06-01',
              obligatedAmount: 1000000,
            },
          ],
          meta: { total: 3, page: 2, pageSize: 2 },
        },
      ],
      expected: [
        {
          stateCode: 'CA',
          stateName: 'California',
          fiscalYear: 2024,
          femaObligatedCents: 80000000,
          declarationCount: 2,
          dominantIncidentType: 'Flood',
        },
        {
          stateCode: 'TX',
          stateName: 'Texas',
          fiscalYear: 2024,
          femaObligatedCents: 100000000,
          declarationCount: 1,
          dominantIncidentType: 'Tornado',
        },
      ],
    },
    {
      name: 'fractional dollar amounts convert to correct integer cents',
      mockResponse: {
        data: [
          {
            incidentType: 'Earthquake',
            state: 'AK',
            stateName: 'Alaska',
            declarationDate: '2024-03-01',
            obligatedAmount: 1234.56,
          },
        ],
        meta: { total: 1, page: 1, pageSize: 100 },
      },
      expected: [
        {
          stateCode: 'AK',
          stateName: 'Alaska',
          fiscalYear: 2024,
          femaObligatedCents: 123456,
          declarationCount: 1,
          dominantIncidentType: 'Earthquake',
        },
      ],
    },
    {
      name: 'zero obligatedAmount produces zero cents',
      mockResponse: {
        data: [
          {
            incidentType: 'Wildfire',
            state: 'NV',
            stateName: 'Nevada',
            declarationDate: '2024-01-15',
            obligatedAmount: 0,
          },
        ],
        meta: { total: 1, page: 1, pageSize: 100 },
      },
      expected: [
        {
          stateCode: 'NV',
          stateName: 'Nevada',
          fiscalYear: 2024,
          femaObligatedCents: 0,
          declarationCount: 1,
          dominantIncidentType: 'Wildfire',
        },
      ],
    },
  ];

  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeAll(() => {
    (global.fetch as any) = mockFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it.each(testTable)('$name', async ({ mockResponse, mockPages, expected }) => {
    if (mockPages) {
      mockFetch.mockImplementation((url: string) => {
        const pageMatch = url.match(/page=(\d+)/);
        if (pageMatch) {
          const page = parseInt(pageMatch[1]);
          const pageData = mockPages![page - 1];
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(pageData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPages![0]),
        });
      });
    } else {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
    }

    const service = new OpenFemaService();
    const result = await service.fetchDeclarationsByState();

    expect(result).toEqual(expected);
  });
});
