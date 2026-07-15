import { AgenciesController } from './agencies.controller';
import { AgenciesService } from './agencies.service';
import { ApiResponse, Agency, AgencySummary } from '@shared/interfaces';
import { SpendingRecord } from '../spending/spending-record.entity';
import { AgencyListQueryDto } from './dto/agency-list-query.dto';

describe('AgenciesController', () => {
  let controller: AgenciesController;
  let service: AgenciesService;

  beforeEach(() => {
    const mockService = {
      findAllWithTotals: jest.fn(),
      findSummary: jest.fn(),
      findSpotlight: jest.fn(),
    };
    service = mockService as any;
    controller = new AgenciesController(service);
  });

  describe('list', () => {
    interface TestCase {
      name: string;
      input: Partial<AgencyListQueryDto>;
      expectedFy?: number;
      serviceReturn: ApiResponse<{ id: number; name: string; totalCents: number }[]>;
      expected: ApiResponse<{ id: number; name: string; totalCents: number }[]>;
    }

    const testTable: TestCase[] = [
      {
        name: 'forwards fiscalYear query param through to the service',
        input: { fiscalYear: 2023 },
        expectedFy: 2023,
        serviceReturn: {
          data: [
            { id: 1, name: 'Agency A', totalCents: 300000 },
          ],
          meta: { total: 6, page: 1, pageSize: 6 },
        },
        expected: {
          data: [
            { id: 1, name: 'Agency A', totalCents: 300000 },
          ],
          meta: { total: 6, page: 1, pageSize: 6 },
        },
      },
      {
        name: 'forwards undefined when no fiscalYear query param',
        input: {},
        expectedFy: undefined,
        serviceReturn: {
          data: [],
          meta: { total: 0, page: 1, pageSize: 0 },
        },
        expected: {
          data: [],
          meta: { total: 0, page: 1, pageSize: 0 },
        },
      },
    ];

    it.each(testTable)('$name', async ({ input, expectedFy, serviceReturn, expected }) => {
      service.findAllWithTotals.mockResolvedValue(serviceReturn);
      const result = await controller.list(input);
      expect(service.findAllWithTotals).toHaveBeenCalledWith(input.fiscalYear);
      expect(result).toEqual(expected);
    });
  });

  describe('summary', () => {
    interface TestCase {
      name: string;
      serviceReturn: AgencySummary;
      expected: AgencySummary;
    }

    const testTable: TestCase[] = [
      {
        name: 'returns summary for given agency id',
        serviceReturn: {
          agency: { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
          currentFyTotal: 300000,
          priorFyTotal: 200000,
          yoyChange: 50,
        },
        expected: {
          agency: { id: 1, name: 'Agency A', abbreviation: 'A', toptierCode: '001' },
          currentFyTotal: 300000,
          priorFyTotal: 200000,
          yoyChange: 50,
        },
      },
    ];

    it.each(testTable)('$name', async ({ serviceReturn, expected }) => {
      service.findSummary.mockResolvedValue(serviceReturn);
      const result = await controller.summary(1);
      expect(service.findSummary).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('spotlight', () => {
    interface TestCase {
      name: string;
      serviceReturn: SpendingRecord[];
      expected: SpendingRecord[];
    }

    const testTable: TestCase[] = [
      {
        name: 'returns spotlight data for given agency id',
        serviceReturn: [
          { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 300000, outlayAmount: 230000, awardCount: 15 } as SpendingRecord,
        ],
        expected: [
          { id: 1, agencyId: 1, fiscalYear: 2026, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'G', obligatedAmount: 300000, outlayAmount: 230000, awardCount: 15 } as SpendingRecord,
        ],
      },
    ];

    it.each(testTable)('$name', async ({ serviceReturn, expected }) => {
      service.findSpotlight.mockResolvedValue(serviceReturn);
      const result = await controller.spotlight(1);
      expect(service.findSpotlight).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });
});
