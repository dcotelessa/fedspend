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
    defGroup?: string;
    overview: DisasterOverview[];
    states: DisasterFundingRecord[];
    ratios: DisasterRecoveryRatio[];
    expectedTotalObligated: number;
    expectedStateCount: number;
    expectedHighestPerCapitaState: string;
  }

  const testTable: CardTestCase[] = [
    {
      name: 'resolves overview for matching defGroup from server',
      defGroup: 'COVID-19',
      overview: [
        {
          defGroup: 'COVID-19',
          totalObligated: 500000,
          totalAwardCount: 100,
          stateCount: 2,
          highestPerCapitaState: 'CA',
          highestPerCapita: 100000,
          coverageGapCount: 0,
        },
      ],
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
      expectedHighestPerCapitaState: 'CA',
    },
    {
      name: 'returns zero values when no overview row matches defGroup',
      defGroup: 'Wildfire',
      overview: [
        {
          defGroup: 'COVID-19',
          totalObligated: 500000,
          totalAwardCount: 100,
          stateCount: 2,
          highestPerCapitaState: 'CA',
          highestPerCapita: 100000,
          coverageGapCount: 0,
        },
      ],
      states: [],
      ratios: [],
      expectedTotalObligated: 0,
      expectedStateCount: 0,
      expectedHighestPerCapitaState: '',
    },
    {
      name: 'renders overview + states + highest per capita for a populated tab',
      defGroup: 'COVID-19',
      overview: [
        {
          defGroup: 'COVID-19',
          totalObligated: 1000000,
          totalAwardCount: 200,
          stateCount: 3,
          highestPerCapitaState: 'FL',
          highestPerCapita: 500000,
          coverageGapCount: 0,
        },
      ],
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
      expectedHighestPerCapitaState: 'FL',
    },
    {
      name: 'handles empty overview array when defGroup has no server data',
      defGroup: 'General',
      overview: [],
      states: [],
      ratios: [],
      expectedTotalObligated: 0,
      expectedStateCount: 0,
      expectedHighestPerCapitaState: '',
    },
  ];

  it.each(testTable)('$name', async ({
    defGroup, overview, states, ratios,
    expectedTotalObligated, expectedStateCount, expectedHighestPerCapitaState,
  }) => {
    const overviewPayload = defGroup
      ? overview.filter((o) => o.defGroup === defGroup)
      : overview;
    apiSpy.getDisasterOverview.mockReturnValue(of(overviewPayload));
    apiSpy.getDisasterStates.mockReturnValue(of(states));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of(ratios));

    component.currentTab = defGroup ?? 'COVID-19';
    component.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(apiSpy.getDisasterOverview).toHaveBeenCalledWith({ defGroup: component.currentTab });
    expect(apiSpy.getDisasterStates).toHaveBeenCalledWith(expect.objectContaining({ defGroup: component.currentTab }));
    expect(component.totalObligated).toBe(expectedTotalObligated);
    expect(component.stateCount).toBe(expectedStateCount);
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
    expectedState?: { stateName: string; femaObligated: number; fedSpendingObligated: number };
  }

  const testTableSortedRatios: SortedRatiosTestCase[] = [
    {
      name: 'sorts ratios descending by federal DEF spending',
      ratios: [
        { id: 1, stateCode: 'CA', stateName: 'California', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 500000, declarationCount: 3, recoveryRatio: 5.0, dominantIncidentType: 'Wildfire' },
        { id: 2, stateCode: 'FL', stateName: 'Florida', fiscalYear: 2024, femaObligated: 100000, fedSpendingObligated: 20000, declarationCount: 2, recoveryRatio: 0.2, dominantIncidentType: 'Hurricane' },
        { id: 3, stateCode: 'NY', stateName: 'New York', fiscalYear: 2024, femaObligated: 50000, fedSpendingObligated: 25000, declarationCount: 1, recoveryRatio: 0.5, dominantIncidentType: 'Hurricane' },
      ],
      expectedOrder: ['California', 'New York', 'Florida'],
    },
    {
      name: 'collapses same-state rows: FEMA sums, Fed DEF does not double-count',
      ratios: [
        { id: 1, stateCode: 'NY', stateName: 'New York', fiscalYear: 2020, femaObligated: 100000, fedSpendingObligated: -2820000000, declarationCount: 2, recoveryRatio: 0, dominantIncidentType: 'Hurricane' },
        { id: 2, stateCode: 'NY', stateName: 'New York', fiscalYear: 2021, femaObligated: 50000, fedSpendingObligated: -2820000000, declarationCount: 1, recoveryRatio: 0, dominantIncidentType: 'Snowstorm' },
        { id: 3, stateCode: 'CA', stateName: 'California', fiscalYear: 2020, femaObligated: 200000, fedSpendingObligated: 500000, declarationCount: 3, recoveryRatio: 0, dominantIncidentType: 'Wildfire' },
      ],
      expectedOrder: ['California', 'New York'],
      expectedState: { stateName: 'New York', femaObligated: 150000, fedSpendingObligated: -2820000000 },
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

  it.each(testTableSortedRatios)('$name', async ({ ratios, expectedOrder, expectedState }) => {
    apiSpy.getDisasterOverview.mockReturnValue(of([]));
    apiSpy.getDisasterStates.mockReturnValue(of([]));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of(ratios));

    component.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.sortedRatios.map((r) => r.stateName)).toEqual(expectedOrder);

    if (expectedState) {
      const row = component.sortedRatios.find((r) => r.stateName === expectedState.stateName);
      expect(row).toBeTruthy();
      expect(row!.femaObligated).toBe(expectedState.femaObligated);
      expect(row!.fedSpendingObligated).toBe(expectedState.fedSpendingObligated);
    }
  });
});
