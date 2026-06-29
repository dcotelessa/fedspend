import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, convertToParamMap } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { AgencySpotlightComponent } from './agency-spotlight.component';
import { ApiService } from '../api.service';
import { AWARD_COLORS } from '../award-colors';
import { SpendingRecord } from '@shared/interfaces';

interface TestCase {
  name: string;
  id: number;
  records: SpendingRecord[];
  fiscalYearStart: number;
  fiscalYearEnd: number;
  expectedLabels: string[];
  expectedDatasetCount: number;
  expectedAwardTypes: string[];
}

describe('AgencySpotlightComponent', () => {
  let component: AgencySpotlightComponent;
  let fixture: ComponentFixture<AgencySpotlightComponent>;
  let httpMock: HttpClient;
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
    httpMock = TestBed.inject(HttpClient);
    apiService = TestBed.inject(ApiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function setupRoute(id: number) {
    const paramMap = convertToParamMap({ id: String(id) });
    (component as any).routeParam = {
      paramMap: {
        subscribe: jest.fn().mockImplementation((fn: (val: any) => void) => {
          fn(paramMap);
        }),
      },
    } as any;
  }

  function flushService(id: number, records: SpendingRecord[] | null) {
    jest.spyOn(apiService, 'getAgencySpotlight')
      .mockReturnValueOnce(of(records));
  }

  it.each(testTable)('$name', ({ id, records, fiscalYearStart, fiscalYearEnd, expectedLabels, expectedDatasetCount, expectedAwardTypes }) => {
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
  });

  describe('AWARD_COLORS', () => {
    const awardTypes = ['Contracts', 'Grants', 'Direct Payments', 'Loans', 'IDVs'];

    it.each(awardTypes)('has a color for $awardType', (awardType: string) => {
      expect(AWARD_COLORS[awardType]).toBeDefined();
      expect(typeof AWARD_COLORS[awardType]).toBe('string');
      expect(AWARD_COLORS[awardType].length).toBeGreaterThan(0);
    });
  });
});
