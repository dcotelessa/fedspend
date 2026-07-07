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
    expectedFormattedValue: string;
  }> = [
    {
      name: 'renders agencies with positive totals',
      agencies: [
        { id: 1, name: 'NASA', totalCents: 500000 },
        { id: 2, name: 'HHS', totalCents: 300000 },
      ],
      expectedCount: 2,
      expectedFirstHref: '/agencies/1',
      expectedFormattedValue: '$5,000.00',
    },
    {
      name: 'filters out zero-total agencies',
      agencies: [
        { id: 1, name: 'Zero Agency', totalCents: 0 },
        { id: 2, name: 'NASA', totalCents: 500000 },
      ],
      expectedCount: 1,
      expectedFirstHref: '/agencies/2',
      expectedFormattedValue: '$5,000.00',
    },
    {
      name: 'handles empty list',
      agencies: [],
      expectedCount: 0,
      expectedFirstHref: '',
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

  it.each(testTable)('$name', ({ agencies, expectedCount, expectedFirstHref, expectedFormattedValue }) => {
    jest.spyOn(apiService, 'getAgencies').mockReturnValueOnce(of(agencies));
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.agencies.length).toBe(expectedCount);

    if (expectedCount > 0) {
      const linkEl = fixture.nativeElement.querySelector('a');
      expect(linkEl).toBeTruthy();
      expect(linkEl.getAttribute('href')).toBe(expectedFirstHref);

      const pipe = new CurrencyFormatPipe();
      expect(pipe.transform(component.agencies[0].totalCents)).toBe(expectedFormattedValue);
    }
  });
});
