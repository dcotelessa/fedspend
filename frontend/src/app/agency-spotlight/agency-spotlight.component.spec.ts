import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, convertToParamMap } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { AgencySpotlightComponent } from './agency-spotlight.component';
import { ApiService } from '../api.service';
import { AgencySummary } from '@shared/interfaces';

interface TestCase {
  name: string;
  id: number;
  summary: AgencySummary | null;
  error?: { status: number };
  expectedBadge: 'Green' | 'Red' | 'Neutral' | '';
}

describe('AgencySpotlightComponent', () => {
  let component: AgencySpotlightComponent;
  let fixture: ComponentFixture<AgencySpotlightComponent>;
  let httpMock: HttpClient;
  let apiService: ApiService;

  const testTable: TestCase[] = [
    {
      name: 'positive YoY change displays green badge',
      id: 1,
      summary: {
        agency: { id: 1, name: 'Test Agency', abbreviation: 'TA', toptierCode: '01' },
        currentFyTotal: 10000000,
        priorFyTotal: 8000000,
        yoyChange: 0.25,
      },
      expectedBadge: 'Green',
    },
    {
      name: 'negative YoY change displays red badge',
      id: 2,
      summary: {
        agency: { id: 2, name: 'Failing Agency', abbreviation: 'FA', toptierCode: '02' },
        currentFyTotal: 5000000,
        priorFyTotal: 8000000,
        yoyChange: -0.375,
      },
      expectedBadge: 'Red',
    },
    {
      name: 'zero YoY change displays neutral badge',
      id: 3,
      summary: {
        agency: { id: 3, name: 'Same Agency', abbreviation: 'SA', toptierCode: '03' },
        currentFyTotal: 6000000,
        priorFyTotal: 6000000,
        yoyChange: 0,
      },
      expectedBadge: 'Neutral',
    },
    {
      name: 'missing prior year displays neutral badge',
      id: 4,
      summary: {
        agency: { id: 4, name: 'New Agency', abbreviation: 'NA', toptierCode: '04' },
        currentFyTotal: 1000000,
        priorFyTotal: 0,
        yoyChange: 0,
      },
      expectedBadge: 'Neutral',
    },
    {
      name: 'null summary renders empty state',
      id: 99,
      summary: null,
      expectedBadge: '',
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
    component.routeParam = {
      paramMap: {
        subscribe: jest.fn().mockImplementation((fn: (val: any) => void) => {
          fn(paramMap);
        }),
      },
    } as any;
  }

  function flushService(id: number, summary: AgencySummary | null, error?: { status: number }) {
    jest.spyOn(apiService, 'getAgencySummary')
      .mockReturnValueOnce(error ? Promise.reject(error) : of(summary));
  }

  it.each(testTable)('$name', ({ id, summary, error, expectedBadge }) => {
    setupRoute(id);
    flushService(id, summary, error);

    (component as any).ngOnInit();

    expect(component.agency).toEqual(summary);
    expect(component.badgeColor).toBe(expectedBadge);
    expect(component.loading).toBe(false);
  });
});
