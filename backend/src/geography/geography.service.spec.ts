import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { GeographyService } from './geography.service';
import { GeoSpendingSnapshot } from './geo-spending-snapshot.entity';

describe('GeographyService', () => {
  let service: GeographyService;
  let repo: Repository<GeoSpendingSnapshot>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeographyService,
        {
          provide: getRepositoryToken(GeoSpendingSnapshot),
          useValue: { find: jest.fn(), createQueryBuilder: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<GeographyService>(GeographyService);
    repo = module.get<Repository<GeoSpendingSnapshot>>(
      getRepositoryToken(GeoSpendingSnapshot),
    );
  });

  interface QueryStatesTestCase {
    name: string;
    input: { fiscalYear?: number; agencyId?: number; scope?: string };
    repoReturn: GeoSpendingSnapshot[];
    expectedCount: number;
    expectedOrder?: number[];
    expectedWhere: FindOptionsWhere<GeoSpendingSnapshot>;
  }

  const queryStatesTestTable: QueryStatesTestCase[] = [
    {
      name: 'filters by fiscalYear only',
      input: { fiscalYear: 2024 },
      repoReturn: [
        {
          id: 1,
          stateCode: 'AL',
          stateName: 'Alabama',
          fiscalYear: 2024,
          agencyId: 1,
          scope: 'state',
          obligatedAmount: 500000,
          awardCount: 10,
          population: 5000000,
          perCapita: 100,
        } as GeoSpendingSnapshot,
        {
          id: 2,
          stateCode: 'CA',
          stateName: 'California',
          fiscalYear: 2024,
          agencyId: 1,
          scope: 'state',
          obligatedAmount: 1500000,
          awardCount: 30,
          population: 40000000,
          perCapita: 3750,
        } as GeoSpendingSnapshot,
      ],
      expectedCount: 2,
      expectedWhere: { fiscalYear: 2024, agencyId: IsNull() },
    },
    {
      name: 'filters by fiscalYear and agencyId',
      input: { fiscalYear: 2024, agencyId: 2 },
      repoReturn: [
        {
          id: 3,
          stateCode: 'TX',
          stateName: 'Texas',
          fiscalYear: 2024,
          agencyId: 2,
          scope: 'county',
          obligatedAmount: 800000,
          awardCount: 20,
          population: 30000000,
          perCapita: 2667,
        } as GeoSpendingSnapshot,
      ],
      expectedCount: 1,
      expectedWhere: { fiscalYear: 2024, agencyId: 2 },
    },
    {
      name: 'filters by fiscalYear and scope',
      input: { fiscalYear: 2024, scope: 'county' },
      repoReturn: [
        {
          id: 4,
          stateCode: 'NY',
          stateName: 'New York',
          fiscalYear: 2024,
          agencyId: 1,
          scope: 'county',
          obligatedAmount: 600000,
          awardCount: 15,
          population: 20000000,
          perCapita: 3000,
        } as GeoSpendingSnapshot,
      ],
      expectedCount: 1,
      expectedWhere: { fiscalYear: 2024, agencyId: IsNull(), scope: 'county' },
    },
    {
      name: 'nullable agencyId returns all rows with null agencyId',
      input: { fiscalYear: 2024, agencyId: undefined },
      repoReturn: [
        {
          id: 5,
          stateCode: 'FL',
          stateName: 'Florida',
          fiscalYear: 2024,
          agencyId: null,
          scope: 'state',
          obligatedAmount: 900000,
          awardCount: 25,
          population: 22000000,
          perCapita: 4090,
        } as GeoSpendingSnapshot,
      ],
      expectedCount: 1,
      expectedWhere: { fiscalYear: 2024, agencyId: IsNull() },
    },
    {
      name: 'sorted by obligatedAmount descending',
      input: { fiscalYear: 2024 },
      repoReturn: [
        {
          id: 7,
          stateCode: 'OH',
          stateName: 'Ohio',
          fiscalYear: 2024,
          agencyId: 1,
          scope: 'state',
          obligatedAmount: 1200000,
          awardCount: 40,
          population: 11000000,
          perCapita: 10909,
        } as GeoSpendingSnapshot,
        {
          id: 8,
          stateCode: 'PA',
          stateName: 'Pennsylvania',
          fiscalYear: 2024,
          agencyId: 1,
          scope: 'state',
          obligatedAmount: 700000,
          awardCount: 18,
          population: 13000000,
          perCapita: 5385,
        } as GeoSpendingSnapshot,
        {
          id: 6,
          stateCode: 'IL',
          stateName: 'Illinois',
          fiscalYear: 2024,
          agencyId: 1,
          scope: 'state',
          obligatedAmount: 300000,
          awardCount: 5,
          population: 12000000,
          perCapita: 2500,
        } as GeoSpendingSnapshot,
      ],
      expectedCount: 3,
      expectedOrder: [1200000, 700000, 300000],
      expectedWhere: { fiscalYear: 2024, agencyId: IsNull() },
    },
    {
      name: 'returns empty array when no matches',
      input: { fiscalYear: 2024, agencyId: 99 },
      repoReturn: [],
      expectedCount: 0,
      expectedWhere: { fiscalYear: 2024, agencyId: 99 },
    },
  ];

  it.each(queryStatesTestTable)(
    '$name',
    async ({ input, repoReturn, expectedCount, expectedOrder, expectedWhere }) => {
      jest.spyOn(repo, 'find').mockResolvedValue(repoReturn);

      const result = await service.queryStates(input);

      expect(result).toHaveLength(expectedCount);
      expect(repo.find).toHaveBeenCalledWith({
        where: expectedWhere,
        order: { obligatedAmount: 'DESC' },
      });

      if (expectedOrder) {
        for (let i = 0; i < result.length; i++) {
          expect(result[i].obligatedAmount).toBe(expectedOrder[i]);
        }
      }
    },
  );

  interface GetStateDetailTestCase {
    name: string;
    stateCode: string;
    repoReturn: GeoSpendingSnapshot[];
    expectedCount: number;
    expectedYears: number[];
  }

  const getStateDetailTestTable: GetStateDetailTestCase[] = [
    {
      name: 'returns all years for a state',
      stateCode: 'CA',
      repoReturn: [
        {
          id: 9,
          stateCode: 'CA',
          stateName: 'California',
          fiscalYear: 2022,
          agencyId: 1,
          scope: 'state',
          obligatedAmount: 1000000,
          awardCount: 20,
          population: 39000000,
          perCapita: 2564,
        } as GeoSpendingSnapshot,
        {
          id: 10,
          stateCode: 'CA',
          stateName: 'California',
          fiscalYear: 2023,
          agencyId: 1,
          scope: 'state',
          obligatedAmount: 1100000,
          awardCount: 22,
          population: 39500000,
          perCapita: 2785,
        } as GeoSpendingSnapshot,
        {
          id: 11,
          stateCode: 'CA',
          stateName: 'California',
          fiscalYear: 2024,
          agencyId: 1,
          scope: 'state',
          obligatedAmount: 1500000,
          awardCount: 30,
          population: 40000000,
          perCapita: 3750,
        } as GeoSpendingSnapshot,
      ],
      expectedCount: 3,
      expectedYears: [2022, 2023, 2024],
    },
    {
      name: 'returns all agencies for a state across years',
      stateCode: 'TX',
      repoReturn: [
        {
          id: 12,
          stateCode: 'TX',
          stateName: 'Texas',
          fiscalYear: 2023,
          agencyId: 2,
          scope: 'county',
          obligatedAmount: 800000,
          awardCount: 20,
          population: 30000000,
          perCapita: 2667,
        } as GeoSpendingSnapshot,
        {
          id: 13,
          stateCode: 'TX',
          stateName: 'Texas',
          fiscalYear: 2023,
          agencyId: 3,
          scope: 'county',
          obligatedAmount: 400000,
          awardCount: 10,
          population: 30000000,
          perCapita: 1333,
        } as GeoSpendingSnapshot,
      ],
      expectedCount: 2,
      expectedYears: [2023, 2023],
    },
    {
      name: 'returns empty array for unknown state',
      stateCode: 'ZZ',
      repoReturn: [],
      expectedCount: 0,
      expectedYears: [],
    },
  ];

  it.each(getStateDetailTestTable)(
    '$name',
    async ({ stateCode, repoReturn, expectedCount, expectedYears }) => {
      jest.spyOn(repo, 'find').mockResolvedValue(repoReturn);

      const result = await service.getStateDetail(stateCode);

      expect(result).toHaveLength(expectedCount);
      expect(repo.find).toHaveBeenCalledWith({
        where: { stateCode },
        order: { fiscalYear: 'DESC' },
      });

      const actualYears = result.map((r) => r.fiscalYear).sort();
      expect(actualYears).toEqual(expectedYears);
    },
  );
});
