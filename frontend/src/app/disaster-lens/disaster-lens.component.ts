import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Subscription } from 'rxjs';
import { ApiService } from '../api.service';
import { CurrencyFormatPipe } from '../currency-format.pipe';
import { DisasterOverview, DisasterFundingRecord, DisasterRecoveryRatio } from '@shared/interfaces';

@Component({
  selector: 'app-disaster-lens',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatSelectModule,
    MatCardModule,
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

  private overviewSub?: Subscription;
  private statesSub?: Subscription;
  private ratiosSub?: Subscription;

  ngOnInit(): void {
    const now = new Date();
    const currentFy = now.getMonth() < 10 ? now.getFullYear() : now.getFullYear() + 1;
    for (let fy = currentFy; fy >= 2018; fy--) {
      this.fiscalYears.push(fy);
    }
    this.fetchOverview();
    this.fetchStates();
  }

  ngOnDestroy(): void {
    this.overviewSub?.unsubscribe();
    this.statesSub?.unsubscribe();
    this.ratiosSub?.unsubscribe();
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.currentTab = this.defGroups[event.index];
    this.tabIndex = event.index;
    this.fetchOverview();
    this.fetchStates();
  }

  onFiscalYearChange(): void {
    this.fetchOverview();
    this.fetchStates();
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
      this.computeCoverageGaps();
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
      this.computeCoverageGaps();
    });
  }

  private computeCoverageGaps(): void {
    this.ratiosSub?.unsubscribe();
    const params: { fiscalYear?: number } = {};
    if (this.selectedFiscalYear) {
      params.fiscalYear = this.selectedFiscalYear;
    }
    this.ratiosSub = this.api.getDisasterRecoveryRatios(params).subscribe((ratios: DisasterRecoveryRatio[]) => {
      this.coverageGapCount = ratios.filter((r) => r.recoveryRatio < 0.5).length;
    });
  }
}
