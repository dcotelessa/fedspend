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
  });

  interface CardTestCase {
    name: string;
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
          stateCode: 'CA', stateName: 'California',
          obligatedAmount: 300000, awardCount: 50,
          perCapita: 0, population: 0, defGroup: 'COVID-19', defCodes: '',
        },
        {
          stateCode: 'NY', stateName: 'New York',
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
          stateCode: 'FL', stateName: 'Florida',
          obligatedAmount: 500000, awardCount: 100,
          perCapita: 0, population: 0, defGroup: 'Hurricane', defCodes: '',
        },
        {
          stateCode: 'GA', stateName: 'Georgia',
          obligatedAmount: 300000, awardCount: 60,
          perCapita: 0, population: 0, defGroup: 'Hurricane', defCodes: '',
        },
        {
          stateCode: 'AL', stateName: 'Alabama',
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
          stateCode: 'TX', stateName: 'Texas',
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
  ];

  it.each(testTable)('$name', async ({
    overview, states, ratios,
    expectedTotalObligated, expectedStateCount, expectedGapCount, expectedHighestPerCapitaState,
  }) => {
    apiSpy.getDisasterOverview.mockReturnValue(of(overview));
    apiSpy.getDisasterStates.mockReturnValue(of(states));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of(ratios));

    component.currentTab = 'COVID-19';
    component.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.totalObligated).toBe(expectedTotalObligated);
    expect(component.stateCount).toBe(expectedStateCount);
    expect(component.coverageGapCount).toBe(expectedGapCount);
    expect(component.highestPerCapitaState).toBe(expectedHighestPerCapitaState);
  });
});
