import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';

interface TestCase {
  name: string;
  methodName: keyof ApiService;
  args: unknown[];
  expectedUrl: string;
  mockBody: unknown;
  flushError?: { status: number; statusText: string };
  expected: unknown;
}

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const testTable: TestCase[] = [
    {
      name: 'getAgencies fetches wrapped response and returns data',
      methodName: 'getAgencies',
      args: [],
      expectedUrl: 'http://localhost:3000/agencies',
      mockBody: { data: [{ id: 1, name: 'Test Agency', totalCents: 100000 }], meta: { total: 1, page: 1, pageSize: 10 } },
      expected: [{ id: 1, name: 'Test Agency', totalCents: 100000 }],
    },
    {
      name: 'getAgencies falls back to empty array on server error',
      methodName: 'getAgencies',
      args: [],
      expectedUrl: 'http://localhost:3000/agencies',
      mockBody: {},
      flushError: { status: 500, statusText: 'Internal Server Error' },
      expected: [],
    },
    {
      name: 'getAgencySpotlight fetches raw array by agency id',
      methodName: 'getAgencySpotlight',
      args: [1],
      expectedUrl: 'http://localhost:3000/agencies/1/spotlight',
      mockBody: [{ id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'A', obligatedAmount: 50000, outlayAmount: 45000, awardCount: 3 }],
      expected: [{ id: 1, agencyId: 1, fiscalYear: 2024, quarter: 1, awardTypeLabel: 'Grant', awardTypeCodes: 'A', obligatedAmount: 50000, outlayAmount: 45000, awardCount: 3 }],
    },
    {
      name: 'getAgencySummary fetches raw AgencySummary by agency id',
      methodName: 'getAgencySummary',
      args: [1],
      expectedUrl: 'http://localhost:3000/agencies/1/summary',
      mockBody: { agency: { id: 1, name: 'Test Agency', abbreviation: 'TA', toptierCode: '01' }, currentFyTotal: 100000, priorFyTotal: 80000, yoyChange: 0.25 },
      expected: { agency: { id: 1, name: 'Test Agency', abbreviation: 'TA', toptierCode: '01' }, currentFyTotal: 100000, priorFyTotal: 80000, yoyChange: 0.25 },
    },
    {
      name: 'getAgencySummary falls back to null on server error',
      methodName: 'getAgencySummary',
      args: [1],
      expectedUrl: 'http://localhost:3000/agencies/1/summary',
      mockBody: {},
      flushError: { status: 404, statusText: 'Not Found' },
      expected: null,
    },
    {
      name: 'getGeographyStates fetches raw array with params',
      methodName: 'getGeographyStates',
      args: [{ fiscalYear: 2024, agencyId: 1 }],
      expectedUrl: 'http://localhost:3000/geography/states?fiscalYear=2024&agencyId=1',
      mockBody: [{ id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: 1, scope: 'recipient', obligatedAmount: 500000, awardCount: 10, population: 1000, perCapita: 500 }],
      expected: [{ id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: 1, scope: 'recipient', obligatedAmount: 500000, awardCount: 10, population: 1000, perCapita: 500 }],
    },
    {
      name: 'getGeographyStates omits undefined params from the query string',
      methodName: 'getGeographyStates',
      args: [{ fiscalYear: 2024 }],
      expectedUrl: 'http://localhost:3000/geography/states?fiscalYear=2024',
      mockBody: [],
      expected: [],
    },
    {
      name: 'getGeographyState fetches raw array by state code',
      methodName: 'getGeographyState',
      args: ['06'],
      expectedUrl: 'http://localhost:3000/geography/state/06',
      mockBody: [{ id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 500000, awardCount: 10, population: 1000, perCapita: 500 }],
      expected: [{ id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, agencyId: null, scope: 'recipient', obligatedAmount: 500000, awardCount: 10, population: 1000, perCapita: 500 }],
    },
    {
      name: 'getDisasterOverview fetches raw array',
      methodName: 'getDisasterOverview',
      args: [],
      expectedUrl: 'http://localhost:3000/disaster/overview',
      mockBody: [{ defGroup: '091', totalObligated: 100000, totalAwardCount: 50, stateCount: 5, highestPerCapitaState: '06', highestPerCapita: 500, coverageGapCount: 2 }],
      expected: [{ defGroup: '091', totalObligated: 100000, totalAwardCount: 50, stateCount: 5, highestPerCapitaState: '06', highestPerCapita: 500, coverageGapCount: 2 }],
    },
    {
      name: 'getDisasterStates fetches raw array with params',
      methodName: 'getDisasterStates',
      args: [{ defGroup: '091', fiscalYear: 2024 }],
      expectedUrl: 'http://localhost:3000/disaster/states?defGroup=091&fiscalYear=2024',
      mockBody: [{ id: 1, defGroup: '091', defCodes: 'D01', stateCode: '06', stateName: 'California', obligatedAmount: 100000, awardCount: 10, perCapita: 100, population: 1000 }],
      expected: [{ id: 1, defGroup: '091', defCodes: 'D01', stateCode: '06', stateName: 'California', obligatedAmount: 100000, awardCount: 10, perCapita: 100, population: 1000 }],
    },
    {
      name: 'getDisasterRecoveryRatios fetches raw array with params',
      methodName: 'getDisasterRecoveryRatios',
      args: [{ fiscalYear: 2024 }],
      expectedUrl: 'http://localhost:3000/disaster/recovery-ratios?fiscalYear=2024',
      mockBody: [{ id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, femaObligated: 10000, fedSpendingObligated: 25000, declarationCount: 3, recoveryRatio: 2.5, dominantIncidentType: 'Wildfire' }],
      expected: [{ id: 1, stateCode: '06', stateName: 'California', fiscalYear: 2024, femaObligated: 10000, fedSpendingObligated: 25000, declarationCount: 3, recoveryRatio: 2.5, dominantIncidentType: 'Wildfire' }],
    },
    {
      name: 'getDisasterState fetches raw state profile by state code',
      methodName: 'getDisasterState',
      args: ['06'],
      expectedUrl: 'http://localhost:3000/disaster/state/06',
      mockBody: { stateCode: '06', stateName: 'California', totalObligated: 100000, totalAwardCount: 50, ratios: [{ recoveryRatio: 2.5, femaObligated: 10000, fedSpendingObligated: 25000, declarationCount: 3 }], declarationCount: 3 },
      expected: { stateCode: '06', stateName: 'California', totalObligated: 100000, totalAwardCount: 50, ratios: [{ recoveryRatio: 2.5, femaObligated: 10000, fedSpendingObligated: 25000, declarationCount: 3 }], declarationCount: 3 },
    },
  ];

  it.each(testTable)('$name', ({ methodName, args, expectedUrl, mockBody, flushError, expected }) => {
    const spy = jest.fn();
    (service as any)[methodName](...args).subscribe(spy);

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    if (flushError) {
      req.flush(mockBody, flushError);
    } else {
      req.flush(mockBody);
    }

    expect(spy).toHaveBeenCalledWith(expected);
  });
});
