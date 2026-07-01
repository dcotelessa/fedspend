import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { BarChartComponent } from '../bar-chart/bar-chart.component';
import { Subscription } from 'rxjs';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { DisasterOverview, DisasterFundingRecord, DisasterRecoveryRatio } from '@shared/interfaces';
import { getRatioColor, RatioColor } from '../ratio-color';

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
    MatTooltipModule,
    MatSortModule,
    BarChartComponent,
    CurrencyFormatPipe,
  ],
  templateUrl: './disaster-lens.component.html',
})
export class DisasterLensComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);

  currentTab = 'COVID-19';
  tabIndex = 0;
  selectedFiscalYear: number | null = null;

  defGroups = ['COVID-19', 'Hurricane', 'Wildfire', 'Infrastructure', 'General'];
  fiscalYears: number[] = [];

  totalObligated = 0;
  stateCount = 0;
  coverageGapCount = 0;
  highestPerCapitaState = '';

  top15Labels: string[] = [];
  top15Datasets: number[] = [];

  sortedRatios: DisasterRecoveryRatio[] = [];
  displayedColumns: string[] = ['state', 'declarations', 'fema', 'fedDef', 'ratio', 'dominantIncident'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private overviewSub?: Subscription;
  private statesSub?: Subscription;
  private ratiosSub?: Subscription;

  ngOnInit(): void {
    this.buildFiscalYearOptions();
    this.refresh();
  }

  ngOnDestroy(): void {
    this.overviewSub?.unsubscribe();
    this.statesSub?.unsubscribe();
    this.ratiosSub?.unsubscribe();
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.currentTab = this.defGroups[event.index];
    this.tabIndex = event.index;
    this.refresh();
  }

  onFiscalYearChange(): void {
    this.refresh();
  }

  private refresh(): void {
    this.fetchOverview();
    this.fetchStates();
    this.fetchRatios();
  }

  private buildFiscalYearOptions(): void {
    const now = new Date();
    const currentFy = now.getMonth() < 9 ? now.getFullYear() : now.getFullYear() + 1;
    for (let fy = currentFy; fy >= 2018; fy--) {
      this.fiscalYears.push(fy);
    }
  }

  private fetchOverview(): void {
    this.overviewSub?.unsubscribe();
    this.overviewSub = this.api.getDisasterOverview().subscribe((overviews: DisasterOverview[]) => {
      const current = overviews.find((o) => o.defGroup === this.currentTab);
      if (current) {
        this.totalObligated = current.totalObligated;
        this.highestPerCapitaState = current.highestPerCapitaState;
      } else {
        this.totalObligated = 0;
        this.highestPerCapitaState = '';
      }
    });
  }

  private fetchStates(): void {
    this.statesSub?.unsubscribe();
    const params: { defGroup?: string; fiscalYear?: number } = { defGroup: this.currentTab };
    if (this.selectedFiscalYear) {
      params.fiscalYear = this.selectedFiscalYear;
    }
    this.statesSub = this.api.getDisasterStates(params).subscribe((states: DisasterFundingRecord[]) => {
      this.stateCount = states.length;
      this.assignTop15(states);
    });
  }

  private assignTop15(states: DisasterFundingRecord[]): void {
    const top = [...states]
      .sort((a, b) => b.obligatedAmount - a.obligatedAmount)
      .slice(0, 15);
    this.top15Labels = top.map((s) => s.stateName);
    this.top15Datasets = top.map((s) => s.obligatedAmount);
  }

  private fetchRatios(): void {
    this.ratiosSub?.unsubscribe();
    const params: { fiscalYear?: number } = {};
    if (this.selectedFiscalYear) {
      params.fiscalYear = this.selectedFiscalYear;
    }
    this.ratiosSub = this.api.getDisasterRecoveryRatios(params).subscribe((ratios: DisasterRecoveryRatio[]) => {
      this.coverageGapCount = ratios.filter((r) => r.recoveryRatio < 0.5).length;
      this.sortedRatios = [...ratios].sort((a, b) => a.recoveryRatio - b.recoveryRatio);
    });
  }

  getChipClass(ratio: number): RatioColor {
    return getRatioColor(ratio);
  }

  get pagedRatios(): DisasterRecoveryRatio[] {
    if (!this.paginator) return [];
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    return this.sortedRatios.slice(start, start + this.paginator.pageSize);
  }
}
