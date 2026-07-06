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
import { SPENDING_FISCAL_YEARS, SPENDING_AGENCY_SYNC_LIMIT } from './sync.constants';

describe('SyncService', () => {
  let service: SyncService;
  let agencyRepo: { upsert: jest.Mock; createQueryBuilder: jest.Mock };
  let spendingRepo: { upsert: jest.Mock; delete: jest.Mock };
  let geoRepo: { delete: jest.Mock; save: jest.Mock };
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
    geoFetchSequence?: { status: string; rows?: any[] }[];
    agenciesWithSpending?: any[];
    disasterFetchResult?: { status: string; rows?: any[] };
    femaFetchResult?: StateAggregationResult[];
    expectedUpsertCalls: { repoName: string; count: number }[];
    expectedRepoData?: Record<string, any[]>;
    expectedGeoDeleteCount?: number;
    expectedGeoSaveCount?: number;
    expectedTotalGeoRows?: number;
    expectedSpendingDeleteCount?: number;
    expectedSpendingDeleteArgs?: Array<{ agencyId: number; fiscalYear: number }>;
    expectedSpendingUpsertedRows?: Record<string, any[]>;
  }

  const twoAgencyDeleteArgs = [
    ...SPENDING_FISCAL_YEARS.map(year => ({ agencyId: 7, fiscalYear: year })),
    ...SPENDING_FISCAL_YEARS.map(year => ({ agencyId: 9, fiscalYear: year })),
  ];

  const twentyFiveAgencies = Array.from({ length: 25 }, (_, index) => ({
    id: index + 1,
    name: `Agency ${index + 1}`,
    abbreviation: `A${index + 1}`,
    toptierCode: `${index + 1}`,
  }));

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
      name: 'syncAgenciesAndSpending loops over all SPENDING_FISCAL_YEARS and upserts spending per year',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' },
        { id: 2, name: 'DOE', abbreviation: 'DOE', toptierCode: '097' },
      ]},
      spendingFetchResults: [],
      expectedUpsertCalls: [
        { repoName: 'agency', count: 2 },
        { repoName: 'spending', count: 50 },
      ],
      expectedRepoData: {
        agency: [
          { name: 'NASA', toptierCode: '080' },
          { name: 'DOE', toptierCode: '097' },
        ],
      },
    },
    {
      name: 'syncAgenciesAndSpending deletes existing rows per (agencyId, fiscalYear) before upserting',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' },
      ]},
      spendingFetchResults: [],
      expectedUpsertCalls: [
        { repoName: 'agency', count: 1 },
        { repoName: 'spending', count: 25 },
      ],
      expectedSpendingDeleteCount: 5,
    },
    {
      name: 'syncAgenciesAndSpending scopes each delete by both agencyId and fiscalYear across agencies and years',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 7, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' },
        { id: 9, name: 'GSA', abbreviation: 'GSA', toptierCode: '047' },
      ]},
      expectedUpsertCalls: [
        { repoName: 'agency', count: 2 },
        { repoName: 'spending', count: 50 },
      ],
      expectedSpendingDeleteCount: 10,
      expectedSpendingDeleteArgs: twoAgencyDeleteArgs,
    },
    {
      name: 'syncAgenciesAndSpending syncs spending for at most SPENDING_AGENCY_SYNC_LIMIT agencies while upserting every fetched agency',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: twentyFiveAgencies },
      expectedUpsertCalls: [
        { repoName: 'agency', count: 25 },
        { repoName: 'spending', count: SPENDING_AGENCY_SYNC_LIMIT * SPENDING_FISCAL_YEARS.length * 5 },
      ],
      expectedSpendingDeleteCount: SPENDING_AGENCY_SYNC_LIMIT * SPENDING_FISCAL_YEARS.length,
    },
    {
      name: 'syncAgenciesAndSpending upserts spending records with correct fiscalYear for each year',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [
        { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' },
      ]},
      spendingFetchResults: [],
      expectedUpsertCalls: [
        { repoName: 'agency', count: 1 },
        { repoName: 'spending', count: 25 },
      ],
      expectedSpendingUpsertedRows: {
        '2020': [
          { agencyId: 1, fiscalYear: 2020, obligatedAmount: 1000, quarter: 1, awardTypeLabel: 'Contracts' },
          { agencyId: 1, fiscalYear: 2020, obligatedAmount: 2000, quarter: 1, awardTypeLabel: 'Grants' },
          { agencyId: 1, fiscalYear: 2020, obligatedAmount: 3000, quarter: 1, awardTypeLabel: 'Direct Payments' },
          { agencyId: 1, fiscalYear: 2020, obligatedAmount: 4000, quarter: 1, awardTypeLabel: 'Loans' },
          { agencyId: 1, fiscalYear: 2020, obligatedAmount: 5000, quarter: 1, awardTypeLabel: 'IDVs' },
        ],
        '2021': [
          { agencyId: 1, fiscalYear: 2021, obligatedAmount: 1000, quarter: 1, awardTypeLabel: 'Contracts' },
          { agencyId: 1, fiscalYear: 2021, obligatedAmount: 2000, quarter: 1, awardTypeLabel: 'Grants' },
          { agencyId: 1, fiscalYear: 2021, obligatedAmount: 3000, quarter: 1, awardTypeLabel: 'Direct Payments' },
          { agencyId: 1, fiscalYear: 2021, obligatedAmount: 4000, quarter: 1, awardTypeLabel: 'Loans' },
          { agencyId: 1, fiscalYear: 2021, obligatedAmount: 5000, quarter: 1, awardTypeLabel: 'IDVs' },
        ],
        '2022': [
          { agencyId: 1, fiscalYear: 2022, obligatedAmount: 1000, quarter: 1, awardTypeLabel: 'Contracts' },
          { agencyId: 1, fiscalYear: 2022, obligatedAmount: 2000, quarter: 1, awardTypeLabel: 'Grants' },
          { agencyId: 1, fiscalYear: 2022, obligatedAmount: 3000, quarter: 1, awardTypeLabel: 'Direct Payments' },
          { agencyId: 1, fiscalYear: 2022, obligatedAmount: 4000, quarter: 1, awardTypeLabel: 'Loans' },
          { agencyId: 1, fiscalYear: 2022, obligatedAmount: 5000, quarter: 1, awardTypeLabel: 'IDVs' },
        ],
        '2023': [
          { agencyId: 1, fiscalYear: 2023, obligatedAmount: 1000, quarter: 1, awardTypeLabel: 'Contracts' },
          { agencyId: 1, fiscalYear: 2023, obligatedAmount: 2000, quarter: 1, awardTypeLabel: 'Grants' },
          { agencyId: 1, fiscalYear: 2023, obligatedAmount: 3000, quarter: 1, awardTypeLabel: 'Direct Payments' },
          { agencyId: 1, fiscalYear: 2023, obligatedAmount: 4000, quarter: 1, awardTypeLabel: 'Loans' },
          { agencyId: 1, fiscalYear: 2023, obligatedAmount: 5000, quarter: 1, awardTypeLabel: 'IDVs' },
        ],
        '2024': [
          { agencyId: 1, fiscalYear: 2024, obligatedAmount: 1000, quarter: 1, awardTypeLabel: 'Contracts' },
          { agencyId: 1, fiscalYear: 2024, obligatedAmount: 2000, quarter: 1, awardTypeLabel: 'Grants' },
          { agencyId: 1, fiscalYear: 2024, obligatedAmount: 3000, quarter: 1, awardTypeLabel: 'Direct Payments' },
          { agencyId: 1, fiscalYear: 2024, obligatedAmount: 4000, quarter: 1, awardTypeLabel: 'Loans' },
          { agencyId: 1, fiscalYear: 2024, obligatedAmount: 5000, quarter: 1, awardTypeLabel: 'IDVs' },
        ],
      },
    },
    {
      name: 'syncAgenciesAndSpending skips spending when agency fetch fails',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'not_found' },
      expectedUpsertCalls: [],
    },
    {
      name: 'syncAgenciesAndSpending empty agency list — nothing to process',
      method: 'syncAgenciesAndSpending',
      agencyFetchResult: { status: 'success', agencies: [] },
      expectedUpsertCalls: [{ repoName: 'agency', count: 0 }],
    },
    {
      name: 'syncGeography loops years × recipient/performance scopes × rollup target, all succeed',
      method: 'syncGeography',
      geoFetchResult: { status: 'success', rows: [{ id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 10000, awardCount: 10, population: 4000000, perCapita: 2500 }] },
      expectedUpsertCalls: [],
      expectedGeoDeleteCount: 10,
      expectedGeoSaveCount: 10,
      expectedTotalGeoRows: 10,
    },
    {
      name: 'syncGeography skips delete+save when every fetch returns not_found',
      method: 'syncGeography',
      geoFetchResult: { status: 'not_found' },
      expectedUpsertCalls: [],
      expectedGeoDeleteCount: 0,
      expectedGeoSaveCount: 0,
    },
    {
      name: 'syncGeography discovers agencies-with-spending and syncs rollup + each across years and scopes',
      method: 'syncGeography',
      agenciesWithSpending: [{ id: 30, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' }],
      geoFetchResult: { status: 'success', rows: [{ id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 10000, awardCount: 10, population: 4000000, perCapita: 2500 }] },
      expectedUpsertCalls: [],
      expectedGeoDeleteCount: 20,
      expectedGeoSaveCount: 20,
      expectedTotalGeoRows: 20,
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
        { repoName: 'ratio', count: 1 },
      ],
      expectedRepoData: {
        agency: [{ name: 'Test Agency' }],
        ratio: [{ stateCode: 'CA' }],
      },
      expectedGeoDeleteCount: 10,
      expectedGeoSaveCount: 10,
      expectedTotalGeoRows: 10,
    },
    {
      name: 'syncGeography partial failure — skips delete+save for not_found year/scope combos',
      method: 'syncGeography',
      geoFetchSequence: [
        { status: 'success', rows: [{ id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2020, agencyId: null, scope: 'recipient', obligatedAmount: 10000, awardCount: 10, population: 4000000, perCapita: 2500 }] },
        { status: 'not_found' },
        { status: 'success', rows: [{ id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2022, agencyId: null, scope: 'recipient', obligatedAmount: 14000, awardCount: 14, population: 4000000, perCapita: 3500 }] },
        { status: 'not_found' },
        { status: 'success', rows: [{ id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 18000, awardCount: 18, population: 4000000, perCapita: 4500 }] },
        { status: 'not_found' },
        { status: 'success', rows: [{ id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2021, agencyId: null, scope: 'recipient', obligatedAmount: 12000, awardCount: 12, population: 4000000, perCapita: 3000 }] },
        { status: 'not_found' },
        { status: 'success', rows: [{ id: 0, stateCode: 'CA', stateName: 'California', fiscalYear: 2023, agencyId: null, scope: 'recipient', obligatedAmount: 16000, awardCount: 16, population: 4000000, perCapita: 4000 }] },
        { status: 'not_found' },
      ],
      expectedUpsertCalls: [],
      expectedGeoDeleteCount: 5,
      expectedGeoSaveCount: 5,
      expectedTotalGeoRows: 5,
    },
    {
      name: 'syncGeography empty results — delete runs but save receives empty arrays',
      method: 'syncGeography',
      geoFetchResult: { status: 'success', rows: [] },
      expectedUpsertCalls: [],
      expectedGeoDeleteCount: 10,
      expectedGeoSaveCount: 10,
      expectedTotalGeoRows: 0,
    },
    {
      name: 'syncDisaster recoveryRatio = 1.0 when both fema and fed are zero',
      method: 'syncDisaster',
      disasterFetchResult: { status: 'success', rows: [] },
      femaFetchResult: [
        { stateCode: 'AK', stateName: 'Alaska', fiscalYear: 2024, femaObligatedCents: 0, declarationCount: 1, dominantIncidentType: 'Wildfire' }
      ],
      expectedUpsertCalls: [{ repoName: 'ratio', count: 1 }],
      expectedRepoData: {
        ratio: [{ stateCode: 'AK', recoveryRatio: 1.0, fedSpendingObligated: 0, femaObligated: 0 }],
      },
    },
  ];

  beforeEach(async () => {
    const mockAgencyRepo = { upsert: jest.fn(), createQueryBuilder: jest.fn() };
    const mockSpendingRepo = { upsert: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) };
    const mockGeoRepo = { delete: jest.fn().mockResolvedValue(undefined), save: jest.fn().mockResolvedValue(undefined) };
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
    geoFetchSequence,
    agenciesWithSpending,
    disasterFetchResult,
    femaFetchResult,
    expectedUpsertCalls,
    expectedRepoData,
    expectedGeoDeleteCount,
    expectedGeoSaveCount,
    expectedTotalGeoRows,
    expectedSpendingDeleteCount,
    expectedSpendingDeleteArgs,
    expectedSpendingUpsertedRows,
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
    if (geoFetchSequence) {
      for (const r of geoFetchSequence) {
        usaService.fetchGeoSnapshots.mockResolvedValueOnce(r);
      }
    }
    if (disasterFetchResult) usaService.fetchDisasterSpending.mockResolvedValue(disasterFetchResult);
    if (femaFetchResult) femaService.fetchDeclarationsByState.mockResolvedValue(femaFetchResult);

    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(agenciesWithSpending ?? []),
    };
    agencyRepo.createQueryBuilder.mockReturnValue(qb);

    if (method === 'syncAgenciesAndSpending' && expectedSpendingUpsertedRows) {
      usaService.fetchSpendingByAgency.mockImplementation((params: any) => {
        const year = params.fiscalYear;
        const rows = (expectedSpendingUpsertedRows as Record<string, any[]>)[String(year)] ?? [];
        return { status: 'success', rows };
      });
    } else if (method === 'syncAgenciesAndSpending' && expectedUpsertCalls.some(c => c.repoName === 'spending')) {
      const awardLabels = ['Contracts', 'Grants', 'Direct Payments', 'Loans', 'IDVs'];
      usaService.fetchSpendingByAgency.mockImplementation(() => ({
        status: 'success',
        rows: awardLabels.map((label, idx) => ({
          id: 0,
          fiscalYear: 2024,
          quarter: 1,
          awardTypeLabel: label,
          awardTypeCodes: label[0],
          obligatedAmount: 1000 + idx,
        })),
      }));
    }

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

    if (expectedGeoDeleteCount !== undefined) {
      expect(geoRepo.delete).toHaveBeenCalledTimes(expectedGeoDeleteCount);
    }

    if (expectedGeoSaveCount !== undefined) {
      expect(geoRepo.save).toHaveBeenCalledTimes(expectedGeoSaveCount);
    }

    if (expectedTotalGeoRows !== undefined) {
      let totalRows = 0;
      for (const call of geoRepo.save.mock.calls) {
        totalRows += (call[0] as any[]).length;
      }
      expect(totalRows).toBe(expectedTotalGeoRows);
    }

    if (expectedSpendingDeleteCount !== undefined) {
      expect(spendingRepo.delete).toHaveBeenCalledTimes(expectedSpendingDeleteCount);
    }

    if (expectedSpendingDeleteArgs) {
      expect(spendingRepo.delete).toHaveBeenCalledTimes(expectedSpendingDeleteArgs.length);
      for (const call of spendingRepo.delete.mock.calls) {
        expect(expectedSpendingDeleteArgs).toContainEqual(call[0]);
      }
    }
  });

  function getRepo(name: string): { upsert: jest.Mock } {
    switch (name) {
      case 'agency': return { upsert: agencyRepo.upsert };
      case 'spending': return { upsert: spendingRepo.upsert };
      case 'disaster': return { upsert: disasterRepo.upsert };
      case 'ratio': return { upsert: ratioRepo.upsert };
      default: throw new Error(`unknown repo: ${name}`);
    }
  }
});
