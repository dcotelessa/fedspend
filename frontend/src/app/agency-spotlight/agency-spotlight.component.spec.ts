import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AgencySpotlightComponent } from './agency-spotlight.component';
import { ApiService } from '../api.service';
import { AWARD_COLORS } from '../award-colors';
import { SpendingRecord, AgencySummary } from '@shared/interfaces';

interface TestCase {
  name: string;
  id: number;
  records: SpendingRecord[];
  fiscalYearStart: number;
  fiscalYearEnd: number;
  expectedLabels: string[];
  expectedDatasetCount: number;
  expectedAwardTypes: string[];
  expectedData: { [awardType: string]: number[] };
}

describe('AgencySpotlightComponent', () => {
  let component: AgencySpotlightComponent;
  let fixture: ComponentFixture<AgencySpotlightComponent>;
  let apiService: ApiService;

  const testTable: TestCase[] = [
    {
      name: 'builds stacked dataset grouped by fiscal year across award types',
      id: 1,
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 5 },
        { id: 2, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 200000, outlayAmount: 0, awardCount: 3 },
        { id: 3, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 150000, outlayAmount: 0, awardCount: 7 },
        { id: 4, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 250000, outlayAmount: 0, awardCount: 4 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedLabels: ['2022', '2023'],
      expectedDatasetCount: 2,
      expectedAwardTypes: ['Contracts', 'Grants'],
      expectedData: { Contracts: [100000, 150000], Grants: [200000, 250000] },
    },
    {
      name: 'filters records by fiscal year range',
      id: 2,
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2019, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 5 },
        { id: 2, agencyId: 1, fiscalYear: 2020, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 200000, outlayAmount: 0, awardCount: 3 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 300000, outlayAmount: 0, awardCount: 7 },
        { id: 4, agencyId: 1, fiscalYear: 2025, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 400000, outlayAmount: 0, awardCount: 4 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedLabels: ['2020', '2024'],
      expectedDatasetCount: 1,
      expectedAwardTypes: ['Contracts'],
      expectedData: { Contracts: [200000, 300000] },
    },
    {
      name: 'aggregates multiple quarters into same fiscal year bucket',
      id: 3,
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 50000, outlayAmount: 0, awardCount: 2 },
        { id: 2, agencyId: 1, fiscalYear: 2022, quarter: 2, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 75000, outlayAmount: 0, awardCount: 3 },
        { id: 3, agencyId: 1, fiscalYear: 2022, quarter: 3, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 25000, outlayAmount: 0, awardCount: 1 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedLabels: ['2022'],
      expectedDatasetCount: 1,
      expectedAwardTypes: ['Contracts'],
      expectedData: { Contracts: [150000] },
    },
    {
      name: 'handles empty record set',
      id: 4,
      records: [],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedLabels: [],
      expectedDatasetCount: 0,
      expectedAwardTypes: [],
      expectedData: {},
    },
    {
      name: 'fills missing award-type buckets within a year with zero',
      id: 5,
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 5 },
        { id: 2, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 50000, outlayAmount: 0, awardCount: 2 },
        { id: 3, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 80000, outlayAmount: 0, awardCount: 1 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedLabels: ['2022', '2023'],
      expectedDatasetCount: 2,
      expectedAwardTypes: ['Contracts', 'Grants'],
      expectedData: { Contracts: [100000, 50000], Grants: [0, 80000] },
    },
    {
      name: 'sorts years and award types regardless of input order',
      id: 6,
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 30000, outlayAmount: 0, awardCount: 1 },
        { id: 2, agencyId: 1, fiscalYear: 2021, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 10000, outlayAmount: 0, awardCount: 1 },
        { id: 3, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 20000, outlayAmount: 0, awardCount: 1 },
        { id: 4, agencyId: 1, fiscalYear: 2021, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 40000, outlayAmount: 0, awardCount: 1 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedLabels: ['2021', '2022', '2023'],
      expectedDatasetCount: 2,
      expectedAwardTypes: ['Contracts', 'Grants'],
      expectedData: { Contracts: [10000, 0, 0], Grants: [40000, 20000, 30000] },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgencySpotlightComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgencySpotlightComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function setupRoute(id: number) {
    const paramMap = convertToParamMap({ id: String(id) });
    (component as any).route = {
      paramMap: {
        subscribe: jest.fn().mockImplementation((fn: (val: any) => void) => {
          fn(paramMap);
        }),
      },
    } as any;
  }

  function flushService(id: number, records: SpendingRecord[] | null) {
    jest.spyOn(apiService, 'getAgencySpotlight').mockReturnValueOnce(of(records));
    jest.spyOn(apiService, 'getAgencySummary').mockReturnValueOnce(of({
      agency: { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' },
      currentFyTotal: 1000000,
      priorFyTotal: 950000,
      yoyChange: 0.05,
    }));
  }

  it.each(testTable)('$name', ({ id, records, fiscalYearStart, fiscalYearEnd, expectedLabels, expectedDatasetCount, expectedAwardTypes, expectedData }) => {
    setupRoute(id);
    flushService(id, records);

    (component as any).ngOnInit();

    expect(component.fiscalYearStart).toBe(fiscalYearStart);
    expect(component.fiscalYearEnd).toBe(fiscalYearEnd);
    expect(component.loading).toBe(false);
    expect(component.chartData.labels).toEqual(expectedLabels);
    expect(component.chartData.datasets.length).toBe(expectedDatasetCount);

    if (expectedAwardTypes.length > 0) {
      const datasetLabels = component.chartData.datasets.map(d => d.label);
      expect(datasetLabels).toEqual(expect.arrayContaining(expectedAwardTypes));
    }

    for (const [awardType, expectedValues] of Object.entries(expectedData)) {
      const dataset = component.chartData.datasets.find(d => d.label === awardType);
      expect(dataset).toBeDefined();
      expect(dataset!.data).toEqual(expectedValues);
    }
  });

  describe('AWARD_COLORS', () => {
    const awardTypes = ['Contracts', 'Grants', 'Direct Payments', 'Loans', 'IDVs'];

    it.each(awardTypes)('has a color for $awardType', (awardType: string) => {
      expect(AWARD_COLORS[awardType]).toBeDefined();
      expect(typeof AWARD_COLORS[awardType]).toBe('string');
      expect(AWARD_COLORS[awardType].length).toBeGreaterThan(0);
    });
  });

  interface InsightTestCase {
    name: string;
    records: SpendingRecord[];
    currentFy: number;
    expectedInsight: string;
  }

  const insightTestTable: InsightTestCase[] = [
    {
      name: 'computes percentage for largest award type',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 600000, outlayAmount: 0, awardCount: 5 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 200000, outlayAmount: 0, awardCount: 3 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Direct Payments', awardTypeCodes: 'C', obligatedAmount: 200000, outlayAmount: 0, awardCount: 2 },
      ],
      currentFy: 2024,
      expectedInsight: 'In FY2024, NASA spent 60.0% on Contracts.',
    },
    {
      name: 'handles single award type (100%)',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 1000000, outlayAmount: 0, awardCount: 10 },
      ],
      currentFy: 2024,
      expectedInsight: 'In FY2024, NASA spent 100.0% on Contracts.',
    },
    {
      name: 'handles empty records',
      records: [],
      currentFy: 2024,
      expectedInsight: 'No data available for the selected fiscal year.',
    },
    {
      name: 'handles no records for current fiscal year',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 5 },
      ],
      currentFy: 2024,
      expectedInsight: 'No data available for the selected fiscal year.',
    },
    {
      name: 'computes percentage with rounding',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 333333, outlayAmount: 0, awardCount: 3 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 333333, outlayAmount: 0, awardCount: 3 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Direct Payments', awardTypeCodes: 'C', obligatedAmount: 333334, outlayAmount: 0, awardCount: 3 },
      ],
      currentFy: 2024,
      expectedInsight: 'In FY2024, NASA spent 33.3% on Direct Payments.',
    },
    {
      name: 'breaks ties by keeping first-encountered award type',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 500000, outlayAmount: 0, awardCount: 4 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 500000, outlayAmount: 0, awardCount: 5 },
      ],
      currentFy: 2024,
      expectedInsight: 'In FY2024, NASA spent 50.0% on Grants.',
    },
  ];

  describe('computeInsight', () => {
    it.each(insightTestTable)('$name', ({ records, currentFy, expectedInsight }) => {
      component.currentRecords = records;
      component.agency = { agency: { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' }, currentFyTotal: 1000000, priorFyTotal: 500000, yoyChange: 1.0 };
      component.fiscalYearEnd = currentFy;
      const insight = (component as any).computeInsight();
      expect(insight).toBe(expectedInsight);
    });
  });

  interface TableDataTestCase {
    name: string;
    records: SpendingRecord[];
    currentFy: number;
    expectedRowCount: number;
    expectedFirstRow: { awardType: string; obligated: number; percentage: number; count: number };
  }

  const tableDataTestTable: TableDataTestCase[] = [
    {
      name: 'builds table rows sorted by obligated desc',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 200000, outlayAmount: 0, awardCount: 3 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 600000, outlayAmount: 0, awardCount: 5 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Direct Payments', awardTypeCodes: 'C', obligatedAmount: 200000, outlayAmount: 0, awardCount: 2 },
      ],
      currentFy: 2024,
      expectedRowCount: 3,
      expectedFirstRow: { awardType: 'Contracts', obligated: 600000, percentage: 60.0, count: 5 },
    },
    {
      name: 'aggregates multiple quarters per award type',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 2 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 2, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 150000, outlayAmount: 0, awardCount: 3 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 3, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 50000, outlayAmount: 0, awardCount: 1 },
      ],
      currentFy: 2024,
      expectedRowCount: 2,
      expectedFirstRow: { awardType: 'Contracts', obligated: 250000, percentage: 83.3, count: 5 },
    },
    {
      name: 'filters to current fiscal year only',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 500000, outlayAmount: 0, awardCount: 10 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 100000, outlayAmount: 0, awardCount: 2 },
      ],
      currentFy: 2024,
      expectedRowCount: 1,
      expectedFirstRow: { awardType: 'Grants', obligated: 100000, percentage: 100.0, count: 2 },
    },
    {
      name: 'handles empty records',
      records: [],
      currentFy: 2024,
      expectedRowCount: 0,
      expectedFirstRow: { awardType: '', obligated: 0, percentage: 0, count: 0 },
    },
  ];

  describe('buildTableData', () => {
    it.each(tableDataTestTable)('$name', ({ records, currentFy, expectedRowCount, expectedFirstRow }) => {
      component.currentRecords = records;
      component.fiscalYearEnd = currentFy;
      const tableData = (component as any).buildTableData();
      expect(tableData.length).toBe(expectedRowCount);
      if (expectedRowCount > 0) {
        expect(tableData[0].awardType).toBe(expectedFirstRow.awardType);
        expect(tableData[0].obligatedAmount).toBe(expectedFirstRow.obligated);
        expect(Math.abs(tableData[0].percentageOfTotal - expectedFirstRow.percentage)).toBeLessThan(0.1);
        expect(tableData[0].awardCount).toBe(expectedFirstRow.count);
      }
    });
  });

  describe('badge color computation', () => {
    it('sets badge color to positive for non-negative yoyChange', () => {
      component.agency = { agency: { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' }, currentFyTotal: 1000000, priorFyTotal: 500000, yoyChange: 1.0 };
      (component as any).updateBadge();
      expect(component.badgeColor).toBe('positive');
      expect(component.badgeText).toBe('+100.0% YoY');
    });

    it('sets badge color to negative for negative yoyChange', () => {
      component.agency = { agency: { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' }, currentFyTotal: 500000, priorFyTotal: 1000000, yoyChange: -0.5 };
      (component as any).updateBadge();
      expect(component.badgeColor).toBe('negative');
      expect(component.badgeText).toBe('-50.0% YoY');
    });

    it('sets badge to neutral when priorFyTotal is zero', () => {
      component.agency = { agency: { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' }, currentFyTotal: 1000000, priorFyTotal: 0, yoyChange: 0 };
      (component as any).updateBadge();
      expect(component.badgeColor).toBe('neutral');
      expect(component.badgeText).toBe('0.0% YoY');
    });
  });

  describe('availableYears population', () => {
    it('populates availableYears from loaded records', () => {
      const records: SpendingRecord[] = [
        { id: 1, agencyId: 1, fiscalYear: 2020, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 1 },
        { id: 2, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 200000, outlayAmount: 0, awardCount: 2 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 300000, outlayAmount: 0, awardCount: 3 },
      ];
      component.currentRecords = records;
      (component as any).populateAvailableYears();
      expect(component.availableYears).toEqual([2020, 2022, 2024]);
    });

    it('handles empty records', () => {
      component.currentRecords = [];
      (component as any).populateAvailableYears();
      expect(component.availableYears).toEqual([]);
    });
  });
});