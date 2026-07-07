import { OpenFemaService } from './openfema.service';

describe('OpenFemaService.fetchDeclarationsByState', () => {
  interface TestCase {
    name: string;
    mockResponse: {
      PublicAssistanceGrantAwardActivities: Array<{
        federalShareObligated: number;
        stateAbbreviation: string;
        state: string;
        incidentType: string;
        declarationDate: string;
      }>;
      metadata: { count: number; top: number };
    };
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
      name: 'aggregates PA project obligations by state and fiscal year',
      mockResponse: {
        PublicAssistanceGrantAwardActivities: [
          {
            federalShareObligated: 500000,
            stateAbbreviation: 'CA',
            state: 'California',
            incidentType: 'Wildfire',
            declarationDate: '2024-07-15T00:00:00.000Z',
          },
          {
            federalShareObligated: 300000,
            stateAbbreviation: 'CA',
            state: 'California',
            incidentType: 'Wildfire',
            declarationDate: '2024-08-20T00:00:00.000Z',
          },
          {
            federalShareObligated: 200000,
            stateAbbreviation: 'CA',
            state: 'California',
            incidentType: 'Flood',
            declarationDate: '2024-09-10T00:00:00.000Z',
          },
          {
            federalShareObligated: 1000000,
            stateAbbreviation: 'TX',
            state: 'Texas',
            incidentType: 'Flood',
            declarationDate: '2024-06-01T00:00:00.000Z',
          },
        ],
        metadata: { count: 0, top: 0 },
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
      name: 'converts federalShareObligated dollars to integer cents',
      mockResponse: {
        PublicAssistanceGrantAwardActivities: [
          {
            federalShareObligated: 1,
            stateAbbreviation: 'OK',
            state: 'Oklahoma',
            incidentType: 'Tornado',
            declarationDate: '2024-05-01T00:00:00.000Z',
          },
        ],
        metadata: { count: 0, top: 0 },
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
      name: 'returns empty array when no projects',
      mockResponse: {
        PublicAssistanceGrantAwardActivities: [],
        metadata: { count: 0, top: 0 },
      },
      expected: [],
    },
    {
      name: 'handles projects across multiple fiscal years for same state',
      mockResponse: {
        PublicAssistanceGrantAwardActivities: [
          {
            federalShareObligated: 200000,
            stateAbbreviation: 'CA',
            state: 'California',
            incidentType: 'Wildfire',
            declarationDate: '2023-08-01T00:00:00.000Z',
          },
          {
            federalShareObligated: 300000,
            stateAbbreviation: 'CA',
            state: 'California',
            incidentType: 'Flood',
            declarationDate: '2024-07-15T00:00:00.000Z',
          },
        ],
        metadata: { count: 0, top: 0 },
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
        PublicAssistanceGrantAwardActivities: [
          {
            federalShareObligated: 10000,
            stateAbbreviation: 'LA',
            state: 'Louisiana',
            incidentType: 'Hurricane',
            declarationDate: '2024-01-01T00:00:00.000Z',
          },
          {
            federalShareObligated: 10000,
            stateAbbreviation: 'LA',
            state: 'Louisiana',
            incidentType: 'Flood',
            declarationDate: '2024-02-01T00:00:00.000Z',
          },
        ],
        metadata: { count: 0, top: 0 },
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
      name: 'fractional dollar amounts convert to correct integer cents',
      mockResponse: {
        PublicAssistanceGrantAwardActivities: [
          {
            federalShareObligated: 1234.56,
            stateAbbreviation: 'AK',
            state: 'Alaska',
            incidentType: 'Earthquake',
            declarationDate: '2024-03-01T00:00:00.000Z',
          },
        ],
        metadata: { count: 0, top: 0 },
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
      name: 'zero federalShareObligated produces zero cents',
      mockResponse: {
        PublicAssistanceGrantAwardActivities: [
          {
            federalShareObligated: 0,
            stateAbbreviation: 'NV',
            state: 'Nevada',
            incidentType: 'Wildfire',
            declarationDate: '2024-01-15T00:00:00.000Z',
          },
        ],
        metadata: { count: 0, top: 0 },
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

  it.each(testTable)('$name', async ({ mockResponse, expected }) => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const service = new OpenFemaService();
    const result = await service.fetchDeclarationsByState();

    expect(result).toEqual(expected);
  });
});
