import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { BarChartComponent, ChartDataset } from '../bar-chart/bar-chart.component';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { DisasterOverview, DisasterFundingRecord, DisasterRecoveryRatio } from '@shared/interfaces';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-disaster-lens',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatSelectModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    BarChartComponent,
    CurrencyFormatPipe,
  ],
  templateUrl: './disaster-lens.component.html',
  styleUrl: './disaster-lens.component.scss',
})
export class DisasterLensComponent {
  private readonly api = inject(ApiService);

  readonly currentTab = signal('COVID-19');
  readonly tabIndex = signal(0);
  readonly selectedFiscalYear = signal<number | null>(null);

  readonly defGroups = ['COVID-19', 'Infrastructure'];
  readonly fiscalYears = (() => {
    const now = new Date();
    const currentFy = now.getMonth() < 9 ? now.getFullYear() : now.getFullYear() + 1;
    const years: number[] = [];
    for (let fy = currentFy; fy >= 2018; fy--) years.push(fy);
    return years;
  })();
  readonly displayedColumns: string[] = ['state', 'declarations', 'fema', 'fedDef', 'dominantIncident'];

  readonly pageIndex = signal(0);
  readonly pageSize = signal(15);

  private readonly overview$ = toSignal(
    toObservable(this.currentTab).pipe(
      switchMap(tab => this.api.getDisasterOverview({ defGroup: tab })),
    ),
    { initialValue: [] as DisasterOverview[] },
  );

  private readonly statesParams = computed(() => {
    const params: { defGroup: string; fiscalYear?: number } = { defGroup: this.currentTab() };
    if (this.selectedFiscalYear() !== null) params.fiscalYear = this.selectedFiscalYear()!;
    return params;
  });

  private readonly states$ = toSignal(
    toObservable(this.statesParams).pipe(switchMap(p => this.api.getDisasterStates(p))),
    { initialValue: [] as DisasterFundingRecord[] },
  );

  private readonly ratiosParams = computed(() => {
    const params: { fiscalYear?: number } = {};
    if (this.selectedFiscalYear() !== null) params.fiscalYear = this.selectedFiscalYear()!;
    return params;
  });

  private readonly ratios$ = toSignal(
    toObservable(this.ratiosParams).pipe(switchMap(p => this.api.getDisasterRecoveryRatios(p))),
    { initialValue: [] as DisasterRecoveryRatio[] },
  );

  readonly totalObligated = computed(() => {
    const current = this.overview$()[0];
    return current ? current.totalObligated : 0;
  });

  readonly highestPerCapitaState = computed(() => {
    const current = this.overview$()[0];
    return current ? current.highestPerCapitaState : '';
  });

  readonly stateCount = computed(() => this.states$().length);

  private readonly top15 = computed(() => DisasterLensComponent.pickTop15(this.states$()));
  readonly top15Labels = computed(() => this.top15().map(s => s.stateName));
  readonly top15Datasets = computed(() => this.top15().map(s => s.obligatedAmount));

  readonly top15ChartDatasets = computed<ChartDataset[]>(() => [
    { label: 'Obligated Amount', data: this.top15Datasets() },
  ]);

  readonly sortedRatios = computed(() =>
    DisasterLensComponent.aggregateByState(this.ratios$()).sort(
      (a, b) => b.fedSpendingObligated - a.fedSpendingObligated,
    ),
  );

  readonly pagedRatios = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedRatios().slice(start, start + this.pageSize());
  });

  onTabChange(event: MatTabChangeEvent): void {
    this.currentTab.set(this.defGroups[event.index]);
    this.tabIndex.set(event.index);
  }

  onFiscalYearChange(value: number | null): void {
    this.selectedFiscalYear.set(value);
  }

  onPage(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  static pickTop15(states: DisasterFundingRecord[]): DisasterFundingRecord[] {
    return [...states]
      .sort((a, b) => b.obligatedAmount - a.obligatedAmount)
      .slice(0, 15);
  }

  static aggregateByState(ratios: DisasterRecoveryRatio[]): DisasterRecoveryRatio[] {
    const byState = new Map<string, DisasterRecoveryRatio>();
    for (const r of ratios) {
      const existing = byState.get(r.stateCode);
      if (existing) {
        existing.femaObligated += r.femaObligated;
        existing.declarationCount += r.declarationCount;
      } else {
        byState.set(r.stateCode, { ...r });
      }
    }
    return [...byState.values()];
  }
}
