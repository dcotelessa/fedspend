import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { BarChartComponent, ChartDataset } from '../bar-chart/bar-chart.component';
import { ApiService } from '../api.service';
import { Agency, GeoSpendingSnapshot } from '@shared/interfaces';
import { GeographyQuery } from '@shared/interfaces';

@Component({
  selector: 'app-geographic-view',
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatSelectModule, MatButtonToggleModule, MatOptionModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    BarChartComponent,
  ],
  templateUrl: './geographic-view.component.html',
})
export class GeographicViewComponent {
  agencyId = signal<number | null>(null);
  fiscalYear = signal<number>(2020);
  scope = signal<'recipient' | 'performance'>('recipient');

  top10: Array<{ stateName: string; obligatedAmount: number }> = [];
  allStates: GeoSpendingSnapshot[] = [];
  vsAvg: number[] = [];
  chartLabels: string[] = [];
  chartData: ChartDataset[] = [];

  paginator = { pageSize: 15, length: 0, pageIndex: 0 } as { pageSize: number; length: number; pageIndex: number };

  displayedColumns = ['state', 'obligatedAmount', 'perCapita', 'awardCount', 'vsAvg'];

  agencyIdValue = signal<number | null>(null);
  fiscalYearValue = signal<number>(2020);
  scopeValue = signal<'recipient' | 'performance'>('recipient');

  constructor(private readonly apiService: ApiService) {
    this.loadData();
  }

  get agencyList(): Agency[] {
    return this.agencyId() === null
      ? [{ id: 1, name: 'Department of Agriculture', abbreviation: 'USDA', toptierCode: '01' },
         { id: 2, name: 'Department of Defense', abbreviation: 'DOD', toptierCode: '02' },
         { id: 3, name: 'Department of Education', abbreviation: 'ED', toptierCode: '03' },
         { id: 4, name: 'Department of Health and Human Services', abbreviation: 'HHS', toptierCode: '04' },
         { id: 5, name: 'Department of Homeland Security', abbreviation: 'DHS', toptierCode: '05' },
         { id: 6, name: 'Department of State', abbreviation: 'STATE', toptierCode: '06' },
         { id: 7, name: 'Department of Transportation', abbreviation: 'DOT', toptierCode: '07' }]
      : [];
  }

  get fiscalYearList(): number[] {
    return [2020, 2021, 2022, 2023, 2024];
  }

  filter$ = computed<GeographyQuery>(() => ({
    agencyId: this.agencyId(),
    fiscalYear: this.fiscalYear(),
    scope: this.scope(),
  }));

  loadData(): void {
    const agencyIdVal = this.agencyId();
    const params: { fiscalYear: number; agencyId?: number; scope: string } = {
      fiscalYear: this.fiscalYear(),
      scope: this.scope(),
    };
    if (agencyIdVal !== null) {
      params.agencyId = agencyIdVal;
    }
    this.apiService.getGeographyStates(params).subscribe(data => {
      this.processData(data);
    });
  }

  processData(data: GeoSpendingSnapshot[]): void {
    const sorted = [...data].sort((a, b) => b.obligatedAmount - a.obligatedAmount);

    this.top10 = sorted.slice(0, 10).map(s => ({
      stateName: s.stateName,
      obligatedAmount: s.obligatedAmount,
    }));

    this.allStates = sorted;
    this.paginator.length = sorted.length;

    const total = sorted.reduce((sum, s) => sum + s.obligatedAmount, 0);
    const avg = total / sorted.length;

    this.vsAvg = sorted.map(s => ((s.obligatedAmount - avg) / avg) * 100);

    this.chartLabels = this.top10.map(t => t.stateName);
    this.chartData = [{
      label: 'Obligated Amount (cents)',
      data: this.top10.map(t => t.obligatedAmount),
    }];
  }

  onAgencyChange(value: number | null): void {
    this.agencyId.set(value);
    this.loadData();
  }

  onFiscalYearChange(value: number): void {
    this.fiscalYear.set(value);
    this.loadData();
  }

  onScopeChange(value: 'recipient' | 'performance'): void {
    this.scope.set(value);
    this.loadData();
  }
}
