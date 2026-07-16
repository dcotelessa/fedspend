import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../api.service';
import { GeoSpendingSnapshot } from '@shared/interfaces';
import { GeographicViewComponent } from './geographic-view.component';

describe('GeographicViewComponent', () => {
  let apiSpy: {
    getAgencies: jest.Mock;
    getGeographyStates: jest.Mock;
  };

  beforeEach(() => {
    apiSpy = {
      getAgencies: jest.fn().mockReturnValue(of([])),
      getGeographyStates: jest.fn().mockReturnValue(of([])),
    };
    TestBed.configureTestingModule({
      imports: [GeographicViewComponent],
      providers: [{ provide: ApiService, useValue: apiSpy }],
    });
  });

  interface TestCase {
    name: string;
    agencyId: number | null;
    fiscalYear: number;
    scope: 'recipient' | 'performance';
    agenciesResponse: { id: number; name: string; totalCents: number }[];
    primaryData: GeoSpendingSnapshot[];
    secondaryData: GeoSpendingSnapshot[];
    expected: {
      agencyList: { id: number; name: string; totalCents: number }[];
      fiscalYearList: number[];
      defaultFiscalYear: number;
      top10: { stateName: string; obligatedAmount: number }[];
      allStates: number;
      vsAvg: number[];
      delta: number | null;
    };
  }

  const testTable: TestCase[] = [
    {
      name: 'agency list is populated from ApiService.getAgencies on first load, filtered to totalCents > 0',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [
        { id: 1, name: 'Department of Agriculture', totalCents: 5000000000 },
        { id: 2, name: 'Department of Defense', totalCents: 4000000000 },
        { id: 3, name: 'Department of Education', totalCents: 3000000000 },
      ],
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 4000000000, awardCount: 80, population: 20200000, perCapita: 19801 },
        { id: 3, stateCode: '48', stateName: 'Texas', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 3500000000, awardCount: 70, population: 29100000, perCapita: 12027 },
      ],
      secondaryData: [
        { id: 4, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
        { id: 5, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 2500000000, awardCount: 50, population: 20200000, perCapita: 12376 },
        { id: 6, stateCode: '48', stateName: 'Texas', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 2000000000, awardCount: 40, population: 29100000, perCapita: 6873 },
      ],
      expected: {
        agencyList: [
          { id: 1, name: 'Department of Agriculture', totalCents: 5000000000 },
          { id: 2, name: 'Department of Defense', totalCents: 4000000000 },
          { id: 3, name: 'Department of Education', totalCents: 3000000000 },
        ],
        fiscalYearList: [2024],
        defaultFiscalYear: 2024,
        top10: [
          { stateName: 'California', obligatedAmount: 5000000000 },
          { stateName: 'New York', obligatedAmount: 4000000000 },
          { stateName: 'Texas', obligatedAmount: 3500000000 },
        ],
        allStates: 3,
        vsAvg: [20.0, -4.0, -16.0],
        delta: 2000000000,
      },
    },
    {
      name: 'zero-total agencies are excluded from the dropdown',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [
        { id: 1, name: 'Active Agency A', totalCents: 5000000000 },
        { id: 2, name: 'Inactive Agency B', totalCents: 0 },
        { id: 3, name: 'Inactive Agency C', totalCents: 0 },
      ],
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
      ],
      secondaryData: [
        { id: 2, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
      ],
      expected: {
        agencyList: [
          { id: 1, name: 'Active Agency A', totalCents: 5000000000 },
        ],
        fiscalYearList: [2024],
        defaultFiscalYear: 2024,
        top10: [
          { stateName: 'California', obligatedAmount: 5000000000 },
        ],
        allStates: 1,
        vsAvg: [0.0],
        delta: 2000000000,
      },
    },
    {
      name: 'all agencies with zero total are excluded, leaving empty list',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [
        { id: 1, name: 'Agency One', totalCents: 0 },
        { id: 2, name: 'Agency Two', totalCents: 0 },
      ],
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
      ],
      secondaryData: [
        { id: 2, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
      ],
      expected: {
        agencyList: [],
        fiscalYearList: [2024],
        defaultFiscalYear: 2024,
        top10: [
          { stateName: 'California', obligatedAmount: 5000000000 },
        ],
        allStates: 1,
        vsAvg: [0.0],
        delta: 2000000000,
      },
    },
    {
      name: 'fiscal year list is derived from distinct years in loaded snapshots, defaulting to max',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [
        { id: 1, name: 'Agency A', totalCents: 5000000000 },
      ],
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2022, agencyId: null, scope: 'recipient', obligatedAmount: 4500000000, awardCount: 90, population: 39500000, perCapita: 11392 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2023, agencyId: null, scope: 'recipient', obligatedAmount: 3000000000, awardCount: 60, population: 20200000, perCapita: 14851 },
      ],
      secondaryData: [
        { id: 3, stateCode: '06', stateName: 'California', fiscalYear: 2022, agencyId: null, scope: 'performance', obligatedAmount: 3500000000, awardCount: 70, population: 39500000, perCapita: 8860 },
        { id: 4, stateCode: '36', stateName: 'New York', fiscalYear: 2023, agencyId: null, scope: 'performance', obligatedAmount: 2500000000, awardCount: 50, population: 20200000, perCapita: 12376 },
      ],
      expected: {
        agencyList: [
          { id: 1, name: 'Agency A', totalCents: 5000000000 },
        ],
        fiscalYearList: [2022, 2023],
        defaultFiscalYear: 2023,
        top10: [
          { stateName: 'California', obligatedAmount: 4500000000 },
          { stateName: 'New York', obligatedAmount: 3000000000 },
        ],
        allStates: 2,
        vsAvg: [20.0, -20.0],
        delta: 1000000000,
      },
    },
    {
      name: 'delta is positive when recipient exceeds performance for top state',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [
        { id: 1, name: 'Agency A', totalCents: 5000000000 },
      ],
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
      ],
      secondaryData: [
        { id: 2, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
      ],
      expected: {
        agencyList: [
          { id: 1, name: 'Agency A', totalCents: 5000000000 },
        ],
        fiscalYearList: [2024],
        defaultFiscalYear: 2024,
        top10: [{ stateName: 'California', obligatedAmount: 5000000000 }],
        allStates: 1,
        vsAvg: [0.0],
        delta: 2000000000,
      },
    },
    {
      name: 'delta is negative when performance exceeds recipient for top state',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [
        { id: 1, name: 'Agency A', totalCents: 5000000000 },
      ],
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
      ],
      secondaryData: [
        { id: 2, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
      ],
      expected: {
        agencyList: [
          { id: 1, name: 'Agency A', totalCents: 5000000000 },
        ],
        fiscalYearList: [2024],
        defaultFiscalYear: 2024,
        top10: [{ stateName: 'California', obligatedAmount: 3000000000 }],
        allStates: 1,
        vsAvg: [0.0],
        delta: -2000000000,
      },
    },
    {
      name: 'delta is zero when recipient and performance match for top state',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [
        { id: 1, name: 'Agency A', totalCents: 5000000000 },
      ],
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
      ],
      secondaryData: [
        { id: 2, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
      ],
      expected: {
        agencyList: [
          { id: 1, name: 'Agency A', totalCents: 5000000000 },
        ],
        fiscalYearList: [2024],
        defaultFiscalYear: 2024,
        top10: [{ stateName: 'California', obligatedAmount: 3000000000 }],
        allStates: 1,
        vsAvg: [0.0],
        delta: 0,
      },
    },
    {
      name: 'delta is null when top state is missing from secondary data',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [
        { id: 1, name: 'Agency A', totalCents: 5000000000 },
      ],
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
        { id: 2, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 1000000000, awardCount: 20, population: 20200000, perCapita: 4950 },
      ],
      secondaryData: [
        { id: 3, stateCode: '36', stateName: 'New York', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 800000000, awardCount: 15, population: 20200000, perCapita: 3960 },
      ],
      expected: {
        agencyList: [
          { id: 1, name: 'Agency A', totalCents: 5000000000 },
        ],
        fiscalYearList: [2024],
        defaultFiscalYear: 2024,
        top10: [
          { stateName: 'California', obligatedAmount: 5000000000 },
          { stateName: 'New York', obligatedAmount: 1000000000 },
        ],
        allStates: 2,
        vsAvg: [66.7, -66.7],
        delta: null,
      },
    },
    {
      name: 'empty data produces empty lists and null delta',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [],
      primaryData: [],
      secondaryData: [],
      expected: {
        agencyList: [],
        fiscalYearList: [],
        defaultFiscalYear: 2024,
        top10: [],
        allStates: 0,
        vsAvg: [],
        delta: null,
      },
    },
    {
      name: 'single state yields 0% vsAvg',
      agencyId: null,
      fiscalYear: 2024,
      scope: 'recipient',
      agenciesResponse: [
        { id: 1, name: 'Agency A', totalCents: 5000000000 },
      ],
      primaryData: [
        { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
      ],
      secondaryData: [
        { id: 2, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 },
      ],
      expected: {
        agencyList: [
          { id: 1, name: 'Agency A', totalCents: 5000000000 },
        ],
        fiscalYearList: [2024],
        defaultFiscalYear: 2024,
        top10: [{ stateName: 'California', obligatedAmount: 5000000000 }],
        allStates: 1,
        vsAvg: [0.0],
        delta: 2000000000,
      },
    },
  ];

  it.each(testTable)('$name', ({ agencyId, fiscalYear, scope, agenciesResponse, primaryData, secondaryData, expected }) => {
    apiSpy.getAgencies.mockReturnValue(of(agenciesResponse));
    apiSpy.getGeographyStates.mockImplementation((params: { scope?: string }) =>
      of(params.scope === 'performance' ? secondaryData : primaryData),
    );

    const fixture = TestBed.createComponent(GeographicViewComponent);
    const component = fixture.componentInstance;
    component.agencyId.set(agencyId);
    component.fiscalYear.set(fiscalYear);
    component.scope.set(scope);
    fixture.detectChanges();

    expect(component.agencyList()).toEqual(expected.agencyList);
    expect(component.fiscalYearList()).toEqual(expected.fiscalYearList);
    expect(component.fiscalYear()).toEqual(expected.defaultFiscalYear);
    expect(component.top10()).toEqual(expected.top10);
    expect(component.allStates().length).toEqual(expected.allStates);
    for (let i = 0; i < expected.vsAvg.length; i++) {
      expect(Math.abs(component.vsAvg()[i] - expected.vsAvg[i])).toBeLessThan(0.5);
    }
    expect(component.delta()).toEqual(expected.delta);
  });

  it('pageSize signal defaults to 15', () => {
    apiSpy.getAgencies.mockReturnValue(of([]));
    apiSpy.getGeographyStates.mockReturnValue(of([]));

    const fixture = TestBed.createComponent(GeographicViewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.pageSize()).toEqual(15);
  });

  it('paginates states by pageIndex and pageSize', () => {
    apiSpy.getAgencies.mockReturnValue(of([]));
    apiSpy.getGeographyStates.mockReturnValue(
      of(
        Array.from(
          { length: 40 },
          (_, i) =>
            ({
              id: i + 1,
              stateCode: String(i + 1).padStart(2, '0'),
              stateName: `State ${i + 1}`,
              fiscalYear: 2024,
              agencyId: null,
              scope: 'recipient',
              obligatedAmount: (40 - i) * 100000000,
              awardCount: 10,
              population: 1000000,
              perCapita: 1000,
            }) as GeoSpendingSnapshot,
        ),
      ),
    );

    const fixture = TestBed.createComponent(GeographicViewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.allStates().length).toBe(40);
    expect(component.pagedStates().length).toBe(15);
    expect(component.pagedStates()[0].stateName).toBe('State 1');

    component.pageIndex.set(1);
    expect(component.pagedStates().length).toBe(15);
    expect(component.pagedStates()[0].stateName).toBe('State 16');

    component.pageIndex.set(2);
    component.pageSize.set(10);
    expect(component.pagedStates().length).toBe(10);
    expect(component.pagedStates()[0].stateName).toBe('State 21');
  });

  it('does not over-call the API on init (bounded calls, no reactive loop)', () => {
    apiSpy.getAgencies.mockReturnValue(of([
      { id: 1, name: 'Agency A', totalCents: 5000000000 },
    ]));
    apiSpy.getGeographyStates.mockImplementation((params: { scope?: string }) =>
      of(params.scope === 'performance'
        ? [{ id: 4, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'performance', obligatedAmount: 3000000000, awardCount: 60, population: 39500000, perCapita: 7594 }]
        : [
            { id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 5000000000, awardCount: 100, population: 39500000, perCapita: 12658 },
          ]),
    );

    const fixture = TestBed.createComponent(GeographicViewComponent);
    fixture.detectChanges();

    const geoCalls = apiSpy.getGeographyStates.mock.calls.length;
    const agencyCalls = apiSpy.getAgencies.mock.calls.length;
    // years(1) + primary(1-2, +1 if fiscalYear gets corrected into range) + secondary(1-2)
    expect(geoCalls).toBeLessThanOrEqual(6);
    expect(geoCalls).toBeGreaterThanOrEqual(1);
    expect(agencyCalls).toBe(1);
  });
});
