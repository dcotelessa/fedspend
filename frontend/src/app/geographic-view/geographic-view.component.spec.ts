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

    const req = httpMock.expectOne(/geography\/states/);
    req.flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  interface TestCase {
    name: string;
    agencyId: number | null;
    fiscalYear: number;
    scope: 'recipient' | 'performance';
    mockData: GeoSpendingSnapshot[];
    expected: {
      top10: { stateName: string; obligatedAmount: number }[];
      allStates: number;
      vsAvg: number[];
    };
  }

  const testTable: TestCase[] = [
    {
      name: 'top10 slices top 10 states by obligatedAmount descending',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      mockData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 4000000000, awardCount: 80, population: 20200000, perCapita: 19801 },
        { id: 3, stateCode: '48', stateName: 'Texas', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 3500000000, awardCount: 70, population: 29100000, perCapita: 12027 },
        { id: 4, stateCode: '12', stateName: 'Florida', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 3000000000, awardCount: 60, population: 21500000, perCapita: 13953 },
        { id: 5, stateCode: '17', stateName: 'Illinois', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 2500000000, awardCount: 50, population: 12800000, perCapita: 19531 },
        { id: 6, stateCode: '39', stateName: 'Ohio', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 2000000000, awardCount: 40, population: 11800000, perCapita: 16949 },
        { id: 7, stateCode: '13', stateName: 'Georgia', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 1500000000, awardCount: 30, population: 10700000, perCapita: 14018 },
        { id: 8, stateCode: '53', stateName: 'Washington', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 1000000000, awardCount: 20, population: 7700000, perCapita: 12987 },
        { id: 9, stateCode: '25', stateName: 'Massachusetts', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 900000000, awardCount: 18, population: 7000000, perCapita: 12857 },
        { id: 10, stateCode: '24', stateName: 'Maryland', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 800000000, awardCount: 16, population: 6200000, perCapita: 12903 },
        { id: 11, stateCode: '09', stateName: 'Connecticut', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 700000000, awardCount: 14, population: 3600000, perCapita: 19444 },
        { id: 12, stateCode: '10', stateName: 'Delaware', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 500000000, awardCount: 10, population: 1000000, perCapita: 50000 },
      ],
      expected: {
        top10: [
          { stateName: 'California', obligatedAmount: 5000000000 },
          { stateName: 'New York', obligatedAmount: 4000000000 },
          { stateName: 'Texas', obligatedAmount: 3500000000 },
          { stateName: 'Florida', obligatedAmount: 3000000000 },
          { stateName: 'Illinois', obligatedAmount: 2500000000 },
          { stateName: 'Ohio', obligatedAmount: 2000000000 },
          { stateName: 'Georgia', obligatedAmount: 1500000000 },
          { stateName: 'Washington', obligatedAmount: 1000000000 },
          { stateName: 'Massachusetts', obligatedAmount: 900000000 },
          { stateName: 'Maryland', obligatedAmount: 800000000 },
        ],
        allStates: 12,
        vsAvg: [
          136.11111111111111,
          88.88888888888889,
          65.38461538461539,
          41.666666666666664,
          18.181818181818183,
          -5.555555555555555,
          -29.032258064516122,
          -52.63157894736842,
          -57.534246575342466,
          -62.16216216216216,
          -66.82692307692308,
          -76.34408602150538,
        ],
      },
    },
    {
      name: 'top10 handles fewer than 10 states',
      agencyId: 1,
      fiscalYear: 2023,
      scope: 'performance',
      mockData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2023, agencyId: 1, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2023, agencyId: 1, scope: 'performance', obligatedAmount: 2000000000, awardCount: 40, population: 20200000, perCapita: 9900 },
        { id: 3, stateCode: '48', stateName: 'Texas', fiscalYear: 2023, agencyId: 1, scope: 'performance', obligatedAmount: 1000000000, awardCount: 20, population: 29100000, perCapita: 3436 },
      ],
      expected: {
        top10: [
          { stateName: 'California', obligatedAmount: 3000000000 },
          { stateName: 'New York', obligatedAmount: 2000000000 },
          { stateName: 'Texas', obligatedAmount: 1000000000 },
        ],
        allStates: 3,
        vsAvg: [
          50.0,
          0.0,
          -50.0,
        ],
      },
    },
    {
      name: 'top10 sorts by obligatedAmount descending even when input is unordered',
      agencyId: null,
      fiscalYear: 2022,
      scope: 'recipient',
      mockData: [
        { id: 1, stateCode: '48', stateName: 'Texas', fiscalYear: 2022, agencyId: null, scope: 'recipient', obligatedAmount: 2500000000, awardCount: 50, population: 29100000, perCapita: 8591 },
        { id: 2, stateCode: '06', stateName: 'California', fiscalYear: 2022, agencyId: null, scope: 'recipient', obligatedAmount: 4500000000, awardCount: 90, population: 39500000, perCapita: 11392 },
        { id: 3, stateCode: '36', stateName: 'New York', fiscalYear: 2022, agencyId: null, scope: 'recipient', obligatedAmount: 1500000000, awardCount: 30, population: 20200000, perCapita: 7425 },
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
      },
    },
    {
      name: 'empty data produces empty top10 and empty vsAvg',
      agencyId: 5,
      fiscalYear: 2021,
      scope: 'recipient',
      mockData: [],
      expected: {
        top10: [],
        allStates: 0,
        vsAvg: [],
      },
    },
    {
      name: 'allStates count matches input length',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      mockData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 4000000000, awardCount: 80, population: 20200000, perCapita: 19801 },
        { id: 3, stateCode: '48', stateName: 'Texas', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 3500000000, awardCount: 70, population: 29100000, perCapita: 12027 },
        { id: 4, stateCode: '12', stateName: 'Florida', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 3000000000, awardCount: 60, population: 21500000, perCapita: 13953 },
      ],
      expected: {
        top10: [
          { stateName: 'California', obligatedAmount: 5000000000 },
          { stateName: 'New York', obligatedAmount: 4000000000 },
          { stateName: 'Texas', obligatedAmount: 3500000000 },
          { stateName: 'Florida', obligatedAmount: 3000000000 },
        ],
        allStates: 4,
        vsAvg: [
          29.032258064516122,
          3.225806451612906,
          -9.67741935483871,
          -22.580645161290324,
        ],
      },
    },
  ];

  it.each(testTable)('$name', ({ agencyId, fiscalYear, scope, mockData, expected }) => {
    const spy = jest.spyOn(apiService, 'getGeographyStates').mockReturnValue(of(mockData));

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

    spy.mockRestore();
  });

  it('paginator defaults to 15 items per page', () => {
    expect(component.paginator.pageSize).toEqual(15);
  });
});
