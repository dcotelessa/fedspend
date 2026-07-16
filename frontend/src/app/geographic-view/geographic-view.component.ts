import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { BarChartComponent, ChartDataset } from '../bar-chart/bar-chart.component';
import { ApiService, AgencyWithTotal } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { GeoSpendingSnapshot } from '@shared/interfaces';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-geographic-view',
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatSelectModule, MatButtonToggleModule, MatOptionModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatIconModule,
    BarChartComponent, CurrencyFormatPipe,
  ],
  templateUrl: './geographic-view.component.html',
  styleUrl: './geographic-view.component.scss',
})
export class GeographicViewComponent {
  private readonly apiService = inject(ApiService);

  readonly agencyId = signal<number | null>(null);
  readonly fiscalYear = signal<number>(2024);
  readonly scope = signal<'recipient' | 'performance'>('recipient');
  readonly noData = computed(() => this.primary$().length === 0);
  readonly delta = computed(() =>
    GeographicViewComponent.computeDelta(this.primary$(), this.secondary$()),
  );

  readonly pageIndex = signal(0);
  readonly pageSize = signal(15);
  readonly paginator = { length: 0 } as { length: number };
  readonly displayedColumns = ['state', 'obligatedAmount', 'perCapita', 'vsAvg'];

  private readonly agenciesSource$ = toSignal(this.apiService.getAgencies(), {
    initialValue: [] as AgencyWithTotal[],
  });
  readonly agencyList = computed(() => this.agenciesSource$().filter(a => a.totalCents > 0));

  private readonly yearsSource$ = toSignal(
    this.apiService.getGeographyStates({ scope: 'recipient' }),
    { initialValue: [] as GeoSpendingSnapshot[] },
  );
  readonly fiscalYearList = computed(() =>
    Array.from(new Set(this.yearsSource$().map(d => d.fiscalYear))).sort((a, b) => a - b),
  );

  private readonly oppositeScope = computed(() =>
    this.scope() === 'recipient' ? 'performance' : 'recipient',
  );

  private readonly primaryParams = computed(() => {
    const params: { fiscalYear: number; agencyId?: number; scope: 'recipient' | 'performance' } = {
      fiscalYear: this.fiscalYear(),
      scope: this.scope(),
    };
    if (this.agencyId() !== null) params.agencyId = this.agencyId()!;
    return params;
  });

  private readonly secondaryParams = computed(() => ({
    ...this.primaryParams(),
    scope: this.oppositeScope(),
  }));

  private readonly primary$ = toSignal(
    toObservable(this.primaryParams).pipe(switchMap(p => this.apiService.getGeographyStates(p))),
    { initialValue: [] as GeoSpendingSnapshot[] },
  );

  private readonly secondary$ = toSignal(
    toObservable(this.secondaryParams).pipe(switchMap(p => this.apiService.getGeographyStates(p))),
    { initialValue: [] as GeoSpendingSnapshot[] },
  );

  readonly allStates = computed(() =>
    [...this.primary$()].sort((a, b) => b.obligatedAmount - a.obligatedAmount),
  );

  readonly pagedStates = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.allStates().slice(start, start + this.pageSize());
  });

  readonly top10 = computed(() =>
    this.allStates()
      .slice(0, 10)
      .map(s => ({ stateName: s.stateName, obligatedAmount: s.obligatedAmount })),
  );

  readonly chartLabels = computed(() => this.top10().map(t => t.stateName));

  readonly chartData = computed<ChartDataset[]>(() => {
    const top = this.top10();
    if (top.length === 0) return [];
    return [{ label: 'Obligated Amount (cents)', data: top.map(t => t.obligatedAmount) }];
  });

  readonly vsAvg = computed(() => {
    const sorted = this.allStates();
    if (sorted.length === 0) return [];
    const total = sorted.reduce((sum, s) => sum + s.obligatedAmount, 0);
    const avg = total / sorted.length;
    return sorted.map(s => ((s.obligatedAmount - avg) / avg) * 100);
  });

  constructor() {
    effect(() => {
      const years = this.fiscalYearList();
      if (years.length > 0 && !years.includes(this.fiscalYear())) {
        this.fiscalYear.set(years[years.length - 1]);
      }
    });

    effect(() => {
      this.paginator.length = this.allStates().length;
    });
  }

  onAgencyChange(value: number | null): void {
    this.agencyId.set(value);
  }

  onFiscalYearChange(value: number): void {
    this.fiscalYear.set(value);
  }

  onScopeChange(value: 'recipient' | 'performance'): void {
    this.scope.set(value);
  }

  onPage(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  static computeDelta(primary: GeoSpendingSnapshot[], secondary: GeoSpendingSnapshot[]): number | null {
    if (primary.length === 0 || secondary.length === 0) {
      return null;
    }

    const sorted = [...primary].sort((a, b) => b.obligatedAmount - a.obligatedAmount);
    const topState = sorted[0];

    const recipientData = primary.some(d => d.scope === 'recipient') ? primary : secondary;
    const performanceData = primary.some(d => d.scope === 'performance') ? primary : secondary;

    const recipientMatch = recipientData.find(s => s.stateCode === topState.stateCode);
    const performanceMatch = performanceData.find(s => s.stateCode === topState.stateCode);

    if (!recipientMatch || !performanceMatch) {
      return null;
    }

    return recipientMatch.obligatedAmount - performanceMatch.obligatedAmount;
  }
}
