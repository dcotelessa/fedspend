import { DisasterService } from './disaster.service';
import { DisasterFundingRecord } from './disaster-funding-record.entity';
import { DisasterRecoveryRatio } from './disaster-recovery-ratio.entity';

describe('DisasterService', () => {
  interface OverviewTestCase {
    name: string;
    fundingRows: Partial<DisasterFundingRecord>[];
    ratioRows: Partial<DisasterRecoveryRatio>[];
    expected: {
      defGroup: string;
      totalObligated: number;
      totalAwardCount: number;
      stateCount: number;
      highestPerCapitaState: string;
      highestPerCapita: number;
      coverageGapCount: number;
    }[];
  }

  interface StatesTestCase {
    name: string;
    fundingRows: Partial<DisasterFundingRecord>[];
    defGroup: string;
    fiscalYear?: number;
    expectedIds: number[];
    expectedOrder: 'desc' | 'asc';
  }

  interface RatiosTestCase {
    name: string;
    ratioRows: Partial<DisasterRecoveryRatio>[];
    fiscalYear?: number;
    expectedOrder: number[];
    expectedSortDir: 'asc';
  }

  interface StateProfileTestCase {
    name: string;
    fundingRows: Partial<DisasterFundingRecord>[];
    ratioRows: Partial<DisasterRecoveryRatio>[];
    stateCode: string;
    expectedProfileShape: {
      stateCode: string;
      stateName: string;
      totalObligated: number;
      totalAwardCount: number;
      ratios: Array<{ recoveryRatio: number; femaObligated: number; fedSpendingObligated: number; declarationCount: number }>;
      declarationCount: number;
    };
  }

  const testOverview: OverviewTestCase[] = [
    {
      name: 'aggregates rows by defGroup with totals',
      fundingRows: [
        { id: 1, defGroup: 'CA', stateCode: 'NY', stateName: 'New York', obligatedAmount: 100000, awardCount: 5, perCapita: 500, population: 200 },
        { id: 2, defGroup: 'CA', stateCode: 'CA', stateName: 'California', obligatedAmount: 200000, awardCount: 10, perCapita: 1000, population: 200 },
        { id: 3, defGroup: '01', stateCode: 'FL', stateName: 'Florida', obligatedAmount: 50000, awardCount: 3, perCapita: 200, population: 250 },
      ],
      ratioRows: [
        { id: 1, stateCode: 'NY', stateName: 'New York', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 200000, recoveryRatio: 2.0, declarationCount: 1, dominantIncidentType: 'Wildfire' },
        { id: 2, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligated: 300000, fedSpendingObligated: 100000, recoveryRatio: 0.3, declarationCount: 2, dominantIncidentType: 'Earthquake' },
        { id: 3, stateCode: 'FL', stateName: 'Florida', fiscalYear: 2024, femaObligated: 50000, fedSpendingObligated: 50000, recoveryRatio: 1.0, declarationCount: 1, dominantIncidentType: 'Hurricane' },
      ],
      expected: [
        {
          defGroup: 'CA',
          totalObligated: 300000,
          totalAwardCount: 15,
          stateCount: 2,
          highestPerCapitaState: 'California',
          highestPerCapita: 1000,
          coverageGapCount: 1,
        },
        {
          defGroup: '01',
          totalObligated: 50000,
          totalAwardCount: 3,
          stateCount: 1,
          highestPerCapitaState: 'Florida',
          highestPerCapita: 200,
          coverageGapCount: 0,
        },
      ],
    },
    {
      name: 'coverageGapCount tracks states with ratio < 0.5',
      fundingRows: [
        { id: 1, defGroup: 'CA', stateCode: 'NY', stateName: 'New York', obligatedAmount: 100000, awardCount: 5, perCapita: 500, population: 200 },
        { id: 2, defGroup: 'CA', stateCode: 'CA', stateName: 'California', obligatedAmount: 200000, awardCount: 10, perCapita: 1000, population: 200 },
      ],
      ratioRows: [
        { id: 1, stateCode: 'NY', stateName: 'New York', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 200000, recoveryRatio: 2.0, declarationCount: 1, dominantIncidentType: 'Wildfire' },
        { id: 2, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligated: 300000, fedSpendingObligated: 100000, recoveryRatio: 0.3, declarationCount: 2, dominantIncidentType: 'Earthquake' },
      ],
      expected: [
        {
          defGroup: 'CA',
          totalObligated: 300000,
          totalAwardCount: 15,
          stateCount: 2,
          highestPerCapitaState: 'California',
          highestPerCapita: 1000,
          coverageGapCount: 1,
        },
      ],
    },
  ];

  const testStates: StatesTestCase[] = [
    {
      name: 'returns rows filtered by defGroup sorted by obligatedAmount desc',
      fundingRows: [
        { id: 1, defGroup: 'CA', stateCode: 'NY', stateName: 'New York', obligatedAmount: 100000, awardCount: 5, perCapita: 500, population: 200 },
        { id: 2, defGroup: 'CA', stateCode: 'CA', stateName: 'California', obligatedAmount: 200000, awardCount: 10, perCapita: 1000, population: 200 },
        { id: 3, defGroup: '01', stateCode: 'FL', stateName: 'Florida', obligatedAmount: 50000, awardCount: 3, perCapita: 200, population: 250 },
        { id: 4, defGroup: 'CA', stateCode: 'TX', stateName: 'Texas', obligatedAmount: 150000, awardCount: 7, perCapita: 800, population: 187 },
      ],
      defGroup: 'CA',
      expectedIds: [2, 4, 1],
      expectedOrder: 'desc',
    },
    {
      name: 'returns empty array when no rows match defGroup',
      fundingRows: [
        { id: 1, defGroup: 'CA', stateCode: 'NY', stateName: 'New York', obligatedAmount: 100000, awardCount: 5, perCapita: 500, population: 200 },
      ],
      defGroup: '01',
      expectedIds: [],
      expectedOrder: 'desc',
    },
  ];

  const testRatios: RatiosTestCase[] = [
    {
      name: 'sorts ratios ascending by recoveryRatio (worst first)',
      ratioRows: [
        { id: 1, stateCode: 'NY', stateName: 'New York', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 200000, recoveryRatio: 2.0, declarationCount: 1, dominantIncidentType: 'Wildfire' },
        { id: 2, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligated: 300000, fedSpendingObligated: 100000, recoveryRatio: 0.3, declarationCount: 2, dominantIncidentType: 'Earthquake' },
        { id: 3, stateCode: 'FL', stateName: 'Florida', fiscalYear: 2024, femaObligated: 50000, fedSpendingObligated: 50000, recoveryRatio: 1.0, declarationCount: 1, dominantIncidentType: 'Hurricane' },
      ],
      expectedOrder: [2, 3, 1],
      expectedSortDir: 'asc',
    },
    {
      name: 'filters ratios by fiscalYear when provided',
      ratioRows: [
        { id: 1, stateCode: 'NY', stateName: 'New York', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 200000, recoveryRatio: 2.0, declarationCount: 1, dominantIncidentType: 'Wildfire' },
        { id: 2, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligated: 300000, fedSpendingObligated: 100000, recoveryRatio: 0.3, declarationCount: 2, dominantIncidentType: 'Earthquake' },
        { id: 3, stateCode: 'FL', stateName: 'Florida', fiscalYear: 2023, femaObligated: 50000, fedSpendingObligated: 50000, recoveryRatio: 1.0, declarationCount: 1, dominantIncidentType: 'Hurricane' },
      ],
      fiscalYear: 2024,
      expectedOrder: [2, 1],
      expectedSortDir: 'asc',
    },
  ];

  const testStateProfile: StateProfileTestCase[] = [
    {
      name: 'returns profile combining funding and ratios for one state',
      fundingRows: [
        { id: 1, defGroup: 'CA', stateCode: 'NY', stateName: 'New York', obligatedAmount: 100000, awardCount: 5, perCapita: 500, population: 200 },
        { id: 2, defGroup: '01', stateCode: 'NY', stateName: 'New York', obligatedAmount: 50000, awardCount: 3, perCapita: 200, population: 250 },
      ],
      ratioRows: [
        { id: 1, stateCode: 'NY', stateName: 'New York', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 200000, recoveryRatio: 2.0, declarationCount: 1, dominantIncidentType: 'Wildfire' },
        { id: 2, stateCode: 'NY', stateName: 'New York', fiscalYear: 2024, femaObligated: 50000, fedSpendingObligated: 50000, recoveryRatio: 1.0, declarationCount: 1, dominantIncidentType: 'Hurricane' },
      ],
      stateCode: 'NY',
      expectedProfileShape: {
        stateCode: 'NY',
        stateName: 'New York',
        totalObligated: 150000,
        totalAwardCount: 8,
        ratios: [
          { recoveryRatio: 2.0, femaObligated: 100000, fedSpendingObligated: 200000, declarationCount: 1 },
          { recoveryRatio: 1.0, femaObligated: 50000, fedSpendingObligated: 50000, declarationCount: 1 },
        ],
        declarationCount: 2,
      },
    },
    {
      name: 'returns null when state code has no data',
      fundingRows: [],
      ratioRows: [],
      stateCode: 'ZZ',
      expectedProfileShape: null,
    },
  ];

  it.each(testOverview)('$name', async ({ fundingRows, ratioRows, expected }) => {
    const fundingRepo = { find: jest.fn().mockResolvedValue(fundingRows as DisasterFundingRecord[]) };
    const ratioRepo = { find: jest.fn().mockResolvedValue(ratioRows as DisasterRecoveryRatio[]) };
    const svc = new DisasterService(fundingRepo as any, ratioRepo as any);

    const result = await svc.getOverview();

    expect(result.length).toBe(expected.length);
    expected.forEach((exp, i) => {
      expect(result[i]).toEqual(exp);
    });
  });

  it.each(testStates)('$name', async ({ fundingRows, defGroup, expectedIds, expectedOrder }) => {
    const filteredFunding = defGroup
      ? fundingRows.filter((r) => r.defGroup === defGroup) as DisasterFundingRecord[]
      : fundingRows as DisasterFundingRecord[];
    const fundingRepo = { find: jest.fn().mockResolvedValue(filteredFunding) };
    const ratioRepo = { find: jest.fn().mockResolvedValue([]) };
    const svc = new DisasterService(fundingRepo as any, ratioRepo as any);

    const result = await svc.queryStates({ defGroup });

    const resultIds = result.map((r: { id: number }) => r.id);
    expect(resultIds).toEqual(expectedIds);

    if (expectedOrder === 'desc') {
      const amounts = result.map((r: { obligatedAmount: number }) => r.obligatedAmount);
      for (let i = 1; i < amounts.length; i++) {
        expect(amounts[i]).toBeLessThanOrEqual(amounts[i - 1]);
      }
    }
  });

  it.each(testRatios)('$name', async ({ ratioRows, fiscalYear, expectedOrder, expectedSortDir }) => {
    const fundingRepo = { find: jest.fn().mockResolvedValue([]) };
    const filteredRatios = fiscalYear
      ? ratioRows.filter((r) => r.fiscalYear === fiscalYear) as DisasterRecoveryRatio[]
      : ratioRows as DisasterRecoveryRatio[];
    const ratioRepo = { find: jest.fn().mockResolvedValue(filteredRatios) };
    const svc = new DisasterService(fundingRepo as any, ratioRepo as any);

    const result = await svc.queryRatios({ fiscalYear });

    const resultIds = result.map((r: { id: number }) => r.id);
    expect(resultIds).toEqual(expectedOrder);

    if (expectedSortDir === 'asc') {
      const ratios = result.map((r: { recoveryRatio: number }) => r.recoveryRatio);
      for (let i = 1; i < ratios.length; i++) {
        expect(ratios[i]).toBeGreaterThanOrEqual(ratios[i - 1]);
      }
    }
  });

  it.each(testStateProfile)('$name', async ({ fundingRows, ratioRows, stateCode, expectedProfileShape }) => {
    const fundingRepo = { find: jest.fn().mockResolvedValue(fundingRows as DisasterFundingRecord[]) };
    const ratioRepo = { find: jest.fn().mockResolvedValue(ratioRows as DisasterRecoveryRatio[]) };
    const svc = new DisasterService(fundingRepo as any, ratioRepo as any);

    const result = await svc.getStateProfile(stateCode);

    if (expectedProfileShape === null) {
      expect(result).toBeNull();
    } else {
      expect(result).toMatchObject(expectedProfileShape);
      expect(result.stateCode).toBe(expectedProfileShape.stateCode);
      expect(result.stateName).toBe(expectedProfileShape.stateName);
      expect(result.totalObligated).toBe(expectedProfileShape.totalObligated);
      expect(result.totalAwardCount).toBe(expectedProfileShape.totalAwardCount);
      expect(result.declarationCount).toBe(expectedProfileShape.declarationCount);
    }
  });
});
