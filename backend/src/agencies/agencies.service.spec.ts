import { AgenciesService } from './agencies.service';
import { Agency } from './agency.entity';
import { SpendingRecord } from '../spending/spending-record.entity';
import { Repository } from 'typeorm';

describe('AgenciesService', () => {
  describe('findAllWithTotals', () => {
    interface TestCase {
      name: string;
      agencies: Agency[];
      spendingByAgency: Record<number, SpendingRecord[]>;
      currentFy?: number;
      expected: { id: number; name: string; totalCents: number }[];
    }

    const testTable: TestCase[] = [
      {
        name: 'returns agencies with current FY total spent',
        agencies: [
          { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
          { id: 2, name: 'Agency B', abbreviation: 'B', toptierCode: '002' },
        ],
        spendingByAgency: {
          1: [
            { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 100000, outlayAmount: 80000, awardCount: 5 } as SpendingRecord,
            { id: 2, agencyId: 1, fiscalYear: 2026, quarter: 2, awardTypeLabel: 'Direct Payment', awardTypeCodes: 'D', obligatedAmount: 200000, outlayAmount: 150000, awardCount: 10 } as SpendingRecord,
          ],
          2: [
            { id: 3, agencyId: 2, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 50000, outlayAmount: 40000, awardCount: 2 } as SpendingRecord,
          ],
        },
        expected: [
          { id: 1, name: 'Agency A', totalCents: 300000 },
          { id: 2, name: 'Agency B', totalCents: 50000 },
        ],
      },
      {
        name: 'excludes records from other fiscal years',
        agencies: [
          { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
        ],
        spendingByAgency: {
          1: [
            { id: 1, agencyId: 1, fiscalYear: 2025, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 999999, outlayAmount: 0, awardCount: 0 } as SpendingRecord,
            { id: 2, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 500000, outlayAmount: 400000, awardCount: 3 } as SpendingRecord,
          ],
        },
        expected: [
          { id: 1, name: 'Agency A', totalCents: 500000 },
        ],
      },
      {
        name: 'returns zero total when no spending records exist',
        agencies: [
          { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
        ],
        spendingByAgency: {},
        expected: [
          { id: 1, name: 'Agency A', totalCents: 0 },
        ],
      },
      {
        name: 'uses config currentFy when set',
        agencies: [
          { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
        ],
        spendingByAgency: {
          1: [
            { id: 1, agencyId: 1, fiscalYear: 2025, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 300000, outlayAmount: 200000, awardCount: 2 } as SpendingRecord,
          ],
        },
        currentFy: 2025,
        expected: [
          { id: 1, name: 'Agency A', totalCents: 300000 },
        ],
      },
    ];

    it.each(testTable)('$name', async ({ agencies, spendingByAgency, currentFy, expected }) => {
      const agencyRepo = { find: jest.fn().mockResolvedValue(agencies) } as any;
      const spendingRepo = { find: jest.fn((opts: any) => {
        const aid = opts.where.agencyId;
        const fy = opts.where.fiscalYear;
        const records = spendingByAgency[aid] || [];
        return Promise.resolve(records.filter(r => r.fiscalYear === fy));
      }) } as any;
      const configService = { get: jest.fn((key: string) => {
        if (key === 'currentFy' && currentFy !== undefined) return currentFy;
        if (key === 'currentFy') return 2026;
        return undefined;
      }) } as any;
      const svc = new AgenciesService(agencyRepo, spendingRepo, configService);
      const result = await svc.findAllWithTotals();
      expect(result.data).toEqual(expected);
      expect(agencyRepo.find).toHaveBeenCalledWith();
      for (const agency of agencies) {
        expect(spendingRepo.find).toHaveBeenCalledWith({
          where: { agencyId: agency.id, fiscalYear: currentFy ?? 2026 },
        });
      }
    });
  });

  describe('findSummary', () => {
    interface TestCase {
      name: string;
      agency: Agency;
      currentRecords: SpendingRecord[];
      priorRecords: SpendingRecord[];
      currentFy?: number;
      expectedCurrent: number;
      expectedPrior: number;
      expectedYoy: number;
    }

    const testTable: TestCase[] = [
      {
        name: 'calculates totals and YoY change for two fiscal years',
        agency: { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
        currentRecords: [
          { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 100000, outlayAmount: 0, awardCount: 0 } as SpendingRecord,
        ],
        priorRecords: [
          { id: 2, agencyId: 1, fiscalYear: 2025, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 80000, outlayAmount: 0, awardCount: 0 } as SpendingRecord,
        ],
        expectedCurrent: 100000,
        expectedPrior: 80000,
        expectedYoy: 25,
      },
      {
        name: 'returns zero YoY when prior year total is zero',
        agency: { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
        currentRecords: [
          { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 50000, outlayAmount: 0, awardCount: 0 } as SpendingRecord,
        ],
        priorRecords: [],
        expectedCurrent: 50000,
        expectedPrior: 0,
        expectedYoy: 0,
      },
      {
        name: 'sums multiple records per fiscal year',
        agency: { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
        currentRecords: [
          { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 100000, outlayAmount: 0, awardCount: 0 } as SpendingRecord,
          { id: 2, agencyId: 1, fiscalYear: 2026, quarter: 2, awardTypeLabel: 'Direct Payment', awardTypeCodes: 'D', obligatedAmount: 200000, outlayAmount: 0, awardCount: 0 } as SpendingRecord,
        ],
        priorRecords: [
          { id: 3, agencyId: 1, fiscalYear: 2025, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 100000, outlayAmount: 0, awardCount: 0 } as SpendingRecord,
        ],
        expectedCurrent: 300000,
        expectedPrior: 100000,
        expectedYoy: 200,
      },
      {
        name: 'uses priorFy = currentFy - 1 for prior year lookup',
        agency: { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
        currentRecords: [
          { id: 1, agencyId: 1, fiscalYear: 2027, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 100000, outlayAmount: 0, awardCount: 0 } as SpendingRecord,
        ],
        priorRecords: [
          { id: 2, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 50000, outlayAmount: 0, awardCount: 0 } as SpendingRecord,
        ],
        currentFy: 2027,
        expectedCurrent: 100000,
        expectedPrior: 50000,
        expectedYoy: 100,
      },
    ];

    it.each(testTable)('$name', async ({ agency, currentRecords, priorRecords, currentFy, expectedCurrent, expectedPrior, expectedYoy }) => {
      const agencyRepo = { findOne: jest.fn().mockResolvedValue(agency) } as any;
      const spendingRepo = { find: jest.fn((opts: any) => {
        const aid = opts.where.agencyId;
        const fy = opts.where.fiscalYear;
        if (fy === (currentFy ?? 2026)) {
          return Promise.resolve(currentRecords);
        }
        if (fy === ((currentFy ?? 2026) - 1)) {
          return Promise.resolve(priorRecords);
        }
        return Promise.resolve([]);
      }) } as any;
      const configService = { get: jest.fn((key: string) => {
        if (key === 'currentFy' && currentFy !== undefined) return currentFy;
        if (key === 'currentFy') return 2026;
        return undefined;
      }) } as any;
      const svc = new AgenciesService(agencyRepo, spendingRepo, configService);
      const result = await svc.findSummary(1);
      expect(result).toEqual({
        agency: { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
        currentFyTotal: expectedCurrent,
        priorFyTotal: expectedPrior,
        yoyChange: expectedYoy,
      });
    });

    it('returns null when agency not found', async () => {
      const agencyRepo = { findOne: jest.fn().mockResolvedValue(null) } as any;
      const spendingRepo = { find: jest.fn().mockResolvedValue([]) } as any;
      const configService = { get: jest.fn(() => 2026) } as any;
      const svc = new AgenciesService(agencyRepo, spendingRepo, configService);
      const result = await svc.findSummary(999);
      expect(result).toBeNull();
    });
  });

  describe('findSpotlight', () => {
    interface TestCase {
      name: string;
      records: SpendingRecord[];
      expected: { fiscalYear: number; awardTypeLabel: string; obligatedAmount: number; outlayAmount: number; awardCount: number }[];
    }

    const testTable: TestCase[] = [
      {
        name: 'groups records by fiscalYear and awardTypeLabel, aggregating totals',
        records: [
          { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 100000, outlayAmount: 80000, awardCount: 5 } as SpendingRecord,
          { id: 2, agencyId: 1, fiscalYear: 2026, quarter: 2, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 200000, outlayAmount: 150000, awardCount: 10 } as SpendingRecord,
          { id: 3, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Direct Payment', awardTypeCodes: 'D', obligatedAmount: 50000, outlayAmount: 30000, awardCount: 3 } as SpendingRecord,
          { id: 4, agencyId: 1, fiscalYear: 2025, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 90000, outlayAmount: 70000, awardCount: 4 } as SpendingRecord,
        ],
        expected: [
          { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 300000, outlayAmount: 230000, awardCount: 15 },
          { id: 3, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Direct Payment', awardTypeCodes: 'D', obligatedAmount: 50000, outlayAmount: 30000, awardCount: 3 },
          { id: 4, agencyId: 1, fiscalYear: 2025, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 90000, outlayAmount: 70000, awardCount: 4 },
        ],
      },
      {
        name: 'handles empty records list',
        records: [],
        expected: [],
      },
      {
        name: 'handles single record',
        records: [
          { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 100000, outlayAmount: 80000, awardCount: 5 } as SpendingRecord,
        ],
        expected: [
          { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 100000, outlayAmount: 80000, awardCount: 5 },
        ],
      },
    ];

    it.each(testTable)('$name', async ({ records, expected }) => {
      const agencyRepo = { findOne: jest.fn().mockResolvedValue({ id: 1 } as Agency) } as any;
      const spendingRepo = { find: jest.fn().mockResolvedValue(records) } as any;
      const configService = { get: jest.fn(() => 2026) } as any;
      const svc = new AgenciesService(agencyRepo, spendingRepo, configService);
      const result = await svc.findSpotlight(1);
      expect(result).toEqual(expected);
    });

    it('returns null when agency not found', async () => {
      const agencyRepo = { findOne: jest.fn().mockResolvedValue(null) } as any;
      const spendingRepo = { find: jest.fn().mockResolvedValue([]) } as any;
      const configService = { get: jest.fn(() => 2026) } as any;
      const svc = new AgenciesService(agencyRepo, spendingRepo, configService);
      const result = await svc.findSpotlight(999);
      expect(result).toBeNull();
    });
  });
});
