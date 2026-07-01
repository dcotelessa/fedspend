import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncService } from './sync.service';
import { UsaSpendingService } from './usa-spending.service';
import { OpenFemaService } from './openfema.service';
import { Agency } from '../agencies/agency.entity';
import { SpendingRecord } from '../spending/spending-record.entity';
import { GeoSpendingSnapshot } from '../geography/geo-spending-snapshot.entity';
import { DisasterFundingRecord } from '../disaster/disaster-funding-record.entity';
import { DisasterRecoveryRatio } from '../disaster/disaster-recovery-ratio.entity';
import { StateAggregationResult } from './openfema.service';

describe('SyncService', () => {
  let service: SyncService;
  let agencyRepo: { upsert: jest.Mock };
  let spendingRepo: { upsert: jest.Mock };
  let geoRepo: { upsert: jest.Mock };
  let disasterRepo: { upsert: jest.Mock };
  let ratioRepo: { upsert: jest.Mock };
  let usaService: UsaSpendingService;
  let femaService: OpenFemaService;

  interface TestCase {
    name: string;
    method: string;
    agencyFetchResult?: { status: string; agencies?: any[] };
    spendingFetchResults?: { status: string; rows?: any[]; total?: number }[];
    geoFetchResult?: { status: string; rows?: any[] };
    disasterFetchResult?: { status: string; rows?: any[] };
    femaFetchResult?: StateAggregationResult[];
    expectedUpsertCalls: { repoName: string; count: number }[];
    expectedRepoData?: Record<string, any[]>;
  }

  const testTable: TestCase[] = [
    {
      name: 'syncAgenciesAndSpending upserts a new agency',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 0, name: 'Test Agency', abbreviation: 'TA', toptierCode: 'ABC' }
      ]},
      spendingFetchResults: [{ status: 'not_found' }],
      expectedUpsertCalls: [{ repoName: 'agency', count: 1 }],
      expectedRepoData: {
        agency: [{ name: 'Test Agency', toptierCode: 'ABC' }],
      },
    },
    {
      name: 'syncAgenciesAndSpending upserts an existing agency',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 1, name: 'Updated Agency', abbreviation: 'UA', toptierCode: 'ABC' }
      ]},
      spendingFetchResults: [{ status: 'not_found' }],
      expectedUpsertCalls: [{ repoName: 'agency', count: 1 }],
      expectedRepoData: {
        agency: [{ name: 'Updated Agency', toptierCode: 'ABC' }],
      },
    },
    {
      name: 'syncAgenciesAndSpending loops through agencies and upserts spending per agency',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' },
        { id: 2, name: 'DOE', abbreviation: 'DOE', toptierCode: '097' },
      ]},
      spendingFetchResults: [
        { status: 'success', rows: [
          { id: 0, agencyId: 0, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Total', awardTypeCodes: '', obligatedAmount: 1000, outlayAmount: 0, awardCount: 0 }
        ], total: 1},
        { status: 'success', rows: [
          { id: 0, agencyId: 0, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Total', awardTypeCodes: '', obligatedAmount: 2000, outlayAmount: 0, awardCount: 0 }
        ], total: 1},
      ],
      expectedUpsertCalls: [
        { repoName: 'agency', count: 2 },
        { repoName: 'spending', count: 2 },
      ],
      expectedRepoData: {
        agency: [
          { name: 'NASA', toptierCode: '080' },
          { name: 'DOE', toptierCode: '097' },
        ],
        spending: [
          { agencyId: 1, fiscalYear: 2024, awardTypeLabel: 'Total', obligatedAmount: 1000 },
          { agencyId: 2, fiscalYear: 2024, awardTypeLabel: 'Total', obligatedAmount: 2000 },
        ],
      },
    },
    {
      name: 'syncGeography upserts a new geo snapshot',
      method: 'syncGeography',
      geoFetchResult: { status: 'success', rows: [
        { id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, agencyId: 1, scope: 'recipient', obligatedAmount: 5000, awardCount: 3, population: 1000, perCapita: 5 }
      ]},
      expectedUpsertCalls: [{ repoName: 'geo', count: 1 }],
      expectedRepoData: {
        geo: [{ stateCode: 'CA', fiscalYear: 2024 }],
      },
    },
    {
      name: 'syncDisaster upserts a new disaster funding record',
      method: 'syncDisaster',
      disasterFetchResult: { status: 'success', rows: [
        { id: 0, defGroup: 'JF-3038', defCodes: 'JF-3038', stateCode: 'CA', stateName: 'California', obligatedAmount: 10000, outlayAmount: 8000, awardCount: 5, perCapita: 0, population: 0 }
      ]},
      femaFetchResult: [],
      expectedUpsertCalls: [{ repoName: 'disaster', count: 1 }],
      expectedRepoData: {
        disaster: [{ defGroup: 'JF-3038', stateCode: 'CA' }],
      },
    },
    {
      name: 'syncDisaster stores recovery ratio when no federal spending exists for the state',
      method: 'syncDisaster',
      disasterFetchResult: { status: 'success', rows: [] },
      femaFetchResult: [
        { stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligatedCents: 5000, declarationCount: 2, dominantIncidentType: 'Wildfire' }
      ],
      expectedUpsertCalls: [{ repoName: 'ratio', count: 1 }],
      expectedRepoData: {
        ratio: [{ stateCode: 'CA', recoveryRatio: 0, fedSpendingObligated: 0, femaObligated: 5000 }],
      },
    },
    {
      name: 'syncDisaster aggregates federal spending per state and computes the recovery ratio',
      method: 'syncDisaster',
      disasterFetchResult: { status: 'success', rows: [
        { id: 0, defGroup: 'JF-3038', defCodes: 'JF-3038', stateCode: 'CA', stateName: 'California', obligatedAmount: 10000, outlayAmount: 8000, awardCount: 5, perCapita: 0, population: 0 }
      ]},
      femaFetchResult: [
        { stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligatedCents: 5000, declarationCount: 2, dominantIncidentType: 'Wildfire' }
      ],
      expectedUpsertCalls: [
        { repoName: 'disaster', count: 1 },
        { repoName: 'ratio', count: 1 },
      ],
      expectedRepoData: {
        disaster: [{ defGroup: 'JF-3038', stateCode: 'CA' }],
        ratio: [{ stateCode: 'CA', recoveryRatio: 2, fedSpendingObligated: 10000, femaObligated: 5000 }],
      },
    },
    {
      name: 'syncAll orchestrates all methods',
      method: 'syncAll',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 0, name: 'Test Agency', abbreviation: 'TA', toptierCode: 'ABC' }
      ]},
      spendingFetchResults: [{ status: 'not_found' }],
      geoFetchResult: { status: 'success', rows: [
        { id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, agencyId: 1, scope: 'recipient', obligatedAmount: 5000, awardCount: 3, population: 1000, perCapita: 5 }
      ]},
      disasterFetchResult: { status: 'success', rows: [] },
      femaFetchResult: [
        { stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligatedCents: 5000, declarationCount: 2, dominantIncidentType: 'Wildfire' }
      ],
      expectedUpsertCalls: [
        { repoName: 'agency', count: 1 },
        { repoName: 'geo', count: 1 },
        { repoName: 'ratio', count: 1 },
      ],
      expectedRepoData: {
        agency: [{ name: 'Test Agency' }],
        geo: [{ stateCode: 'CA' }],
        ratio: [{ stateCode: 'CA' }],
      },
    },
  ];

  beforeEach(async () => {
    const mockAgencyRepo = { upsert: jest.fn() };
    const mockSpendingRepo = { upsert: jest.fn() };
    const mockGeoRepo = { upsert: jest.fn() };
    const mockDisasterRepo = { upsert: jest.fn() };
    const mockRatioRepo = { upsert: jest.fn() };
    const mockUsaService = {
      fetchAgencies: jest.fn(),
      fetchSpendingByAgency: jest.fn(),
      fetchGeoSnapshots: jest.fn(),
      fetchDisasterSpending: jest.fn(),
    };
    const mockFemaService = {
      fetchDeclarationsByState: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: getRepositoryToken(Agency), useValue: mockAgencyRepo },
        { provide: getRepositoryToken(SpendingRecord), useValue: mockSpendingRepo },
        { provide: getRepositoryToken(GeoSpendingSnapshot), useValue: mockGeoRepo },
        { provide: getRepositoryToken(DisasterFundingRecord), useValue: mockDisasterRepo },
        { provide: getRepositoryToken(DisasterRecoveryRatio), useValue: mockRatioRepo },
        { provide: UsaSpendingService, useValue: mockUsaService },
        { provide: OpenFemaService, useValue: mockFemaService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    agencyRepo = module.get(getRepositoryToken(Agency));
    spendingRepo = module.get(getRepositoryToken(SpendingRecord));
    geoRepo = module.get(getRepositoryToken(GeoSpendingSnapshot));
    disasterRepo = module.get(getRepositoryToken(DisasterFundingRecord));
    ratioRepo = module.get(getRepositoryToken(DisasterRecoveryRatio));
    usaService = module.get<UsaSpendingService>(UsaSpendingService);
    femaService = module.get<OpenFemaService>(OpenFemaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(testTable)('$name', async ({
    method,
    agencyFetchResult,
    spendingFetchResults,
    geoFetchResult,
    disasterFetchResult,
    femaFetchResult,
    expectedUpsertCalls,
    expectedRepoData,
  }) => {
    usaService.fetchAgencies.mockResolvedValue({ status: 'not_found' });
    usaService.fetchSpendingByAgency.mockResolvedValue({ status: 'not_found' });
    usaService.fetchGeoSnapshots.mockResolvedValue({ status: 'not_found' });
    usaService.fetchDisasterSpending.mockResolvedValue({ status: 'not_found' });
    femaService.fetchDeclarationsByState.mockResolvedValue([]);

    if (agencyFetchResult) usaService.fetchAgencies.mockResolvedValue(agencyFetchResult);
    if (spendingFetchResults) {
      for (const r of spendingFetchResults) {
        usaService.fetchSpendingByAgency.mockResolvedValueOnce(r);
      }
    }
    if (geoFetchResult) usaService.fetchGeoSnapshots.mockResolvedValue(geoFetchResult);
    if (disasterFetchResult) usaService.fetchDisasterSpending.mockResolvedValue(disasterFetchResult);
    if (femaFetchResult) femaService.fetchDeclarationsByState.mockResolvedValue(femaFetchResult);

    await (service as Record<string, unknown>)[method]();

    for (const call of expectedUpsertCalls) {
      const repo = getRepo(call.repoName);
      const upsertCalls = (repo.upsert as jest.Mock).mock.calls;
      expect(upsertCalls.length).toBe(call.count);
    }

    if (expectedRepoData) {
      for (const [repoName, expectedData] of Object.entries(expectedRepoData)) {
        const repo = getRepo(repoName);
        const upsertCalls = (repo.upsert as jest.Mock).mock.calls;
        for (let i = 0; i < upsertCalls.length; i++) {
          const upserted = upsertCalls[i][0];
          const expected = (expectedData as any[])[i];
          for (const [key, value] of Object.entries(expected)) {
            expect(upserted[key]).toBe(value);
          }
        }
      }
    }
  });

  function getRepo(name: string): { upsert: jest.Mock } {
    switch (name) {
      case 'agency': return { upsert: agencyRepo.upsert };
      case 'spending': return { upsert: spendingRepo.upsert };
      case 'geo': return { upsert: geoRepo.upsert };
      case 'disaster': return { upsert: disasterRepo.upsert };
      case 'ratio': return { upsert: ratioRepo.upsert };
    }
  }
});
