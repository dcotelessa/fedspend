import { Component, OnInit, signal } from '@angular/core';
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
import { GeoSpendingSnapshot } from '@shared/interfaces';

@Component({
  selector: 'app-geographic-view',
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatSelectModule, MatButtonToggleModule, MatOptionModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatIconModule,
    BarChartComponent,
  ],
  templateUrl: './geographic-view.component.html',
})
export class GeographicViewComponent implements OnInit {
  agencyId = signal<number | null>(null);
  fiscalYear = signal<number>(2024);
  scope = signal<'recipient' | 'performance'>('recipient');

  agencyList: AgencyWithTotal[] = [];
  fiscalYearList: number[] = [];

  top10: Array<{ stateName: string; obligatedAmount: number }> = [];
  allStates: GeoSpendingSnapshot[] = [];
  vsAvg: number[] = [];
  chartLabels: string[] = [];
  chartData: ChartDataset[] = [];
  delta: number | null = null;

  paginator = { pageSize: 15, length: 0, pageIndex: 0 } as { pageSize: number; length: number; pageIndex: number };

  displayedColumns = ['state', 'obligatedAmount', 'perCapita', 'awardCount', 'vsAvg'];

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadAgencies();
    this.loadData();
  }

  loadAgencies(): void {
    this.apiService.getAgencies().subscribe(agencies => {
      this.agencyList = agencies;
    });
  }

  loadData(): void {
    const agencyIdVal = this.agencyId();
    const params: { fiscalYear: number; agencyId?: number; scope: 'recipient' | 'performance' } = {
      fiscalYear: this.fiscalYear(),
      scope: this.scope(),
    };
    if (agencyIdVal !== null) {
      params.agencyId = agencyIdVal;
    }

    const oppositeScope = this.scope() === 'recipient' ? 'performance' : 'recipient';
    const oppParams = { ...params, scope: oppositeScope };

    this.apiService.getGeographyStates(params).subscribe(primary => {
      this.deriveFiscalYearList(primary);
      this.processData(primary);

      this.apiService.getGeographyStates(oppParams).subscribe(secondary => {
        this.computeDelta(primary, secondary);
      });
    });
  }

  deriveFiscalYearList(data: GeoSpendingSnapshot[]): void {
    const years = Array.from(new Set(data.map(d => d.fiscalYear))).sort((a, b) => a - b);
    if (years.length === 0) return;
    this.fiscalYearList = years;
    if (!years.includes(this.fiscalYear())) {
      this.fiscalYear.set(years[years.length - 1]);
    }
  }

  computeDelta(primary: GeoSpendingSnapshot[], secondary: GeoSpendingSnapshot[]): void {
    if (primary.length === 0 || secondary.length === 0) {
      this.delta = null;
      return;
    }

    const sorted = [...primary].sort((a, b) => b.obligatedAmount - a.obligatedAmount);
    const topState = sorted[0];

    const recipientData = primary.some(d => d.scope === 'recipient') ? primary : secondary;
    const performanceData = primary.some(d => d.scope === 'performance') ? primary : secondary;

    const recipientMatch = recipientData.find(s => s.stateCode === topState.stateCode);
    const performanceMatch = performanceData.find(s => s.stateCode === topState.stateCode);

    if (!recipientMatch || !performanceMatch) {
      this.delta = null;
      return;
    }

    this.delta = recipientMatch.obligatedAmount - performanceMatch.obligatedAmount;
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
