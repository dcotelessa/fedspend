import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AgencyListComponent } from './agency-list.component';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { AgencyWithTotal } from '../api.service';

describe('AgencyListComponent', () => {
  let component: AgencyListComponent;
  let fixture: ComponentFixture<AgencyListComponent>;
  let apiService: ApiService;

  const testTable: Array<{
    name: string;
    agencies: AgencyWithTotal[];
    expectedCount: number;
    expectedFirstHref: string;
    expectedMutedCount: number;
    expectedFormattedValue: string;
  }> = [
    {
      name: 'loads and renders agencies with totals',
      agencies: [
        { id: 1, name: 'NASA', totalCents: 500000 },
        { id: 2, name: 'NASA', totalCents: 300000 },
      ],
      expectedCount: 2,
      expectedFirstHref: '/agencies/1',
      expectedMutedCount: 0,
      expectedFormattedValue: '$5,000.00',
    },
    {
      name: 'shows muted text for zero total',
      agencies: [
        { id: 1, name: 'NASA', totalCents: 0 },
      ],
      expectedCount: 1,
      expectedFirstHref: '/agencies/1',
      expectedMutedCount: 1,
      expectedFormattedValue: '$0.00',
    },
    {
      name: 'handles empty list',
      agencies: [],
      expectedCount: 0,
      expectedFirstHref: '',
      expectedMutedCount: 0,
      expectedFormattedValue: '$0.00',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgencyListComponent],
      providers: [
        ApiService,
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgencyListComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(testTable)('$name', ({ agencies, expectedCount, expectedFirstHref, expectedMutedCount, expectedFormattedValue }) => {
    jest.spyOn(apiService, 'getAgencies').mockReturnValueOnce(of(agencies));
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.agencies).toEqual(agencies);
    expect(component.agencies.length).toBe(expectedCount);

    if (expectedCount > 0) {
      const linkEl = fixture.nativeElement.querySelector('a');
      expect(linkEl).toBeTruthy();
      expect(linkEl.getAttribute('href')).toBe(expectedFirstHref);

      const pipe = new CurrencyFormatPipe();
      expect(pipe.transform(agencies[0].totalCents)).toBe(expectedFormattedValue);
    }

    const mutedEls = fixture.nativeElement.querySelectorAll('.muted');
    expect(mutedEls.length).toBe(expectedMutedCount);
  });
});
