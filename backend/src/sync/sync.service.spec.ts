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
  let agencyRepo: Repository<Agency>;
  let spendingRepo: Repository<SpendingRecord>;
  let geoRepo: Repository<GeoSpendingSnapshot>;
  let disasterRepo: Repository<DisasterFundingRecord>;
  let ratioRepo: Repository<DisasterRecoveryRatio>;
  let usaService: UsaSpendingService;
  let femaService: OpenFemaService;

  interface TestCase {
    name: string;
    method: string;
    agencyFetchResult?: { status: string; agencies?: any[] };
    spendingFetchResult?: { status: string; rows?: any[]; total?: number };
    geoFetchResult?: { status: string; rows?: any[] };
    disasterFetchResult?: { status: string; rows?: any[] };
    femaFetchResult?: StateAggregationResult[];
    findOneReturns: Record<string, any>;
    expectedSaveCalls: { repoName: string; count: number }[];
    expectedRepoData?: Record<string, any[]>;
  }

  const testTable: TestCase[] = [
    {
      name: 'syncAgenciesAndSpending upserts a new agency',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 0, name: 'Test Agency', abbreviation: 'TA', toptierCode: 'ABC' }
      ]},
      findOneReturns: { Agency: null },
      expectedSaveCalls: [{ repoName: 'agency', count: 1 }],
      expectedRepoData: {
        agency: [{ name: 'Test Agency', toptierCode: 'ABC' }],
      },
    },
    {
      name: 'syncAgenciesAndSpending updates an existing agency',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 1, name: 'Updated Agency', abbreviation: 'UA', toptierCode: 'ABC' }
      ]},
      findOneReturns: {
        Agency: { id: 1, name: 'Old Agency', abbreviation: 'OA', toptierCode: 'ABC' }
      },
      expectedSaveCalls: [{ repoName: 'agency', count: 1 }],
      expectedRepoData: {
        agency: [{ name: 'Updated Agency', toptierCode: 'ABC' }],
      },
    },
    {
      name: 'syncAgenciesAndSpending upserts a new spending record',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'not_found' },
      spendingFetchResult: { status: 'success', rows: [
        { id: 0, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: '', obligatedAmount: 1000, outlayAmount: 500, awardCount: 1 }
      ], total: 1},
      findOneReturns: { SpendingRecord: null },
      expectedSaveCalls: [{ repoName: 'spending', count: 1 }],
      expectedRepoData: {
        spending: [{ agencyId: 1, fiscalYear: 2024, obligatedAmount: 1000 }],
      },
    },
    {
      name: 'syncGeography upserts a new geo snapshot',
      method: 'syncGeography',
      geoFetchResult: { status: 'success', rows: [
        { id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, agencyId: 1, scope: 'recipient', obligatedAmount: 5000, awardCount: 3, population: 1000, perCapita: 5 }
      ]},
      findOneReturns: { GeoSpendingSnapshot: null },
      expectedSaveCalls: [{ repoName: 'geo', count: 1 }],
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
      findOneReturns: { DisasterFundingRecord: null },
      expectedSaveCalls: [{ repoName: 'disaster', count: 1 }],
      expectedRepoData: {
        disaster: [{ defGroup: 'JF-3038', stateCode: 'CA' }],
      },
    },
    {
      name: 'syncDisaster stores recovery ratio correctly',
      method: 'syncDisaster',
      disasterFetchResult: { status: 'success', rows: [] },
      femaFetchResult: [
        { stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligatedCents: 5000, declarationCount: 2, dominantIncidentType: 'Wildfire' }
      ],
      findOneReturns: {},
      expectedSaveCalls: [{ repoName: 'ratio', count: 1 }],
      expectedRepoData: {
        ratio: [{ stateCode: 'CA', recoveryRatio: 0 }],
      },
    },
    {
      name: 'syncAll orchestrates all methods',
      method: 'syncAll',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 0, name: 'Test Agency', abbreviation: 'TA', toptierCode: 'ABC' }
      ]},
      spendingFetchResult: { status: 'not_found' },
      geoFetchResult: { status: 'success', rows: [
        { id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, agencyId: 1, scope: 'recipient', obligatedAmount: 5000, awardCount: 3, population: 1000, perCapita: 5 }
      ]},
      disasterFetchResult: { status: 'success', rows: [] },
      femaFetchResult: [
        { stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligatedCents: 5000, declarationCount: 2, dominantIncidentType: 'Wildfire' }
      ],
      findOneReturns: { Agency: null, GeoSpendingSnapshot: null },
      expectedSaveCalls: [
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
    const mockAgencyRepo = { findOne: jest.fn(), save: jest.fn() };
    const mockSpendingRepo = { findOne: jest.fn(), save: jest.fn() };
    const mockGeoRepo = { findOne: jest.fn(), save: jest.fn() };
    const mockDisasterRepo = { findOne: jest.fn(), save: jest.fn() };
    const mockRatioRepo = { findOne: jest.fn(), save: jest.fn() };
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
    name,
    method,
    agencyFetchResult,
    spendingFetchResult,
    geoFetchResult,
    disasterFetchResult,
    femaFetchResult,
    findOneReturns,
    expectedSaveCalls,
    expectedRepoData,
  }) => {
    usaService.fetchAgencies.mockResolvedValue({ status: 'not_found' });
    usaService.fetchSpendingByAgency.mockResolvedValue({ status: 'not_found' });
    usaService.fetchGeoSnapshots.mockResolvedValue({ status: 'not_found' });
    usaService.fetchDisasterSpending.mockResolvedValue({ status: 'not_found' });
    femaService.fetchDeclarationsByState.mockResolvedValue([]);

    if (agencyFetchResult) usaService.fetchAgencies.mockResolvedValue(agencyFetchResult);
    if (spendingFetchResult) usaService.fetchSpendingByAgency.mockResolvedValue(spendingFetchResult);
    if (geoFetchResult) usaService.fetchGeoSnapshots.mockResolvedValue(geoFetchResult);
    if (disasterFetchResult) usaService.fetchDisasterSpending.mockResolvedValue(disasterFetchResult);
    if (femaFetchResult) femaService.fetchDeclarationsByState.mockResolvedValue(femaFetchResult);

    agencyRepo.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.toptierCode) return findOneReturns.Agency ?? null;
      return null;
    });
    spendingRepo.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.agencyId && where?.fiscalYear && where?.quarter && where?.awardTypeLabel) {
        return findOneReturns.SpendingRecord ?? null;
      }
      return null;
    });
    geoRepo.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.stateCode && where?.fiscalYear) {
        return findOneReturns.GeoSpendingSnapshot ?? null;
      }
      return null;
    });
    disasterRepo.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.defGroup && where?.stateCode) {
        return findOneReturns.DisasterFundingRecord ?? null;
      }
      return null;
    });

    await (service as Record<string, unknown>)[method]();

    for (const call of expectedSaveCalls) {
      const repo = getRepo(call.repoName);
      const saveCalls = (repo.save as jest.Mock).mock.calls;
      expect(saveCalls.length).toBe(call.count);
    }

    if (expectedRepoData) {
      for (const [repoName, expectedData] of Object.entries(expectedRepoData)) {
        const repo = getRepo(repoName);
        const saveCalls = (repo.save as jest.Mock).mock.calls;
        for (let i = 0; i < saveCalls.length; i++) {
          const saved = saveCalls[i][0];
          const expected = (expectedData as any[])[i];
          for (const [key, value] of Object.entries(expected)) {
            expect(saved[key]).toBe(value);
          }
        }
      }
    }
  });

  function getRepo(name: string): { save: jest.Mock } {
    switch (name) {
      case 'agency': return { save: agencyRepo.save };
      case 'spending': return { save: spendingRepo.save };
      case 'geo': return { save: geoRepo.save };
      case 'disaster': return { save: disasterRepo.save };
      case 'ratio': return { save: ratioRepo.save };
    }
  }
});
