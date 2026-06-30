import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { DisasterLensComponent } from './disaster-lens.component';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import {
  DisasterFundingRecord,
  DisasterOverview,
  DisasterRecoveryRatio,
} from '@shared/interfaces';

describe('DisasterLensComponent', () => {
  let component: DisasterLensComponent;
  let fixture: ComponentFixture<DisasterLensComponent>;
  let apiSpy: {
    getDisasterOverview: jest.Mock;
    getDisasterStates: jest.Mock;
    getDisasterRecoveryRatios: jest.Mock;
  };

  beforeEach(async () => {
    apiSpy = {
      getDisasterOverview: jest.fn(),
      getDisasterStates: jest.fn(),
      getDisasterRecoveryRatios: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        DisasterLensComponent,
        CurrencyFormatPipe,
        HttpClientTestingModule,
      ],
      providers: [{ provide: ApiService, useValue: apiSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(DisasterLensComponent);
    component = fixture.componentInstance;
    component.paginator = { pageIndex: 0, pageSize: 15, length: 0 } as any;
  });

  interface CardTestCase {
    name: string;
    currentTab?: string;
    overview: DisasterOverview[];
    states: DisasterFundingRecord[];
    ratios: DisasterRecoveryRatio[];
    expectedTotalObligated: number;
    expectedStateCount: number;
    expectedGapCount: number;
    expectedHighestPerCapitaState: string;
  }

  const testTable: CardTestCase[] = [
    {
      name: 'computes totals from single overview entry with states',
      overview: [{
        defGroup: 'COVID-19',
        totalObligated: 500000,
        totalAwardCount: 100,
        stateCount: 2,
        highestPerCapitaState: 'CA',
        highestPerCapita: 100000,
        coverageGapCount: 0,
      }],
      states: [
        {
          id: 1, stateCode: 'CA', stateName: 'California',
          obligatedAmount: 300000, awardCount: 50,
          perCapita: 0, population: 0, defGroup: 'COVID-19', defCodes: '',
        },
        {
          id: 2, stateCode: 'NY', stateName: 'New York',
          obligatedAmount: 200000, awardCount: 50,
          perCapita: 0, population: 0, defGroup: 'COVID-19', defCodes: '',
        },
      ],
      ratios: [],
      expectedTotalObligated: 500000,
      expectedStateCount: 2,
      expectedGapCount: 0,
      expectedHighestPerCapitaState: 'CA',
    },
    {
      name: 'returns zero values when no overview data',
      overview: [],
      states: [],
      ratios: [],
      expectedTotalObligated: 0,
      expectedStateCount: 0,
      expectedGapCount: 0,
      expectedHighestPerCapitaState: '',
    },
    {
      name: 'counts coverage gaps from recovery ratios below 0.5',
      overview: [{
        defGroup: 'COVID-19',
        totalObligated: 1000000,
        totalAwardCount: 200,
        stateCount: 3,
        highestPerCapitaState: 'FL',
        highestPerCapita: 500000,
        coverageGapCount: 0,
      }],
      states: [
        {
          id: 3, stateCode: 'FL', stateName: 'Florida',
          obligatedAmount: 500000, awardCount: 100,
          perCapita: 0, population: 0, defGroup: 'Hurricane', defCodes: '',
        },
        {
          id: 4, stateCode: 'GA', stateName: 'Georgia',
          obligatedAmount: 300000, awardCount: 60,
          perCapita: 0, population: 0, defGroup: 'Hurricane', defCodes: '',
        },
        {
          id: 5, stateCode: 'AL', stateName: 'Alabama',
          obligatedAmount: 200000, awardCount: 40,
          perCapita: 0, population: 0, defGroup: 'Hurricane', defCodes: '',
        },
      ],
      ratios: [
        {
          id: 1, stateCode: 'FL', stateName: 'Florida', fiscalYear: 2024,
          femaObligated: 100000, fedSpendingObligated: 500000,
          declarationCount: 3, recoveryRatio: 5.0, dominantIncidentType: 'Hurricane',
        },
        {
          id: 2, stateCode: 'GA', stateName: 'Georgia', fiscalYear: 2024,
          femaObligated: 100000, fedSpendingObligated: 20000,
          declarationCount: 2, recoveryRatio: 0.2, dominantIncidentType: 'Hurricane',
        },
        {
          id: 3, stateCode: 'AL', stateName: 'Alabama', fiscalYear: 2024,
          femaObligated: 50000, fedSpendingObligated: 25000,
          declarationCount: 1, recoveryRatio: 0.5, dominantIncidentType: 'Hurricane',
        },
      ],
      expectedTotalObligated: 1000000,
      expectedStateCount: 3,
      expectedGapCount: 1,
      expectedHighestPerCapitaState: 'FL',
    },
    {
      name: 'handles multiple overview entries using current tab',
      overview: [
        {
          defGroup: 'COVID-19',
          totalObligated: 100000,
          totalAwardCount: 50,
          stateCount: 1,
          highestPerCapitaState: 'TX',
          highestPerCapita: 80000,
          coverageGapCount: 0,
        },
        {
          defGroup: 'Wildfire',
          totalObligated: 200000,
          totalAwardCount: 80,
          stateCount: 2,
          highestPerCapitaState: 'CA',
          highestPerCapita: 150000,
          coverageGapCount: 1,
        },
      ],
      states: [
        {
          id: 6, stateCode: 'TX', stateName: 'Texas',
          obligatedAmount: 100000, awardCount: 50,
          perCapita: 0, population: 0, defGroup: 'COVID-19', defCodes: '',
        },
      ],
      ratios: [],
      expectedTotalObligated: 100000,
      expectedStateCount: 1,
      expectedGapCount: 0,
      expectedHighestPerCapitaState: 'TX',
    },
    {
      name: 'selects overview entry matching non-default tab',
      currentTab: 'Wildfire',
      overview: [
        {
          defGroup: 'COVID-19',
          totalObligated: 100000,
          totalAwardCount: 50,
          stateCount: 1,
          highestPerCapitaState: 'TX',
          highestPerCapita: 80000,
          coverageGapCount: 0,
        },
        {
          defGroup: 'Wildfire',
          totalObligated: 750000,
          totalAwardCount: 30,
          stateCount: 2,
          highestPerCapitaState: 'CA',
          highestPerCapita: 200000,
          coverageGapCount: 1,
        },
      ],
      states: [
        {
          id: 7, stateCode: 'CA', stateName: 'California',
          obligatedAmount: 500000, awardCount: 20,
          perCapita: 200000, population: 0, defGroup: 'Wildfire', defCodes: 'M',
        },
      ],
      ratios: [],
      expectedTotalObligated: 750000,
      expectedStateCount: 1,
      expectedGapCount: 0,
      expectedHighestPerCapitaState: 'CA',
    },
  ];

  it.each(testTable)('$name', async ({
    overview, states, ratios, currentTab,
    expectedTotalObligated, expectedStateCount, expectedGapCount, expectedHighestPerCapitaState,
  }) => {
    apiSpy.getDisasterOverview.mockReturnValue(of(overview));
    apiSpy.getDisasterStates.mockReturnValue(of(states));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of(ratios));

    component.currentTab = currentTab ?? 'COVID-19';
    component.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.totalObligated).toBe(expectedTotalObligated);
    expect(component.stateCount).toBe(expectedStateCount);
    expect(component.coverageGapCount).toBe(expectedGapCount);
    expect(component.highestPerCapitaState).toBe(expectedHighestPerCapitaState);
  });

  interface Top15TestCase {
    name: string;
    states: DisasterFundingRecord[];
    expectedLabels: string[];
    expectedDataset: number[];
  }

  const testTableTop15: Top15TestCase[] = [
    {
      name: 'returns top 15 states by obligatedAmount descending',
      states: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1, stateCode: `ST${String(i + 1).padStart(2, '0')}`, stateName: `State ${String(i + 1)}`,
        obligatedAmount: (20 - i) * 100000, awardCount: 0,
        perCapita: 0, population: 0, defGroup: 'COVID-19', defCodes: '',
      })),
      expectedLabels: Array.from({ length: 15 }, (_, i) => `State ${String(i + 1)}`),
      expectedDataset: Array.from({ length: 15 }, (_, i) => (20 - i) * 100000),
    },
    {
      name: 'returns fewer than 15 when less than 15 states exist',
      states: [
        { id: 1, stateCode: 'CA', stateName: 'California', obligatedAmount: 300000, awardCount: 0, perCapita: 0, population: 0, defGroup: 'COVID-19', defCodes: '' },
        { id: 2, stateCode: 'NY', stateName: 'New York', obligatedAmount: 200000, awardCount: 0, perCapita: 0, population: 0, defGroup: 'COVID-19', defCodes: '' },
        { id: 3, stateCode: 'TX', stateName: 'Texas', obligatedAmount: 150000, awardCount: 0, perCapita: 0, population: 0, defGroup: 'COVID-19', defCodes: '' },
      ],
      expectedLabels: ['California', 'New York', 'Texas'],
      expectedDataset: [300000, 200000, 150000],
    },
    {
      name: 'returns empty arrays when no states data',
      states: [],
      expectedLabels: [],
      expectedDataset: [],
    },
  ];

  it.each(testTableTop15)('$name', async ({
    states, expectedLabels, expectedDataset,
  }) => {
    apiSpy.getDisasterOverview.mockReturnValue(of([]));
    apiSpy.getDisasterStates.mockReturnValue(of(states));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of([]));

    component.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.top15Labels).toEqual(expectedLabels);
    expect(component.top15Datasets).toEqual(expectedDataset);
  });

  interface SortedRatiosTestCase {
    name: string;
    ratios: DisasterRecoveryRatio[];
    expectedOrder: string[];
  }

  const testTableSortedRatios: SortedRatiosTestCase[] = [
    {
      name: 'sorts ratios ascending by recoveryRatio',
      ratios: [
        { id: 1, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 500000, declarationCount: 3, recoveryRatio: 5.0, dominantIncidentType: 'Wildfire' },
        { id: 2, stateCode: 'FL', stateName: 'Florida', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 20000, declarationCount: 2, recoveryRatio: 0.2, dominantIncidentType: 'Hurricane' },
        { id: 3, stateCode: 'NY', stateName: 'New York', fiscalYear: 2024, femaObligated: 50000, fedSpendingObligated: 25000, declarationCount: 1, recoveryRatio: 0.5, dominantIncidentType: 'Hurricane' },
      ],
      expectedOrder: ['Florida', 'New York', 'California'],
    },
    {
      name: 'handles empty ratios array',
      ratios: [],
      expectedOrder: [],
    },
    {
      name: 'handles single ratio',
      ratios: [
        { id: 1, stateCode: 'TX', stateName: 'Texas', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 100000, declarationCount: 1, recoveryRatio: 1.0, dominantIncidentType: 'Infrastructure' },
      ],
      expectedOrder: ['Texas'],
    },
  ];

  it.each(testTableSortedRatios)('$name', async ({ ratios, expectedOrder }) => {
    apiSpy.getDisasterOverview.mockReturnValue(of([]));
    apiSpy.getDisasterStates.mockReturnValue(of([]));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of(ratios));

    component.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.sortedRatios.map((r) => r.stateName)).toEqual(expectedOrder);
  });
});
