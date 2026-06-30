import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { DashboardComponent } from './dashboard.component';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';

describe('DashboardComponent', () => {
  let routerSpy: { navigate: jest.Mock };
  let apiSpy: {
    getAgencies: jest.Mock;
    getDisasterRecoveryRatios: jest.Mock;
    getLastSync: jest.Mock;
  };

  beforeEach(() => {
    routerSpy = { navigate: jest.fn() };
    apiSpy = {
      getAgencies: jest.fn().mockReturnValue(of([])),
      getDisasterRecoveryRatios: jest.fn().mockReturnValue(of([])),
      getLastSync: jest.fn().mockReturnValue(of(null)),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent, CurrencyFormatPipe],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ApiService, useValue: apiSpy },
        provideCharts(withDefaultRegisterables()),
      ],
    });
  });

  interface CardTestCase {
    name: string;
    agencies: Array<{ id: number; name: string; totalCents: number }>;
    ratios: Array<{ stateCode: string; recoveryRatio: number }>;
    expectedTotal: number;
    expectedLargest: { name: string; totalCents: number } | null;
    expectedGapCount: number;
  }

  const testTable: CardTestCase[] = [
    {
      name: 'computes total obligated across all agencies',
      agencies: [
        { id: 1, name: 'Agency A', totalCents: 100000 },
        { id: 2, name: 'Agency B', totalCents: 200000 },
        { id: 3, name: 'Agency C', totalCents: 300000 },
      ],
      ratios: [],
      expectedTotal: 600000,
      expectedLargest: { name: 'Agency C', totalCents: 300000 },
      expectedGapCount: 0,
    },
    {
      name: 'identifies largest agency by highest totalCents',
      agencies: [
        { id: 1, name: 'Small', totalCents: 50000 },
        { id: 2, name: 'Medium', totalCents: 150000 },
        { id: 3, name: 'Large', totalCents: 500000 },
      ],
      ratios: [],
      expectedTotal: 700000,
      expectedLargest: { name: 'Large', totalCents: 500000 },
      expectedGapCount: 0,
    },
    {
      name: 'counts distinct states with coverage gap ratio below 0.5',
      agencies: [],
      ratios: [
        { stateCode: '06', recoveryRatio: 0.3 },
        { stateCode: '12', recoveryRatio: 0.8 },
        { stateCode: '48', recoveryRatio: 0.2 },
        { stateCode: '06', recoveryRatio: 0.4 },
        { stateCode: '36', recoveryRatio: 1.5 },
      ],
      expectedTotal: 0,
      expectedLargest: null,
      expectedGapCount: 2,
    },
    {
      name: 'handles empty agencies and ratios gracefully',
      agencies: [],
      ratios: [],
      expectedTotal: 0,
      expectedLargest: null,
      expectedGapCount: 0,
    },
  ];

  it.each(testTable)('$name', ({ agencies, ratios, expectedTotal, expectedLargest, expectedGapCount }) => {
    apiSpy.getAgencies.mockReturnValue(of(agencies));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of(ratios));

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.totalObligated).toBe(expectedTotal);
    expect(component.largestAgency).toEqual(expectedLargest);
    expect(component.coverageGapCount).toBe(expectedGapCount);
  });

  it('navigates to agency detail on chart bar click', () => {
    apiSpy.getAgencies.mockReturnValue(of([
      { id: 1, name: 'Agency A', totalCents: 100000 },
      { id: 2, name: 'Agency B', totalCents: 200000 },
    ]));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of([]));

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onChartClick({ active: [{ datasetIndex: 1, index: 0 }] });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/agencies', 2]);
  });

  it('does nothing on chart click with no active bar', () => {
    apiSpy.getAgencies.mockReturnValue(of([]));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of([]));

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onChartClick({ active: [] });
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('fetches agencies, ratios, and last sync on init', () => {
    apiSpy.getAgencies.mockReturnValue(of([]));
    apiSpy.getDisasterRecoveryRatios.mockReturnValue(of([]));
    apiSpy.getLastSync.mockReturnValue(of('2024-01-15T10:00:00Z'));

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(apiSpy.getAgencies).toHaveBeenCalled();
    expect(apiSpy.getDisasterRecoveryRatios).toHaveBeenCalled();
    expect(apiSpy.getLastSync).toHaveBeenCalled();
    expect(component.lastSync).toBe('2024-01-15T10:00:00Z');
  });
});
