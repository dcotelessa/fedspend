import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { of } from 'rxjs';

import { GeographicViewComponent } from './geographic-view.component';
import { ApiService } from '../api.service';
import { GeoSpendingSnapshot } from '@shared/interfaces';

describe('GeographicViewComponent', () => {
  let component: GeographicViewComponent;
  let apiService: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        GeographicViewComponent,
        MatSelectModule,
        MatButtonToggleModule,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    apiService = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);

    const testBedRef = TestBed.createComponent(GeographicViewComponent);
    component = testBedRef.componentInstance;

    const req1 = httpMock.expectOne(/geography\/states/);
    req1.flush([]);
    const req2 = httpMock.expectOne(/geography\/states/);
    req2.flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  interface TestCase {
    name: string;
    agencyId: number | null;
    fiscalYear: number;
    scope: 'recipient' | 'performance';
    primaryData: GeoSpendingSnapshot[];
    secondaryData: GeoSpendingSnapshot[];
    expected: {
      top10: { stateName: string; obligatedAmount: number }[];
      allStates: number;
      vsAvg: number[];
      delta: number | null;
    };
  }

  const testTable: TestCase[] = [
    {
      name: 'delta is recipient minus performance for top state',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 4000000000, awardCount: 80, population: 20200000, perCapita: 19801 },
        { id: 3, stateCode: '48', stateName: 'Texas', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 3500000000, awardCount: 70, population: 29100000, perCapita: 12027 },
      ],
      secondaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 2500000000, awardCount: 50, population: 20200000, perCapita: 12376 },
        { id: 3, stateCode: '48', stateName: 'Texas', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 2000000000, awardCount: 40, population: 29100000, perCapita: 6873 },
      ],
      expected: {
        top10: [
          { stateName: 'California', obligatedAmount: 5000000000 },
          { stateName: 'New York', obligatedAmount: 4000000000 },
          { stateName: 'Texas', obligatedAmount: 3500000000 },
        ],
        allStates: 3,
        vsAvg: [
          20.0,
          -4.0,
          -16.0,
        ],
        delta: 2000000000,
      },
    },
    {
      name: 'delta is negative when performance exceeds recipient for top state',
      agencyId: null,
      fiscalYear: 2023,
      scope: 'performance',
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2023, agencyId: null, scope: 'performance', obligatedAmount: 4500000000, awardCount: 90, population: 39500000, perCapita: 11392 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2023, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 20200000, perCapita: 14851 },
      ],
      secondaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2023, agencyId: null, scope: 'recipient', obligatedAmount: 3500000000, awardCount: 70, population: 39500000, perCapita: 8860 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2023, agencyId: null, scope: 'recipient', obligatedAmount: 2000000000, awardCount: 40, population: 20200000, perCapita: 9900 },
      ],
      expected: {
        top10: [
          { stateName: 'California', obligatedAmount: 4500000000 },
          { stateName: 'New York', obligatedAmount: 3000000000 },
        ],
        allStates: 2,
        vsAvg: [
          20.0,
          -20.0,
        ],
        delta: 1000000000,
      },
    },
    {
      name: 'delta is null when secondary scope returns empty data',
      agencyId: null,
      fiscalYear: 2022,
      scope: 'recipient',
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2022, agencyId: null, scope: 'recipient', obligatedAmount: 4500000000, awardCount: 90, population: 39500000, perCapita: 11392 },
      ],
      secondaryData: [],
      expected: {
        top10: [
          { stateName: 'California', obligatedAmount: 4500000000 },
        ],
        allStates: 1,
        vsAvg: [
          0.0,
        ],
        delta: null,
      },
    },
    {
      name: 'delta is null when primary scope returns empty data',
      agencyId: 5,
      fiscalYear: 2021,
      scope: 'recipient',
      primaryData: [],
      secondaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2021, agencyId: 5, scope: 'performance', obligatedAmount: 1000000000, awardCount: 20, population: 39500000, perCapita: 2531 },
      ],
      expected: {
        top10: [],
        allStates: 0,
        vsAvg: [],
        delta: null,
      },
    },
    {
      name: 'delta is null when top state not found in secondary scope',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 4000000000, awardCount: 80, population: 20200000, perCapita: 19801 },
      ],
      secondaryData: [
        { id: 1, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 2500000000, awardCount: 50, population: 20200000, perCapita: 12376 },
      ],
      expected: {
        top10: [
          { stateName: 'California', obligatedAmount: 5000000000 },
          { stateName: 'New York', obligatedAmount: 4000000000 },
        ],
        allStates: 2,
        vsAvg: [
          11.11111111111111,
          -11.11111111111111,
        ],
        delta: null,
      },
    },
    {
      name: 'top10 sorts by obligatedAmount descending even when input is unordered',
      agencyId: null,
      fiscalYear: 2022,
      scope: 'recipient',
      primaryData: [
        { id: 1, stateCode: '48', stateName: 'Texas', fiscalYear: 2022, agencyId: null, scope: 'recipient', obligatedAmount: 2500000000, awardCount: 50, population: 29100000, perCapita: 8591 },
        { id: 2, stateCode: '06', stateName: 'California', fiscalYear: 2022, agencyId: null, scope: 'recipient', obligatedAmount: 4500000000, awardCount: 90, population: 39500000, perCapita: 11392 },
        { id: 3, stateCode: '36', stateName: 'New York', fiscalYear: 2022, agencyId: null, scope: 'recipient', obligatedAmount: 1500000000, awardCount: 30, population: 20200000, perCapita: 7425 },
      ],
      secondaryData: [
        { id: 1, stateCode: '48', stateName: 'Texas', fiscalYear: 2022, agencyId: null, scope: 'performance', obligatedAmount: 1500000000, awardCount: 30, population: 29100000, perCapita: 5154 },
        { id: 2, stateCode: '06', stateName: 'California', fiscalYear: 2022, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
        { id: 3, stateCode: '36', stateName: 'New York', fiscalYear: 2022, agencyId: null, scope: 'performance', obligatedAmount: 1000000000, awardCount: 20, population: 20200000, perCapita: 4950 },
      ],
      expected: {
        top10: [
          { stateName: 'California', obligatedAmount: 4500000000 },
          { stateName: 'Texas', obligatedAmount: 2500000000 },
          { stateName: 'New York', obligatedAmount: 1500000000 },
        ],
        allStates: 3,
        vsAvg: [
          58.82352941176471,
          -11.764705882352942,
          -47.05882352941176,
        ],
        delta: 1500000000,
      },
    },
  ];

  it.each(testTable)('$name', ({ agencyId, fiscalYear, scope, primaryData, secondaryData, expected }) => {
    jest.spyOn(apiService, 'getGeographyStates')
      .mockReturnValueOnce(of(primaryData))
      .mockReturnValueOnce(of(secondaryData));

    component.agencyId.set(agencyId);
    component.fiscalYear.set(fiscalYear);
    component.scope.set(scope);

    component.loadData();

    expect(component.top10.length).toEqual(expected.top10.length);
    for (let i = 0; i < expected.top10.length; i++) {
      expect(component.top10[i].stateName).toEqual(expected.top10[i].stateName);
      expect(component.top10[i].obligatedAmount).toEqual(expected.top10[i].obligatedAmount);
    }

    expect(component.allStates.length).toEqual(expected.allStates);
    for (let i = 0; i < expected.vsAvg.length; i++) {
      expect(Math.abs(component.vsAvg[i] - expected.vsAvg[i])).toBeLessThan(0.5);
    }

    expect(component.delta).toEqual(expected.delta);

    jest.restoreAllMocks();
  });

  it('paginator defaults to 15 items per page', () => {
    expect(component.paginator.pageSize).toEqual(15);
  });
});
