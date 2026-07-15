import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, ParamMap, provideRouter, convertToParamMap } from '@angular/router';
import { Subject } from 'rxjs';
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
  let fixture: ComponentFixture<AgencySpotlightComponent>;
  let paramMap$: Subject<ParamMap>;
  let apiService: ApiService;

  const summary: AgencySummary = {
    agency: { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' },
    currentFyTotal: 1000000,
    priorFyTotal: 950000,
    yoyChange: 25,
  };

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
      fiscalYearStart: 2022,
      fiscalYearEnd: 2023,
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
      fiscalYearStart: 2019,
      fiscalYearEnd: 2025,
      expectedLabels: ['2019', '2020', '2024', '2025'],
      expectedDatasetCount: 1,
      expectedAwardTypes: ['Contracts'],
      expectedData: { Contracts: [100000, 200000, 300000, 400000] },
    },
    {
      name: 'aggregates multiple quarters into same fiscal year bucket',
      id: 3,
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 50000, outlayAmount: 0, awardCount: 2 },
        { id: 2, agencyId: 1, fiscalYear: 2022, quarter: 2, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 75000, outlayAmount: 0, awardCount: 3 },
        { id: 3, agencyId: 1, fiscalYear: 2022, quarter: 3, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 25000, outlayAmount: 0, awardCount: 1 },
      ],
      fiscalYearStart: 2022,
      fiscalYearEnd: 2022,
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
      fiscalYearStart: 2022,
      fiscalYearEnd: 2023,
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
      fiscalYearStart: 2021,
      fiscalYearEnd: 2023,
      expectedLabels: ['2021', '2022', '2023'],
      expectedDatasetCount: 2,
      expectedAwardTypes: ['Contracts', 'Grants'],
      expectedData: { Contracts: [10000, 0, 0], Grants: [40000, 20000, 30000] },
    },
  ];

  beforeEach(async () => {
    paramMap$ = new Subject<ParamMap>();
    await TestBed.configureTestingModule({
      imports: [AgencySpotlightComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
      ],
    }).compileComponents();
  });

  function bootstrapWithId(id: number, records: SpendingRecord[] | null) {
    apiService = TestBed.inject(ApiService);
    jest.spyOn(apiService, 'getAgencySpotlight').mockReturnValue(of(records));
    jest.spyOn(apiService, 'getAgencySummary').mockReturnValue(of(summary));

    fixture = TestBed.createComponent(AgencySpotlightComponent);
    paramMap$.next(convertToParamMap({ id: String(id) }));
    fixture.detectChanges();
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(testTable)('$name', ({ id, records, fiscalYearStart, fiscalYearEnd, expectedLabels, expectedDatasetCount, expectedAwardTypes, expectedData }) => {
    bootstrapWithId(id, records);
    const component = fixture.componentInstance;

    expect(component.fiscalYearStart()).toBe(fiscalYearStart);
    expect(component.fiscalYearEnd()).toBe(fiscalYearEnd);
    expect(component.loading()).toBe(false);
    expect(component.chartData().labels).toEqual(expectedLabels);
    expect(component.chartData().datasets.length).toBe(expectedDatasetCount);

    if (expectedAwardTypes.length > 0) {
      const datasetLabels = component.chartData().datasets.map(d => d.label);
      expect(datasetLabels).toEqual(expect.arrayContaining(expectedAwardTypes));
    }

    for (const [awardType, expectedValues] of Object.entries(expectedData)) {
      const dataset = component.chartData().datasets.find(d => d.label === awardType);
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
    fiscalYearStart: number;
    fiscalYearEnd: number;
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
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedInsight: 'In FY2020-2024, NASA spent 60.0% on Contracts.',
    },
    {
      name: 'handles single award type (100%)',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 1000000, outlayAmount: 0, awardCount: 10 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedInsight: 'In FY2020-2024, NASA spent 100.0% on Contracts.',
    },
    {
      name: 'handles empty records',
      records: [],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedInsight: 'No data available for the selected fiscal year.',
    },
    {
      name: 'handles no records for current fiscal year',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 5 },
      ],
      fiscalYearStart: 2024,
      fiscalYearEnd: 2024,
      expectedInsight: 'No data available for the selected fiscal year.',
    },
    {
      name: 'computes percentage with rounding',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 333333, outlayAmount: 0, awardCount: 3 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 333333, outlayAmount: 0, awardCount: 3 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Direct Payments', awardTypeCodes: 'C', obligatedAmount: 333334, outlayAmount: 0, awardCount: 3 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedInsight: 'In FY2020-2024, NASA spent 33.3% on Direct Payments.',
    },
    {
      name: 'breaks ties by keeping first-encountered award type',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 500000, outlayAmount: 0, awardCount: 4 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 500000, outlayAmount: 0, awardCount: 5 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedInsight: 'In FY2020-2024, NASA spent 50.0% on Grants.',
    },
  ];

  describe('computeInsight', () => {
    const agency = summary;
    it.each(insightTestTable)('$name', ({ records, fiscalYearStart, fiscalYearEnd, expectedInsight }) => {
      const insight = AgencySpotlightComponent.computeInsight(agency, records, fiscalYearStart, fiscalYearEnd);
      expect(insight).toBe(expectedInsight);
    });
  });

  interface TableDataTestCase {
    name: string;
    records: SpendingRecord[];
    fiscalYearStart: number;
    fiscalYearEnd: number;
    expectedRowCount: number;
    expectedFirstRow: { awardType: string; obligated: number; percentage: number };
  }

  const tableDataTestTable: TableDataTestCase[] = [
    {
      name: 'builds table rows sorted by obligated desc',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 200000, outlayAmount: 0, awardCount: 3 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 600000, outlayAmount: 0, awardCount: 5 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Direct Payments', awardTypeCodes: 'C', obligatedAmount: 200000, outlayAmount: 0, awardCount: 2 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedRowCount: 3,
      expectedFirstRow: { awardType: 'Contracts', obligated: 600000, percentage: 60.0 },
    },
    {
      name: 'aggregates multiple quarters per award type',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 2 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 2, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 150000, outlayAmount: 0, awardCount: 3 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 3, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 50000, outlayAmount: 0, awardCount: 1 },
      ],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedRowCount: 2,
      expectedFirstRow: { awardType: 'Contracts', obligated: 250000, percentage: 83.3 },
    },
    {
      name: 'filters to current fiscal year only',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 500000, outlayAmount: 0, awardCount: 10 },
        { id: 2, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 100000, outlayAmount: 0, awardCount: 2 },
      ],
      fiscalYearStart: 2024,
      fiscalYearEnd: 2024,
      expectedRowCount: 1,
      expectedFirstRow: { awardType: 'Grants', obligated: 100000, percentage: 100.0 },
    },
    {
      name: 'handles empty records',
      records: [],
      fiscalYearStart: 2020,
      fiscalYearEnd: 2024,
      expectedRowCount: 0,
      expectedFirstRow: { awardType: '', obligated: 0, percentage: 0 },
    },
  ];

  describe('buildTableData', () => {
    it.each(tableDataTestTable)('$name', ({ records, fiscalYearStart, fiscalYearEnd, expectedRowCount, expectedFirstRow }) => {
      const tableData = AgencySpotlightComponent.buildTableData(records, fiscalYearStart, fiscalYearEnd);
      expect(tableData.length).toBe(expectedRowCount);
      if (expectedRowCount > 0) {
        expect(tableData[0].awardType).toBe(expectedFirstRow.awardType);
        expect(tableData[0].obligatedAmount).toBe(expectedFirstRow.obligated);
        expect(Math.abs(tableData[0].percentageOfTotal - expectedFirstRow.percentage)).toBeLessThan(0.1);
      }
    });
  });

  interface BadgeTestCase {
    name: string;
    priorFyTotal: number;
    yoyChange: number;
    expectedColor: string;
    expectedText: string;
  }

  const badgeTestTable: BadgeTestCase[] = [
    {
      name: 'sets badge color to positive for non-negative yoyChange',
      priorFyTotal: 500000,
      yoyChange: 100,
      expectedColor: 'positive',
      expectedText: '+100.0% YoY',
    },
    {
      name: 'sets badge color to negative for negative yoyChange',
      priorFyTotal: 1000000,
      yoyChange: -50,
      expectedColor: 'negative',
      expectedText: '-50.0% YoY',
    },
    {
      name: 'sets badge to neutral when priorFyTotal is zero',
      priorFyTotal: 0,
      yoyChange: 0,
      expectedColor: 'neutral',
      expectedText: '0.0% YoY',
    },
    {
      name: 'renders zero change as positive when current equals prior',
      priorFyTotal: 500000,
      yoyChange: 0,
      expectedColor: 'positive',
      expectedText: '+0.0% YoY',
    },
  ];

  describe('computeBadge', () => {
    it.each(badgeTestTable)('$name', ({ priorFyTotal, yoyChange, expectedColor, expectedText }) => {
      const agency = { agency: { id: 1, name: 'NASA', abbreviation: 'NASA', toptierCode: '080' }, currentFyTotal: 1000000, priorFyTotal, yoyChange };
      const badge = AgencySpotlightComponent.computeBadge(agency);
      expect(badge.color).toBe(expectedColor);
      expect(badge.text).toBe(expectedText);
    });
  });

  interface AvailableYearsTestCase {
    name: string;
    records: SpendingRecord[];
    expectedAvailableYears: number[];
    expectedStart: number;
    expectedEnd: number;
  }

  const availableYearsTestTable: AvailableYearsTestCase[] = [
    {
      name: 'populates availableYears from loaded records',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2020, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 1 },
        { id: 2, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 200000, outlayAmount: 0, awardCount: 2 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 300000, outlayAmount: 0, awardCount: 3 },
      ],
      expectedAvailableYears: [2020, 2022, 2024],
      expectedStart: 2020,
      expectedEnd: 2024,
    },
    {
      name: 'handles empty records',
      records: [],
      expectedAvailableYears: [],
      expectedStart: Infinity,
      expectedEnd: -Infinity,
    },
    {
      name: 'reconciles fiscalYearStart/End into available range',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 1 },
      ],
      expectedAvailableYears: [2024],
      expectedStart: 2024,
      expectedEnd: 2024,
    },
    {
      name: 'clamps fiscalYearStart down to min available year',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 1 },
      ],
      expectedAvailableYears: [2024],
      expectedStart: 2024,
      expectedEnd: 2024,
    },
    {
      name: 'clamps fiscalYearEnd up to max available year',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2020, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 1 },
      ],
      expectedAvailableYears: [2020],
      expectedStart: 2020,
      expectedEnd: 2020,
    },
  ];

  describe('computeAvailableYears', () => {
    it.each(availableYearsTestTable)('$name', ({ records, expectedAvailableYears, expectedStart, expectedEnd }) => {
      const result = AgencySpotlightComponent.computeAvailableYears(records);
      expect(result.years).toEqual(expectedAvailableYears);
      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
    });
  });

  interface RangeAggregationTestCase {
    name: string;
    records: SpendingRecord[];
    rangeStart: number;
    rangeEnd: number;
    expectedSums: { [awardType: string]: number };
    expectedTotal: number;
  }

  const rangeAggregationTestTable: RangeAggregationTestCase[] = [
    {
      name: 'aggregates across fiscal year range',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 5 },
        { id: 2, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 150000, outlayAmount: 0, awardCount: 7 },
        { id: 3, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 200000, outlayAmount: 0, awardCount: 10 },
        { id: 4, agencyId: 1, fiscalYear: 2024, quarter: 2, awardTypeLabel: 'Grants', awardTypeCodes: 'B', obligatedAmount: 50000, outlayAmount: 0, awardCount: 3 },
      ],
      rangeStart: 2022,
      rangeEnd: 2024,
      expectedSums: { Contracts: 450000, Grants: 50000 },
      expectedTotal: 500000,
    },
    {
      name: 'excludes records outside range',
      records: [
        { id: 1, agencyId: 1, fiscalYear: 2021, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 100000, outlayAmount: 0, awardCount: 5 },
        { id: 2, agencyId: 1, fiscalYear: 2022, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 150000, outlayAmount: 0, awardCount: 7 },
        { id: 3, agencyId: 1, fiscalYear: 2023, quarter: 1, awardTypeLabel: 'Contracts', awardTypeCodes: 'A', obligatedAmount: 200000, outlayAmount: 0, awardCount: 10 },
      ],
      rangeStart: 2022,
      rangeEnd: 2023,
      expectedSums: { Contracts: 350000 },
      expectedTotal: 350000,
    },
  ];

  describe('aggregateAwardTypesForRange', () => {
    it.each(rangeAggregationTestTable)('$name', ({ records, rangeStart, rangeEnd, expectedSums, expectedTotal }) => {
      const result = AgencySpotlightComponent.aggregateAwardTypesForRange(records, rangeStart, rangeEnd);
      for (const [awardType, expectedSum] of Object.entries(expectedSums)) {
        expect(result.sumsByType.get(awardType)).toBe(expectedSum);
      }
      expect(result.total).toBe(expectedTotal);
    });
  });
});
